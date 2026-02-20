#!/usr/bin/env node

/**
 * Issue Processor — 자동 Issue 처리 오케스트레이터
 *
 * 열린 Issue를 스캔하여 라벨/상태 기반으로 분류하고,
 * 각 에이전트(Quality Review, Maintenance, Staleness)가
 * 댓글·라벨·닫기 등 GitHub API 액션을 수행한다.
 *
 * 핵심 원칙: 직접 wiki 파일 수정 불가. GitHub API(댓글·라벨·닫기)로만 간접 작업.
 * 기존 issue-handler.yml 워크플로우를 자동으로 연쇄 트리거한다.
 *
 * 트리거: 매일 19:00 KST (issue-processor.yml)
 */

import { resolve } from 'path';
import { writeFile } from 'fs/promises';
import { callOpenAI, parseJsonResponse, findDocument, updateFrontmatterStatus } from '../lib/utils.js';
import { addIssueComment, saveReport } from '../lib/report-generator.js';
import { fetchIssueComments, getGitHubInfoFromEnv } from '../lib/issue-context.js';
import { runRuleBasedChecks } from '../lib/quality-gate.js';
import { loadAllDocuments } from '../lib/document-scanner.js';
import { addAIHistoryEntry } from '../lib/ai-history.js';
import {
  MAX_ACTIONS_PER_RUN,
  STALENESS_THRESHOLD_DAYS,
  QUALITY_AUTO_PUBLISH_THRESHOLD,
  ISSUE_PROCESSOR_ENABLED_AGENTS,
} from './config.js';

const IS_DRY_RUN = process.env.DRY_RUN === 'true';
const WIKI_DIR = resolve(process.cwd(), 'wiki');

// 전역 액션 카운터
let actionCount = 0;

/** 전역 액션 한도 확인 */
function canAct() {
  return actionCount < MAX_ACTIONS_PER_RUN;
}

/** 액션 카운터 증가 */
function recordAction() {
  actionCount++;
  console.log(`   📊 액션 카운트: ${actionCount}/${MAX_ACTIONS_PER_RUN}`);
}

/* ═══════════════════════════════════════════
   GitHub API 헬퍼
   ═══════════════════════════════════════════ */

/**
 * GitHub API로 열린 Issue 전체 조회 (PR 제외, 페이지네이션)
 * @returns {Promise<Array>} Issue 배열
 */
async function fetchAllOpenIssues() {
  const { owner, repo, token } = getGitHubInfoFromEnv();
  if (!owner || !repo || !token) {
    console.log('⚠️ GitHub 정보 없음 — Issue 조회 건너뜀');
    return [];
  }

  const issues = [];
  let page = 1;

  while (true) {
    const url = `https://api.github.com/repos/${owner}/${repo}/issues?state=open&per_page=100&page=${page}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!res.ok) {
      console.error(`❌ Issue 조회 실패: HTTP ${res.status}`);
      break;
    }

    const batch = await res.json();
    if (batch.length === 0) break;

    // PR 제외 (pull_request 필드가 있으면 PR)
    const filtered = batch.filter(i => !i.pull_request);
    issues.push(...filtered);
    page++;
  }

  console.log(`📋 열린 Issue ${issues.length}개 조회됨`);
  return issues;
}

/**
 * 최근 봇 댓글 중복 방지 체크
 * @param {number} issueNumber - Issue 번호
 * @param {string} marker - 마커 문자열 (예: '[issue-processor:quality-review]')
 * @param {number} withinHours - 시간 이내 체크 (기본 24)
 * @returns {Promise<boolean>} 최근 마커 댓글이 있으면 true
 */
async function hasRecentBotComment(issueNumber, marker, withinHours = 24) {
  const { owner, repo, token } = getGitHubInfoFromEnv();
  const comments = await fetchIssueComments(owner, repo, issueNumber, token);

  const cutoff = new Date(Date.now() - withinHours * 60 * 60 * 1000);

  return comments.some(c => {
    if (!c.body.includes(marker)) return false;
    const createdAt = new Date(c.created_at);
    return createdAt > cutoff;
  });
}

/**
 * GitHub API로 Issue에 라벨 추가
 * @param {number} issueNumber
 * @param {string[]} labels
 */
async function addGitHubLabels(issueNumber, labels) {
  const { owner, repo, token } = getGitHubInfoFromEnv();
  if (!owner || !repo || !token) return;

  if (IS_DRY_RUN) {
    console.log(`[DRY RUN] Issue #${issueNumber}에 라벨 추가: ${labels.join(', ')}`);
    return;
  }

  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/labels`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/vnd.github.v3+json',
        },
        body: JSON.stringify({ labels }),
      }
    );

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    console.log(`🏷️ Issue #${issueNumber}에 라벨 추가: ${labels.join(', ')}`);
  } catch (error) {
    console.error(`❌ 라벨 추가 실패: Issue #${issueNumber} — ${error.message}`);
  }
}

/**
 * GitHub API로 Issue에서 라벨 제거
 * @param {number} issueNumber
 * @param {string} label
 */
async function removeGitHubLabel(issueNumber, label) {
  const { owner, repo, token } = getGitHubInfoFromEnv();
  if (!owner || !repo || !token) return;

  if (IS_DRY_RUN) {
    console.log(`[DRY RUN] Issue #${issueNumber}에서 라벨 제거: ${label}`);
    return;
  }

  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/labels/${encodeURIComponent(label)}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (res.status === 404) return; // 이미 없는 라벨
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    console.log(`🏷️ Issue #${issueNumber}에서 라벨 제거: ${label}`);
  } catch (error) {
    console.error(`❌ 라벨 제거 실패: Issue #${issueNumber} — ${error.message}`);
  }
}

/**
 * GitHub API로 Issue 닫기
 * @param {number} issueNumber
 */
async function closeGitHubIssue(issueNumber) {
  const { owner, repo, token } = getGitHubInfoFromEnv();
  if (!owner || !repo || !token) return;

  if (IS_DRY_RUN) {
    console.log(`[DRY RUN] Issue #${issueNumber} 닫기`);
    return;
  }

  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/vnd.github.v3+json',
        },
        body: JSON.stringify({ state: 'closed' }),
      }
    );

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    console.log(`🔒 Issue #${issueNumber} 닫기 완료`);
  } catch (error) {
    console.error(`❌ Issue 닫기 실패: #${issueNumber} — ${error.message}`);
  }
}

/**
 * 댓글 추가 (DRY_RUN 지원 래퍼)
 */
async function safeAddComment(issueNumber, body) {
  if (IS_DRY_RUN) {
    console.log(`[DRY RUN] Issue #${issueNumber}에 댓글 추가:`);
    console.log(body.slice(0, 300) + (body.length > 300 ? '...' : ''));
    return true;
  }
  return addIssueComment(issueNumber, body);
}

/* ═══════════════════════════════════════════
   Triage Agent
   ═══════════════════════════════════════════ */

/**
 * 열린 Issue를 라벨 기반으로 분류
 * @param {Array} issues - GitHub Issue 배열
 * @returns {Map<string, Array>} 카테고리별 Issue 맵
 */
function triageAgent(issues) {
  console.log('\n🔍 === Triage Agent ===');

  const categories = new Map();
  categories.set('draft_review', []);
  categories.set('maintenance', []);
  categories.set('update_request', []);
  categories.set('pending_request', []);
  categories.set('stale', []);

  const now = new Date();

  for (const issue of issues) {
    const labels = (issue.labels || []).map(l => l.name);
    const updatedAt = new Date(issue.updated_at);
    const daysSinceUpdate = Math.floor((now - updatedAt) / (1000 * 60 * 60 * 24));

    // draft + ai-generated → Quality Review 대상
    if (labels.includes('draft') && labels.includes('ai-generated')) {
      categories.get('draft_review').push({ ...issue, daysSinceUpdate });
      continue;
    }

    // wiki-maintenance → Maintenance Agent 대상
    if (labels.includes('wiki-maintenance')) {
      // wiki-maintenance는 28일 기준 stale
      if (daysSinceUpdate >= 28) {
        categories.get('stale').push({ ...issue, daysSinceUpdate, stalenessSource: 'maintenance' });
      } else {
        categories.get('maintenance').push({ ...issue, daysSinceUpdate });
      }
      continue;
    }

    // update-request → 기존 워크플로우 대기 (스킵)
    if (labels.includes('update-request')) {
      categories.get('update_request').push({ ...issue, daysSinceUpdate });
      continue;
    }

    // request 라벨만 있고 draft 없음 → 처리 대기 중 (스킵)
    if (labels.includes('request') && !labels.includes('draft')) {
      categories.get('pending_request').push({ ...issue, daysSinceUpdate });
      continue;
    }

    // 그 외: 일반 미활동 체크
    if (daysSinceUpdate >= STALENESS_THRESHOLD_DAYS) {
      categories.get('stale').push({ ...issue, daysSinceUpdate, stalenessSource: 'general' });
    }
  }

  // 분류 결과 출력
  for (const [cat, items] of categories) {
    if (items.length > 0) {
      console.log(`   ${cat}: ${items.length}개`);
      for (const item of items) {
        console.log(`      #${item.number} — ${item.title} (${item.daysSinceUpdate}일 전 업데이트)`);
      }
    }
  }

  return categories;
}

/* ═══════════════════════════════════════════
   Quality Review Agent
   ═══════════════════════════════════════════ */

/**
 * draft 문서의 품질을 평가하고 발행 또는 피드백 댓글 수행
 * @param {Array} items - draft_review 카테고리 Issue들
 * @param {Array} allDocuments - 전체 Wiki 문서 목록
 * @returns {Promise<Array>} 수행한 액션 목록
 */
async function qualityReviewAgent(items, allDocuments) {
  console.log('\n📝 === Quality Review Agent ===');
  const actions = [];

  for (const issue of items) {
    if (!canAct()) {
      console.log('⚠️ 액션 한도 도달 — Quality Review 중단');
      break;
    }

    const marker = '[issue-processor:quality-review]';

    // 중복 방지: 24시간 이내 마커 댓글 체크
    const hasRecent = await hasRecentBotComment(issue.number, marker, 24);
    if (hasRecent) {
      console.log(`   ⏭️ #${issue.number} — 최근 리뷰 댓글 있음, 건너뜀`);
      continue;
    }

    console.log(`   🔍 #${issue.number} — ${issue.title} 품질 검토 중...`);

    // 문서 찾기
    const context = {
      issueNumber: issue.number,
      issueTitle: issue.title,
      issueBody: issue.body || '',
      documentInfo: null,
    };

    // 이전 댓글에서 문서 경로 정보 추출
    const { owner, repo, token } = getGitHubInfoFromEnv();
    const comments = await fetchIssueComments(owner, repo, issue.number, token);
    for (const c of comments) {
      const locationMatch = c.body.match(/문서 위치[^\`]*\`([^`]+)\`/);
      const slugMatch = c.body.match(/\/wiki\/([^)"\s]+)/);
      if (locationMatch || slugMatch) {
        context.documentInfo = {
          path: locationMatch ? locationMatch[1] : null,
          slug: slugMatch ? slugMatch[1] : null,
        };
        break;
      }
    }

    const doc = await findDocument(context, WIKI_DIR);
    if (!doc.found || !doc.content) {
      console.log(`   ⚠️ #${issue.number} — 문서를 찾을 수 없음, 자동 닫기 처리`);

      const orphanMarker = '[issue-processor:orphan-draft]';
      const hasOrphanComment = await hasRecentBotComment(issue.number, orphanMarker, 24);
      if (hasOrphanComment) {
        console.log(`   ⏭️ #${issue.number} — 이미 고아 draft 처리됨, 건너뜀`);
        continue;
      }

      if (!canAct()) break;

      const commentBody = [
        `## 🤖 고아 Draft 감지`,
        '',
        `이 Issue에 연결된 draft 문서를 찾을 수 없습니다.`,
        `문서가 삭제되었거나 생성에 실패한 것으로 판단됩니다.`,
        '',
        `필요하다면 Issue를 다시 열고 \`request\` 라벨을 추가하여 문서를 재생성해주세요.`,
        '',
        `<!-- ${orphanMarker} -->`,
      ].join('\n');

      await safeAddComment(issue.number, commentBody);
      await closeGitHubIssue(issue.number);
      recordAction();

      actions.push({
        type: 'orphan_draft_close',
        issueNumber: issue.number,
        title: issue.title,
      });
      continue;
    }

    // 규칙 기반 체크
    const ruleChecks = runRuleBasedChecks(doc.content);
    const hasError = ruleChecks.some(c => !c.passed && c.severity === 'error');

    // AI 리뷰
    let aiScore = 0;
    let aiFeedback = '';
    try {
      const aiResponse = await callOpenAI([
        {
          role: 'system',
          content: `당신은 기술 문서 품질 검토관입니다. 문서를 평가하고 JSON으로 응답하세요.
{
  "score": 0-100,
  "summary": "전반적인 평가 요약",
  "issues": ["심각한 문제 목록"],
  "suggestions": ["개선 제안 목록"]
}`
        },
        {
          role: 'user',
          content: `다음 문서를 평가하세요.\n\n제목: ${issue.title}\n\n${doc.content.slice(0, 6000)}`
        },
      ], { temperature: 0.1, maxTokens: 2000, responseFormat: 'json_object' });

      const parsed = parseJsonResponse(aiResponse, { fallback: null });
      if (parsed) {
        aiScore = parsed.score || 0;
        const issues = (parsed.issues || []).map(i => `- ${i}`).join('\n');
        const suggestions = (parsed.suggestions || []).map(s => `- ${s}`).join('\n');
        aiFeedback = `**AI 평가 요약**: ${parsed.summary || ''}\n\n`;
        if (issues) aiFeedback += `**문제점**:\n${issues}\n\n`;
        if (suggestions) aiFeedback += `**개선 제안**:\n${suggestions}\n\n`;
      }
    } catch (error) {
      console.warn(`   ⚠️ AI 리뷰 실패: ${error.message}`);
      aiScore = 50;
      aiFeedback = '⚠️ AI 리뷰를 수행할 수 없었습니다.\n\n';
    }

    // 점수 산출
    const rulePenalty = ruleChecks.filter(c => !c.passed).reduce((sum, c) => {
      return sum + (c.severity === 'error' ? 20 : c.severity === 'warning' ? 10 : 5);
    }, 0);
    const ruleScore = Math.max(0, 100 - rulePenalty);
    const finalScore = Math.round((ruleScore + aiScore) / 2);

    console.log(`   📊 점수: ${finalScore} (규칙: ${ruleScore}, AI: ${aiScore})`);

    // 점수 >= 임계값 + 심각한 문제 없음 → 자동 발행
    // GITHUB_TOKEN으로 Issue 닫으면 issue-handler의 publish 워크플로우가
    // 트리거되지 않으므로 (GitHub 보안 정책), 여기서 직접 발행 처리한다.
    if (finalScore >= QUALITY_AUTO_PUBLISH_THRESHOLD && !hasError) {
      // 1. 문서 status를 published로 직접 변경
      if (!IS_DRY_RUN) {
        const newContent = updateFrontmatterStatus(doc.content, 'published');
        if (newContent !== doc.content) {
          await writeFile(doc.filepath, newContent);
          console.log(`   📤 문서 발행 완료: ${doc.filepath} (draft → published)`);
        }
      } else {
        console.log(`[DRY RUN] 문서 발행: ${doc.filepath} (draft → published)`);
      }

      // 2. 댓글 + 닫기 + 라벨 변경
      const commentBody = [
        `## 🤖 자동 품질 검토 결과`,
        '',
        `**품질 점수**: ${finalScore}/100 ✅`,
        '',
        aiFeedback,
        `품질 기준을 충족하여 자동 발행합니다.`,
        '',
        `<!-- ${marker} -->`,
      ].join('\n');

      await safeAddComment(issue.number, commentBody);
      await closeGitHubIssue(issue.number);
      await removeGitHubLabel(issue.number, 'draft');
      await addGitHubLabels(issue.number, ['published']);
      recordAction();

      actions.push({
        type: 'auto_publish',
        issueNumber: issue.number,
        title: issue.title,
        score: finalScore,
        filepath: doc.filepath,
      });

      await addAIHistoryEntry({
        actionType: 'quality_score',
        issueNumber: issue.number,
        issueTitle: issue.title,
        documentSlug: doc.slug || '',
        documentTitle: issue.title,
        summary: `자동 품질 검토 통과 (${finalScore}점) → 자동 발행`,
        trigger: 'issue_processor',
      }).catch(() => {});
    } else {
      // 피드백 댓글 (사람이 확인 후 진행)
      const failedRules = ruleChecks.filter(c => !c.passed).map(c => `- **[${c.severity}]** ${c.detail}`).join('\n');

      const commentBody = [
        `## 🤖 자동 품질 검토 결과`,
        '',
        `**품질 점수**: ${finalScore}/100 ❌`,
        '',
        aiFeedback,
        failedRules ? `**규칙 체크 실패 항목**:\n${failedRules}\n` : '',
        `품질 기준 미달입니다. 위 피드백을 참고하여 개선해주세요.`,
        `(maintainer가 직접 댓글로 피드백을 추가하면 문서가 자동 수정됩니다)`,
        '',
        `<!-- ${marker} -->`,
      ].join('\n');

      await safeAddComment(issue.number, commentBody);
      recordAction();

      actions.push({
        type: 'feedback',
        issueNumber: issue.number,
        title: issue.title,
        score: finalScore,
      });
    }
  }

  return actions;
}

/* ═══════════════════════════════════════════
   Maintenance Agent
   ═══════════════════════════════════════════ */

/**
 * wiki-maintenance Issue를 분석하고 해결/제안/논의 댓글 수행
 * @param {Array} items - maintenance 카테고리 Issue들
 * @param {Array} allDocuments - 전체 Wiki 문서 목록
 * @returns {Promise<Array>} 수행한 액션 목록
 */
async function maintenanceAgent(items, allDocuments) {
  console.log('\n🔧 === Maintenance Agent ===');
  const actions = [];

  // 문서 요약 정보 (AI 프롬프트용)
  const docSummaries = allDocuments.map(d => ({
    path: d.path,
    title: d.title,
    status: d.status,
    wordCount: d.wordCount,
  }));

  for (const issue of items) {
    if (!canAct()) {
      console.log('⚠️ 액션 한도 도달 — Maintenance 중단');
      break;
    }

    const marker = '[issue-processor:maintenance]';

    // 중복 방지: 48시간 이내 마커 댓글 체크
    const hasRecent = await hasRecentBotComment(issue.number, marker, 48);
    if (hasRecent) {
      console.log(`   ⏭️ #${issue.number} — 최근 분석 댓글 있음, 건너뜀`);
      continue;
    }

    console.log(`   🔍 #${issue.number} — ${issue.title} 분석 중...`);

    // AI에게 분석 의뢰
    let analysis;
    try {
      const aiResponse = await callOpenAI([
        {
          role: 'system',
          content: `당신은 Wiki 유지보수 전문가입니다.
Issue 내용과 현재 Wiki 문서 상태를 분석하여 JSON으로 응답하세요.

{
  "verdict": "resolved" | "actionable" | "needs_discussion",
  "reasoning": "판단 근거",
  "suggestion": "제안 내용 (actionable일 때 구체적 해결 방안)"
}

- resolved: 이미 해결되었거나 더 이상 유효하지 않은 Issue
- actionable: 구체적 해결 방안을 제시할 수 있는 Issue
- needs_discussion: 추가 논의가 필요한 Issue`
        },
        {
          role: 'user',
          content: `## Issue 정보
제목: ${issue.title}
본문:
${(issue.body || '').slice(0, 3000)}

## 현재 Wiki 문서 목록 (${allDocuments.length}개)
${JSON.stringify(docSummaries.slice(0, 30), null, 2)}`
        },
      ], { temperature: 0.1, maxTokens: 2000, responseFormat: 'json_object' });

      analysis = parseJsonResponse(aiResponse, { fallback: null });
    } catch (error) {
      console.warn(`   ⚠️ AI 분석 실패: ${error.message}`);
      continue;
    }

    if (!analysis) {
      console.warn(`   ⚠️ #${issue.number} — AI 응답 파싱 실패, 건너뜀`);
      continue;
    }

    console.log(`   📋 판정: ${analysis.verdict}`);

    if (analysis.verdict === 'resolved') {
      const commentBody = [
        `## 🤖 자동 유지보수 분석`,
        '',
        `**판정**: 해결됨 ✅`,
        '',
        analysis.reasoning,
        '',
        `이 Issue는 이미 해결된 것으로 판단되어 자동으로 닫습니다.`,
        `잘못된 판단이라면 Issue를 다시 열어주세요.`,
        '',
        `<!-- ${marker} -->`,
      ].join('\n');

      await safeAddComment(issue.number, commentBody);
      await closeGitHubIssue(issue.number);
      recordAction();

      actions.push({
        type: 'resolved_close',
        issueNumber: issue.number,
        title: issue.title,
        verdict: analysis.verdict,
      });
    } else if (analysis.verdict === 'actionable') {
      const commentBody = [
        `## 🤖 자동 유지보수 분석`,
        '',
        `**판정**: 실행 가능 🔧`,
        '',
        `**분석**: ${analysis.reasoning}`,
        '',
        `**제안 해결 방안**:`,
        analysis.suggestion,
        '',
        `maintainer 승인 후 진행됩니다. 댓글로 피드백을 남겨주세요.`,
        '',
        `<!-- ${marker} -->`,
      ].join('\n');

      await safeAddComment(issue.number, commentBody);
      recordAction();

      actions.push({
        type: 'suggestion',
        issueNumber: issue.number,
        title: issue.title,
        verdict: analysis.verdict,
      });
    } else {
      // needs_discussion
      const commentBody = [
        `## 🤖 자동 유지보수 분석`,
        '',
        `**판정**: 추가 논의 필요 💬`,
        '',
        analysis.reasoning,
        '',
        analysis.suggestion ? `**참고**: ${analysis.suggestion}` : '',
        '',
        `<!-- ${marker} -->`,
      ].join('\n');

      await safeAddComment(issue.number, commentBody);
      recordAction();

      actions.push({
        type: 'discussion',
        issueNumber: issue.number,
        title: issue.title,
        verdict: analysis.verdict,
      });
    }
  }

  return actions;
}

/* ═══════════════════════════════════════════
   Staleness Agent
   ═══════════════════════════════════════════ */

/**
 * 미활동 Issue에 리마인더 또는 자동 닫기
 * @param {Array} items - stale 카테고리 Issue들
 * @returns {Promise<Array>} 수행한 액션 목록
 */
async function stalenessAgent(items) {
  console.log('\n⏰ === Staleness Agent ===');
  const actions = [];

  const { owner, repo, token } = getGitHubInfoFromEnv();
  const reminderMarker = '[issue-processor:stale-reminder]';
  const closeMarker = '[issue-processor:stale-close]';

  for (const issue of items) {
    if (!canAct()) {
      console.log('⚠️ 액션 한도 도달 — Staleness 중단');
      break;
    }

    console.log(`   ⏰ #${issue.number} — ${issue.title} (${issue.daysSinceUpdate}일 미활동)`);

    // 댓글 히스토리 확인
    const comments = await fetchIssueComments(owner, repo, issue.number, token);

    // 기존 리마인더 댓글 찾기
    const reminderComment = comments.find(c => c.body.includes(reminderMarker));

    if (!reminderComment) {
      // 리마인더 미발송 → 리마인더 댓글 추가
      const hasRecentClose = await hasRecentBotComment(issue.number, closeMarker, 24);
      if (hasRecentClose) {
        console.log(`   ⏭️ #${issue.number} — 최근 닫기 댓글 있음, 건너뜀`);
        continue;
      }

      const commentBody = [
        `## ⏰ 미활동 알림`,
        '',
        `이 Issue가 **${issue.daysSinceUpdate}일** 동안 업데이트되지 않았습니다.`,
        '',
        `- 아직 작업 중이라면 댓글을 남겨주세요.`,
        `- 더 이상 필요하지 않다면 Issue를 닫아주세요.`,
        '',
        `**7일 내 응답이 없으면 자동으로 닫힙니다.**`,
        '',
        `<!-- ${reminderMarker} -->`,
      ].join('\n');

      await safeAddComment(issue.number, commentBody);
      await addGitHubLabels(issue.number, ['stale']);
      recordAction();

      actions.push({
        type: 'stale_reminder',
        issueNumber: issue.number,
        title: issue.title,
        daysSinceUpdate: issue.daysSinceUpdate,
      });
    } else {
      // 리마인더 이미 발송됨 → 7일 추가 미활동 체크
      const reminderDate = new Date(reminderComment.created_at);
      const daysSinceReminder = Math.floor((Date.now() - reminderDate) / (1000 * 60 * 60 * 24));

      if (daysSinceReminder < 7) {
        console.log(`   ⏭️ #${issue.number} — 리마인더 후 ${daysSinceReminder}일 경과 (7일 유예)`);
        continue;
      }

      // 리마인더 이후 사람 응답 있는지 확인
      const humanResponseAfterReminder = comments.some(c => {
        if (c.user.type === 'Bot') return false;
        return new Date(c.created_at) > reminderDate;
      });

      if (humanResponseAfterReminder) {
        console.log(`   ✅ #${issue.number} — 리마인더 후 사람 응답 있음, 건너뜀`);
        continue;
      }

      // 중복 방지
      const hasRecentClose = await hasRecentBotComment(issue.number, closeMarker, 24);
      if (hasRecentClose) {
        console.log(`   ⏭️ #${issue.number} — 최근 닫기 댓글 있음, 건너뜀`);
        continue;
      }

      // 자동 닫기
      const commentBody = [
        `## 🔒 자동 종료`,
        '',
        `리마인더 발송 후 7일간 응답이 없어 자동으로 닫습니다.`,
        `필요하다면 언제든 다시 열어주세요.`,
        '',
        `<!-- ${closeMarker} -->`,
      ].join('\n');

      await safeAddComment(issue.number, commentBody);
      await closeGitHubIssue(issue.number);
      recordAction();

      actions.push({
        type: 'stale_close',
        issueNumber: issue.number,
        title: issue.title,
        daysSinceUpdate: issue.daysSinceUpdate,
      });
    }
  }

  return actions;
}

/* ═══════════════════════════════════════════
   Deduplication Agent
   ═══════════════════════════════════════════ */

/**
 * Issue 제목에서 문서 슬러그를 추출 (중복 그룹핑용)
 * 예: "[Wiki Maintenance] [URL 변경] kubernetes/release-notes 문서 참조 URL 확인 필요"
 *   → "kubernetes/release-notes"
 * @param {string} title
 * @returns {string|null} 문서 슬러그 또는 null
 */
function extractDocSlug(title) {
  // "[URL 변경|깨짐] {slug} 문서" 패턴
  const urlMatch = title.match(/\[URL\s+(?:변경|깨짐)\]\s+(\S+)\s+문서/);
  if (urlMatch) return urlMatch[1];

  // "{category}/{slug}" 형태의 경로 패턴
  const pathMatch = title.match(/([a-z][\w-]*\/[\w-]+(?:\/[\w-]+)*)/i);
  if (pathMatch) return pathMatch[1];

  return null;
}

/**
 * 중복 Issue를 감지하고 오래된 것을 자동 닫기
 * 같은 문서 슬러그를 참조하는 Issue 그룹에서 최신 1개만 남김
 * @param {Array} issues - 전체 열린 Issue 배열
 * @returns {Promise<Array>} 수행한 액션 목록
 */
async function deduplicationAgent(issues) {
  console.log('\n🔄 === Deduplication Agent ===');
  const actions = [];
  const marker = '[issue-processor:duplicate]';

  // 슬러그 기반 그룹핑
  const groups = new Map();
  for (const issue of issues) {
    const slug = extractDocSlug(issue.title);
    if (!slug) continue;

    if (!groups.has(slug)) groups.set(slug, []);
    groups.get(slug).push(issue);
  }

  // 2개 이상인 그룹만 처리
  for (const [slug, group] of groups) {
    if (group.length < 2) continue;

    // 최신순 정렬 (created_at 기준)
    group.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const newest = group[0];
    const duplicates = group.slice(1);

    console.log(`   📋 "${slug}" — ${group.length}개 중복 (최신: #${newest.number})`);

    for (const dup of duplicates) {
      if (!canAct()) {
        console.log('⚠️ 액션 한도 도달 — Deduplication 중단');
        return actions;
      }

      // 이미 처리된 건 건너뜀
      const hasRecent = await hasRecentBotComment(dup.number, marker, 24);
      if (hasRecent) {
        console.log(`   ⏭️ #${dup.number} — 이미 중복 처리됨, 건너뜀`);
        continue;
      }

      const commentBody = [
        `## 🔄 중복 Issue 감지`,
        '',
        `이 Issue는 **#${newest.number}**과 동일한 문서(\`${slug}\`)를 참조하는 중복 Issue입니다.`,
        `최신 Issue(#${newest.number})를 유지하고 이 Issue를 닫습니다.`,
        '',
        `<!-- ${marker} -->`,
      ].join('\n');

      await safeAddComment(dup.number, commentBody);
      await closeGitHubIssue(dup.number);
      recordAction();

      actions.push({
        type: 'duplicate_close',
        issueNumber: dup.number,
        title: dup.title,
        duplicateOf: newest.number,
        slug,
      });

      console.log(`   🔒 #${dup.number} 닫기 (중복 → #${newest.number})`);
    }
  }

  return actions;
}

/* ═══════════════════════════════════════════
   메인 오케스트레이터
   ═══════════════════════════════════════════ */

async function main() {
  console.log('🚀 Issue Processor 시작');
  console.log(`   DRY_RUN: ${IS_DRY_RUN}`);
  console.log(`   MAX_ACTIONS_PER_RUN: ${MAX_ACTIONS_PER_RUN}`);
  console.log(`   ENABLED_AGENTS: ${ISSUE_PROCESSOR_ENABLED_AGENTS.join(', ')}`);
  console.log(`   STALENESS_THRESHOLD_DAYS: ${STALENESS_THRESHOLD_DAYS}`);
  console.log(`   QUALITY_AUTO_PUBLISH_THRESHOLD: ${QUALITY_AUTO_PUBLISH_THRESHOLD}`);

  // 1. 전체 열린 Issue 조회
  const issues = await fetchAllOpenIssues();
  if (issues.length === 0) {
    console.log('✅ 열린 Issue가 없습니다. 종료.');
    return;
  }

  // 2. Triage — 분류
  const categories = triageAgent(issues);

  // 3. Wiki 문서 로드 (Quality Review, Maintenance에 필요)
  const allDocuments = await loadAllDocuments({ includeContent: true });
  console.log(`📚 Wiki 문서 ${allDocuments.length}개 로드됨`);

  // 4. 각 에이전트 실행
  const allActions = [];

  if (ISSUE_PROCESSOR_ENABLED_AGENTS.includes('quality_review')) {
    const draftItems = categories.get('draft_review') || [];
    if (draftItems.length > 0) {
      const actions = await qualityReviewAgent(draftItems, allDocuments);
      allActions.push(...actions);
    }
  }

  if (ISSUE_PROCESSOR_ENABLED_AGENTS.includes('maintenance')) {
    const maintItems = categories.get('maintenance') || [];
    if (maintItems.length > 0) {
      const actions = await maintenanceAgent(maintItems, allDocuments);
      allActions.push(...actions);
    }
  }

  if (ISSUE_PROCESSOR_ENABLED_AGENTS.includes('staleness')) {
    const staleItems = categories.get('stale') || [];
    if (staleItems.length > 0) {
      const actions = await stalenessAgent(staleItems);
      allActions.push(...actions);
    }
  }

  if (ISSUE_PROCESSOR_ENABLED_AGENTS.includes('deduplication')) {
    const actions = await deduplicationAgent(issues);
    allActions.push(...actions);
  }

  // 5. 결과 보고서
  const report = {
    timestamp: new Date().toISOString(),
    dryRun: IS_DRY_RUN,
    totalIssuesScanned: issues.length,
    categories: Object.fromEntries(
      [...categories.entries()].map(([k, v]) => [k, v.map(i => ({
        number: i.number,
        title: i.title,
        daysSinceUpdate: i.daysSinceUpdate,
      }))])
    ),
    actionsPerformed: allActions,
    actionCount,
    maxActions: MAX_ACTIONS_PER_RUN,
  };

  await saveReport('issue-processor-report.json', report);

  // 6. 요약
  console.log('\n📊 === 실행 요약 ===');
  console.log(`   스캔된 Issue: ${issues.length}개`);
  console.log(`   수행된 액션: ${actionCount}/${MAX_ACTIONS_PER_RUN}`);
  for (const action of allActions) {
    console.log(`   - #${action.issueNumber} [${action.type}] ${action.title}`);
  }
  console.log('\n✅ Issue Processor 완료');
}

main().catch(error => {
  console.error('❌ Issue Processor 오류:', error);
  process.exit(1);
});
