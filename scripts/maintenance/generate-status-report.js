#!/usr/bin/env node

/**
 * 주간 위키 상태 보고서 생성 스크립트
 * ai-history.json + issues.json + wiki-data.json + Git log를 수집하여 주간 보고서 생성
 *
 * 트리거: 매주 월요일 + workflow_dispatch
 * 출력: wiki/reports/weekly-YYYY-WW.md + public/data/wiki-stats.json
 */

import { resolve, join } from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { execSync } from 'child_process';
import { loadAllDocuments } from '../lib/document-scanner.js';
import { loadAIHistory } from '../lib/ai-history.js';
import { loadIssuesData } from '../lib/issues-store.js';
import { callOpenAI, getOpenAIConfig, setGitHubOutput } from '../lib/utils.js';
import { addAIHistoryEntry } from '../lib/ai-history.js';
import { saveReport, saveMarkdownReport } from '../lib/report-generator.js';

const WIKI_DIR = resolve(process.cwd(), 'wiki');
const REPORTS_DIR = join(WIKI_DIR, 'reports');
const IS_DRY_RUN = process.env.DRY_RUN === 'true';

/**
 * 현재 ISO 주 번호 계산
 */
function getISOWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return (
    1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)
  );
}

/**
 * 지난 7일간 Git 커밋 로그 가져오기
 */
function getRecentGitLog() {
  try {
    const cmd = `git log --since="7 days ago" --pretty=format:"%h|%s|%an|%aI" -- wiki/`;
    const output = execSync(cmd, { encoding: 'utf-8', cwd: process.cwd() });
    if (!output.trim()) return [];

    return output
      .trim()
      .split('\n')
      .map((line) => {
        const [sha, message, author, date] = line.split('|');
        return { sha, message, author, date };
      });
  } catch {
    return [];
  }
}

/**
 * 주간 통계 수집
 */
async function collectWeeklyStats(documents, aiHistory, issuesData) {
  const now = new Date();
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

  // AI History에서 지난 7일 항목 필터링
  const recentAIEntries = aiHistory.entries.filter(
    (entry) => new Date(entry.timestamp) >= weekAgo
  );

  // Issues에서 열린 Issue 수
  const openIssues = issuesData.issues.filter((i) => i.state === 'open');

  // 문서 상태별 분포
  const statusDist = {};
  for (const doc of documents) {
    const status = doc.status || 'unknown';
    statusDist[status] = (statusDist[status] || 0) + 1;
  }

  // Git 커밋 로그
  const recentCommits = getRecentGitLog();

  // 신규 문서 (지난 7일간 생성)
  const newDocs = recentAIEntries.filter((e) => e.actionType === 'generate');

  // 수정된 문서
  const modifiedDocs = recentAIEntries.filter((e) => e.actionType === 'modify');

  // 발행된 문서
  const publishedDocs = recentAIEntries.filter((e) => e.actionType === 'publish');

  return {
    period: {
      start: weekAgo.toISOString(),
      end: now.toISOString(),
    },
    documents: {
      total: documents.length,
      statusDistribution: statusDist,
      newCount: newDocs.length,
      modifiedCount: modifiedDocs.length,
      publishedCount: publishedDocs.length,
    },
    aiActivity: {
      totalActions: recentAIEntries.length,
      byType: recentAIEntries.reduce((acc, e) => {
        acc[e.actionType] = (acc[e.actionType] || 0) + 1;
        return acc;
      }, {}),
      entries: recentAIEntries.slice(0, 20),
    },
    issues: {
      totalOpen: openIssues.length,
      recentActivity: issuesData.issues
        .filter((i) => new Date(i.updated_at) >= weekAgo)
        .length,
    },
    commits: {
      total: recentCommits.length,
      entries: recentCommits.slice(0, 10),
    },
  };
}

/**
 * AI를 사용하여 주간 보고서 생성
 */
async function generateReport(stats) {
  const systemPrompt = `당신은 Wiki 운영 보고서 작성 AI입니다.
주어진 통계 데이터를 기반으로 한국어 주간 보고서를 작성합니다.

## 보고서 형식 (마크다운)
---
title: "주간 위키 보고서 - YYYY년 WW주차"
author: SEPilot AI
status: published
tags: [보고서, 주간, 통계]
category: reports
---

## 요약
(핵심 수치와 주요 변화 2-3줄 요약)

## 문서 현황
(전체 문서 수, 상태별 분포, 신규/수정/발행 문서)

## AI 활동 요약
(AI가 수행한 작업 목록과 요약)

## 열린 이슈
(현재 처리 대기 중인 Issue 현황)

## 주간 변경사항
(주요 커밋 목록)

## 향후 과제
(개선이 필요한 부분, 주의사항)

## 중요 규칙
- 확실한 사실만 작성
- 통계 수치는 정확히 인용
- 추측성 내용 제외`;

  const now = new Date();
  const week = getISOWeek(now);

  const userPrompt = `다음 통계 데이터를 기반으로 ${now.getFullYear()}년 ${week}주차 주간 위키 보고서를 작성해주세요:

${JSON.stringify(stats, null, 2)}

마크다운 코드 블록 없이 순수 마크다운만 반환하세요.`;

  return callOpenAI(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    { temperature: 0.1, maxTokens: 4000 }
  );
}

/**
 * 메인 실행
 */
async function main() {
  console.log('📊 주간 위키 상태 보고서 생성 시작...');
  if (IS_DRY_RUN) console.log('🧪 DRY RUN 모드');
  console.log(`📅 ${new Date().toISOString()}`);
  console.log('---');

  try {
    // 1. 데이터 수집
    const documents = await loadAllDocuments({ wikiDir: WIKI_DIR, includeContent: false });
    const aiHistory = await loadAIHistory();
    const issuesData = await loadIssuesData();

    console.log(`📚 ${documents.length}개 문서`);
    console.log(`🤖 ${aiHistory.entries.length}개 AI 이력`);
    console.log(`📋 ${issuesData.issues.length}개 Issue`);

    // 2. 통계 수집
    const stats = await collectWeeklyStats(documents, aiHistory, issuesData);

    // 3. AI 보고서 생성
    console.log('🤖 AI 보고서 생성 중...');
    const reportContent = await generateReport(stats);

    // 4. 마크다운 보고서 저장
    const now = new Date();
    const week = String(getISOWeek(now)).padStart(2, '0');
    const year = now.getFullYear();
    const reportFilename = `weekly-${year}-${week}.md`;
    const reportPath = join(REPORTS_DIR, reportFilename);

    await saveMarkdownReport(reportPath, reportContent);

    // 5. 통계 JSON 저장
    const wikiStats = {
      generatedAt: now.toISOString(),
      weekNumber: parseInt(week),
      year,
      ...stats,
    };

    await saveReport('wiki-stats.json', wikiStats);

    // 6. AI History 기록
    if (!IS_DRY_RUN) {
      await addAIHistoryEntry({
        actionType: 'status_report',
        issueNumber: null,
        issueTitle: `주간 보고서 ${year}-W${week}`,
        documentSlug: `reports/weekly-${year}-${week}`,
        documentTitle: `주간 위키 보고서 - ${year}년 ${week}주차`,
        summary: `주간 보고서 생성: ${stats.documents.total}개 문서, ${stats.aiActivity.totalActions}개 AI 활동`,
        trigger: 'weekly_schedule',
        model: getOpenAIConfig().model,
      });
    }

    // 7. GitHub Actions 출력
    await setGitHubOutput({
      report_path: reportPath,
      stats_path: 'public/data/wiki-stats.json',
      total_documents: String(stats.documents.total),
      weekly_ai_actions: String(stats.aiActivity.totalActions),
    });

    console.log('---');
    console.log('🎉 주간 보고서 생성 완료');
  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
