#!/usr/bin/env node

/**
 * 콘텐츠 리뷰어 (Content Reviewer)
 *
 * 기존 published 문서의 품질·최신성을 구조적 규칙 + AI 평가로 점검하고
 * 개선이 필요한 문서에 대해 Issue를 생성
 *
 * 트리거: 주 1회 (autonomous-knowledge.yml)
 */

import { callOpenAI, parseJsonResponse } from '../lib/utils.js';
import { saveReport, createGitHubIssues, getExistingIssues } from '../lib/report-generator.js';
import { loadAllDocuments, getDaysSinceLastModified } from '../lib/document-scanner.js';
import { addAIHistoryEntry } from '../lib/ai-history.js';
import {
  MAX_AUTO_ISSUES,
  MAX_REVIEW_BATCH,
  FRESHNESS_WARNING_DAYS,
  MIN_DOCUMENT_LENGTH,
} from './config.js';

const IS_DRY_RUN = process.env.DRY_RUN === 'true';

/**
 * 규칙 기반 구조적 체크 (AI 불필요)
 * @param {Array} documents - loadAllDocuments 결과
 * @returns {Array<{ slug: string, title: string, issues: string[], severity: string }>}
 */
function runStructuralChecks(documents) {
  const publishedDocs = documents.filter((d) => d.status === 'published');
  const slugSet = new Set(documents.map((d) => d.slug));
  const results = [];

  for (const doc of publishedDocs) {
    const issues = [];

    // 1. 깨진 related_docs
    const relatedDocs = doc.frontmatter?.related_docs || [];
    for (const ref of relatedDocs) {
      if (!slugSet.has(ref)) {
        issues.push(`깨진 관련문서 참조: ${ref}`);
      }
    }

    // 관련문서 대상이 deleted인 경우
    for (const ref of relatedDocs) {
      const target = documents.find((d) => d.slug === ref);
      if (target && target.status === 'deleted') {
        issues.push(`삭제된 문서 참조: ${ref}`);
      }
    }

    // 2. frontmatter 불완전 (tags 비어있음)
    if (!doc.tags || doc.tags.length === 0) {
      issues.push('태그 미지정');
    }

    // 3. 짧은 문서
    if (doc.wordCount < MIN_DOCUMENT_LENGTH) {
      issues.push(`짧은 문서 (${doc.wordCount}자, 최소 ${MIN_DOCUMENT_LENGTH}자)`);
    }

    // 4. 오래된 문서 (git history 기반)
    const daysSince = getDaysSinceLastModified(doc.fullPath);
    if (daysSince > FRESHNESS_WARNING_DAYS) {
      issues.push(`${daysSince}일간 미수정 (기준: ${FRESHNESS_WARNING_DAYS}일)`);
    }

    if (issues.length > 0) {
      const severity = issues.some((i) => i.includes('깨진') || i.includes('삭제된'))
        ? 'high'
        : issues.some((i) => i.includes('미수정'))
          ? 'medium'
          : 'low';

      results.push({
        slug: doc.slug,
        title: doc.title,
        path: doc.path,
        wordCount: doc.wordCount,
        daysSinceModified: daysSince,
        issues,
        severity,
      });
    }
  }

  return results;
}

/**
 * AI 품질 평가 (구조적 문제가 있거나 오래된 문서만 대상)
 * @param {Object} doc - 문서 객체
 * @returns {Promise<{ score: number, freshness: string, issues: string[], suggestions: string[], suggestedTitle: string }>}
 */
async function evaluateDocumentQuality(doc) {
  const systemPrompt = `당신은 기술 문서 품질 감사관입니다. 문서의 최신성, 정확성, 완성도를 평가하세요.
JSON 응답:
{
  "score": 0-100,
  "freshness": "current|aging|outdated",
  "issues": ["발견된 문제"],
  "suggestions": ["개선 제안"],
  "suggestedTitle": "Issue 제목 제안"
}`;

  const contentPreview = doc.content ? doc.content.slice(0, 3000) : '';

  const userPrompt = `## 문서 정보
- 제목: ${doc.title}
- 경로: ${doc.path}
- 태그: ${(doc.tags || []).join(', ')}
- 단어 수: ${doc.wordCount}
- 카테고리: ${doc.directory}

## 본문 (앞 3000자)
${contentPreview}

위 문서의 품질을 평가해주세요.`;

  const response = await callOpenAI(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    { temperature: 0.1, maxTokens: 2000, responseFormat: 'json_object' }
  );

  const result = parseJsonResponse(response, {
    fallback: { score: 50, freshness: 'current', issues: [], suggestions: [], suggestedTitle: '' },
  });

  return result;
}

/** 메인 실행 */
async function main() {
  console.log('🔍 콘텐츠 리뷰 시작...');

  // 1. 전체 문서 로드
  const documents = await loadAllDocuments({ includeContent: true });
  const publishedDocs = documents.filter((d) => d.status === 'published');
  console.log(`📚 로드 완료: 전체 ${documents.length}개, published ${publishedDocs.length}개`);

  if (publishedDocs.length === 0) {
    console.log('published 문서 없음, 종료');
    await saveReport('content-reviewer-report.json', {
      generatedAt: new Date().toISOString(),
      structuralIssues: [],
      aiReviews: [],
      issuesCreated: 0,
    });
    return;
  }

  // 2. 규칙 기반 구조적 체크
  const structuralResults = runStructuralChecks(documents);
  console.log(`\n🔧 구조적 문제 감지: ${structuralResults.length}개 문서`);

  for (const r of structuralResults) {
    console.log(`   - ${r.slug}: ${r.issues.join(', ')}`);
  }

  // 3. AI 평가 (구조적 문제가 있는 문서 중 최대 MAX_REVIEW_BATCH개)
  const aiCandidates = structuralResults
    .sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      return (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3);
    })
    .slice(0, MAX_REVIEW_BATCH);

  console.log(`\n🤖 AI 평가 대상: ${aiCandidates.length}개 문서`);

  const aiReviews = [];
  for (const candidate of aiCandidates) {
    const doc = documents.find((d) => d.slug === candidate.slug);
    if (!doc) continue;

    try {
      console.log(`   평가 중: ${candidate.slug}...`);
      const review = await evaluateDocumentQuality(doc);
      aiReviews.push({
        slug: candidate.slug,
        title: candidate.title,
        structuralIssues: candidate.issues,
        severity: candidate.severity,
        aiScore: review.score,
        freshness: review.freshness,
        aiIssues: review.issues || [],
        aiSuggestions: review.suggestions || [],
        suggestedTitle: review.suggestedTitle || '',
      });
    } catch (error) {
      console.warn(`   ⚠️ AI 평가 실패 (${candidate.slug}): ${error.message}`);
    }
  }

  console.log(`   AI 평가 완료: ${aiReviews.length}개`);

  // 4. Issue 생성 후보 선정
  // - AI 점수 70 미만이거나 freshness가 outdated인 문서
  // - 또는 severity가 high인 구조적 문제
  const issueCandidates = aiReviews.filter(
    (r) => r.aiScore < 70 || r.freshness === 'outdated' || r.severity === 'high'
  );

  console.log(`\n📋 Issue 생성 후보: ${issueCandidates.length}개`);

  // 5. Issue 생성
  let issuesCreated = 0;

  if (issueCandidates.length > 0 && !IS_DRY_RUN) {
    // 중복 체크를 위해 기존 Issue 로드
    const existingIssueTitles = await getExistingIssues('wiki-maintenance');

    // 점수 낮은 순 정렬 → 최대 MAX_AUTO_ISSUES개
    const sorted = issueCandidates
      .sort((a, b) => a.aiScore - b.aiScore)
      .slice(0, MAX_AUTO_ISSUES);

    for (const candidate of sorted) {
      const isStale = candidate.freshness === 'outdated';
      const titlePrefix = isStale ? '[Wiki Maintenance] [최신화]' : '[Wiki Maintenance] [품질]';
      const labels = isStale
        ? ['update-request', 'auto-detected']
        : ['wiki-maintenance', 'auto-detected'];

      const issueTitle = candidate.suggestedTitle || `${candidate.title} 문서 개선`;

      // 중복 확인
      const fullTitle = `${titlePrefix} ${issueTitle}`.toLowerCase();
      if (existingIssueTitles.some((t) => t.includes(candidate.slug) || t.includes(fullTitle))) {
        console.log(`⏭️ 중복 건너뜀: ${issueTitle}`);
        continue;
      }

      const issueBody = [
        '> 🔍 자동 감지: 콘텐츠 리뷰',
        '',
        `**문서**: \`${candidate.slug}\``,
        `**AI 품질 점수**: ${candidate.aiScore}/100`,
        `**최신성**: ${candidate.freshness}`,
        '',
        '## 구조적 문제',
        ...candidate.structuralIssues.map((i) => `- ${i}`),
        '',
        candidate.aiIssues.length > 0
          ? `## AI 감지 문제\n${candidate.aiIssues.map((i) => `- ${i}`).join('\n')}`
          : '',
        '',
        candidate.aiSuggestions.length > 0
          ? `## 개선 제안\n${candidate.aiSuggestions.map((s) => `- ${s}`).join('\n')}`
          : '',
      ]
        .filter(Boolean)
        .join('\n');

      try {
        const issues = await createGitHubIssues(
          [{ title: issueTitle, body: issueBody, labels }],
          { titlePrefix, defaultLabels: labels }
        );

        if (issues.length > 0) {
          issuesCreated++;
        }
      } catch (error) {
        console.warn(`⚠️ Issue 생성 실패: ${error.message}`);
      }
    }
  } else if (IS_DRY_RUN && issueCandidates.length > 0) {
    console.log(`[DRY RUN] ${Math.min(issueCandidates.length, MAX_AUTO_ISSUES)}개 Issue 생성 건너뜀`);
    for (const c of issueCandidates.slice(0, MAX_AUTO_ISSUES)) {
      console.log(`  - ${c.slug} (점수: ${c.aiScore}, 최신성: ${c.freshness})`);
    }
  }

  // 6. 보고서 저장
  const report = {
    generatedAt: new Date().toISOString(),
    config: {
      freshnessWarningDays: FRESHNESS_WARNING_DAYS,
      minDocumentLength: MIN_DOCUMENT_LENGTH,
      maxReviewBatch: MAX_REVIEW_BATCH,
    },
    summary: {
      totalPublished: publishedDocs.length,
      structuralIssuesFound: structuralResults.length,
      aiReviewsPerformed: aiReviews.length,
      issueCandidates: issueCandidates.length,
      issuesCreated,
    },
    structuralIssues: structuralResults,
    aiReviews,
  };

  await saveReport('content-reviewer-report.json', report);

  // 7. AI History 기록
  await addAIHistoryEntry({
    actionType: 'maintain',
    issueNumber: null,
    issueTitle: '콘텐츠 리뷰',
    documentSlug: null,
    documentTitle: null,
    summary: `콘텐츠 리뷰: ${publishedDocs.length}개 문서 점검, 구조적 문제 ${structuralResults.length}건, AI 평가 ${aiReviews.length}건, Issue ${issuesCreated}건 생성`,
    trigger: 'scheduled',
  });

  console.log(`\n✅ 콘텐츠 리뷰 완료`);
  console.log(`   점검: ${publishedDocs.length}개, 구조적 문제: ${structuralResults.length}건, AI 평가: ${aiReviews.length}건, Issue: ${issuesCreated}건`);
}

main().catch((error) => {
  console.error('❌ 콘텐츠 리뷰 실패:', error.message);
  process.exit(1);
});
