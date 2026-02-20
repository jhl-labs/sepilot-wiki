#!/usr/bin/env node

/**
 * 문서 최신성 자동 점검 스크립트
 * 전체 wiki 문서를 스캔하여 오래된 문서를 식별하고 AI가 기술적 최신성을 평가
 *
 * 트리거: 매주 일요일 + workflow_dispatch
 * 출력: public/data/freshness-report.json, outdated 문서 Issue 자동 생성
 */

import { resolve } from 'path';
import { loadAllDocuments, getDaysSinceLastModified } from '../lib/document-scanner.js';
import { callOpenAI, parseJsonResponse, getOpenAIConfig, setGitHubOutput } from '../lib/utils.js';
import { mergeFrontmatter } from '../lib/frontmatter.js';
import { addAIHistoryEntry } from '../lib/ai-history.js';
import { saveReport, createGitHubIssues } from '../lib/report-generator.js';
import { writeFile } from 'fs/promises';

const WIKI_DIR = resolve(process.cwd(), 'wiki');
const FRESHNESS_THRESHOLD_DAYS = 90; // 90일 이상 미수정 문서
const IS_DRY_RUN = process.env.DRY_RUN === 'true';

/**
 * AI를 사용한 기술적 최신성 평가
 * @param {Array} outdatedDocs - 오래된 문서 목록
 * @returns {Promise<Array>} 평가 결과
 */
async function evaluateFreshness(outdatedDocs) {
  if (outdatedDocs.length === 0) return [];

  const docSummaries = outdatedDocs.map((doc) => ({
    path: doc.path,
    title: doc.title,
    tags: doc.tags,
    daysSinceModified: doc.daysSinceModified,
    preview: doc.content ? doc.content.slice(0, 500) : '',
  }));

  const systemPrompt = `당신은 기술 문서 최신성 평가 전문가입니다.
주어진 문서들을 분석하여 각 문서의 기술적 최신성을 평가합니다.

## 평가 기준
- 기술 스택의 변화 (버전 업데이트, 사용 중단 등)
- 보안 관련 변경사항
- 모범 사례의 변화
- 링크/참조의 유효성

## 출력 형식 (JSON 배열)
[
  {
    "path": "문서 경로",
    "freshness_score": 0-100,
    "assessment": "최신 | 약간 오래됨 | 업데이트 필요 | 긴급 업데이트 필요",
    "reason": "평가 이유 (한국어, 1-2문장)",
    "suggestions": ["구체적 업데이트 제안 (한국어)"]
  }
]

## 점수 기준
- 90-100: 최신 상태, 업데이트 불필요
- 70-89: 약간 오래됨, 선택적 업데이트
- 50-69: 업데이트 필요, 일부 내용이 outdated
- 0-49: 긴급 업데이트 필요, 정확도 의심`;

  const userPrompt = `다음 문서들의 기술적 최신성을 평가해주세요:

${JSON.stringify(docSummaries, null, 2)}

JSON 배열로만 응답해주세요.`;

  const response = await callOpenAI(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    { temperature: 0.1, maxTokens: 4000 }
  );

  // JSON 추출
  return parseJsonResponse(response, { fallback: [] });
}

/**
 * 메인 실행
 */
async function main() {
  console.log('🔍 문서 최신성 점검 시작...');
  if (IS_DRY_RUN) console.log('🧪 DRY RUN 모드');
  console.log(`📅 ${new Date().toISOString()}`);
  console.log('---');

  try {
    // 1. 문서 로드 (Git 히스토리 포함)
    const documents = await loadAllDocuments({
      wikiDir: WIKI_DIR,
      includeContent: true,
      includeGitHistory: true,
      maxHistoryEntries: 1,
    });
    console.log(`📚 ${documents.length}개 문서 로드됨`);

    if (documents.length === 0) {
      console.log('⚠️ 점검할 문서가 없습니다.');
      await setGitHubOutput({ has_outdated: 'false', total_checked: '0' });
      return;
    }

    // 2. 각 문서의 마지막 수정일로부터 경과일 계산
    for (const doc of documents) {
      doc.daysSinceModified = getDaysSinceLastModified(doc.fullPath);
    }

    // 3. 오래된 문서 필터링
    const outdatedDocs = documents.filter(
      (doc) => doc.daysSinceModified >= FRESHNESS_THRESHOLD_DAYS
    );
    console.log(`📋 ${FRESHNESS_THRESHOLD_DAYS}일 이상 미수정 문서: ${outdatedDocs.length}개`);

    // 4. AI 최신성 평가 (오래된 문서가 있는 경우)
    let evaluations = [];
    if (outdatedDocs.length > 0) {
      console.log('🤖 AI 최신성 평가 중...');
      evaluations = await evaluateFreshness(outdatedDocs);
      console.log(`✅ ${evaluations.length}개 문서 평가 완료`);
    }

    // 5. frontmatter 업데이트 (freshness_score, last_reviewed)
    const today = new Date().toISOString().split('T')[0];
    let updatedCount = 0;

    for (const evaluation of evaluations) {
      const doc = documents.find((d) => d.path === evaluation.path);
      if (!doc || !doc.rawContent) continue;

      const updatedContent = mergeFrontmatter(doc.rawContent, {
        freshness_score: String(evaluation.freshness_score),
        last_reviewed: today,
      });

      if (updatedContent !== doc.rawContent && !IS_DRY_RUN) {
        await writeFile(doc.fullPath, updatedContent);
        updatedCount++;
      }
    }
    console.log(`📝 ${updatedCount}개 문서 frontmatter 업데이트`);

    // 6. 보고서 생성
    const report = {
      timestamp: new Date().toISOString(),
      model: getOpenAIConfig().model,
      isDryRun: IS_DRY_RUN,
      thresholdDays: FRESHNESS_THRESHOLD_DAYS,
      summary: {
        totalDocuments: documents.length,
        outdatedDocuments: outdatedDocs.length,
        evaluatedDocuments: evaluations.length,
        updatedDocuments: updatedCount,
      },
      evaluations,
      allDocuments: documents.map((doc) => ({
        path: doc.path,
        title: doc.title,
        daysSinceModified: doc.daysSinceModified,
        status: doc.status,
      })),
    };

    await saveReport('freshness-report.json', report);

    // 7. Issue 생성 (50점 미만 문서)
    const criticalDocs = evaluations.filter((e) => e.freshness_score < 50);
    if (criticalDocs.length > 0) {
      const issues = criticalDocs.map((doc) => ({
        title: `문서 업데이트 필요: ${doc.path}`,
        body: [
          `## 문서 최신성 점검 결과`,
          '',
          `- **문서**: \`${doc.path}\``,
          `- **최신성 점수**: ${doc.freshness_score}/100`,
          `- **평가**: ${doc.assessment}`,
          `- **사유**: ${doc.reason}`,
          '',
          '### 업데이트 제안',
          ...doc.suggestions.map((s) => `- ${s}`),
          '',
          '> 이 문서는 마지막 수정 후 상당 기간이 경과하여 내용 업데이트가 필요합니다.',
        ].join('\n'),
        labels: ['wiki-maintenance', 'update-request'],
      }));

      const createdIssues = await createGitHubIssues(issues, {
        titlePrefix: '[최신성 점검]',
        defaultLabels: ['wiki-maintenance', 'update-request'],
        footer: '\n\n---\n*🤖 이 Issue는 문서 최신성 자동 점검에 의해 생성되었습니다.*',
      });

      report.createdIssues = createdIssues;
    }

    // 8. AI History 기록
    if (!IS_DRY_RUN) {
      await addAIHistoryEntry({
        actionType: 'freshness_check',
        issueNumber: null,
        issueTitle: '문서 최신성 점검',
        documentSlug: '_freshness-check',
        documentTitle: '문서 최신성 점검',
        summary: `${documents.length}개 문서 점검, ${outdatedDocs.length}개 outdated, ${criticalDocs?.length || 0}개 긴급`,
        trigger: 'weekly_schedule',
        model: getOpenAIConfig().model,
      });
    }

    // 9. GitHub Actions 출력
    await setGitHubOutput({
      has_outdated: outdatedDocs.length > 0 ? 'true' : 'false',
      total_checked: String(documents.length),
      outdated_count: String(outdatedDocs.length),
      critical_count: String(criticalDocs?.length || 0),
      updated_count: String(updatedCount),
    });

    console.log('---');
    console.log('🎉 문서 최신성 점검 완료');
  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
