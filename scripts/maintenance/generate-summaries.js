#!/usr/bin/env node

/**
 * 요약 자동 생성 스크립트
 * description 필드가 비어있는 문서에 대해 AI가 200자 요약 생성 후 frontmatter 업데이트
 *
 * 동작: 기존 워크플로우에 step으로 추가하거나 별도 실행
 */

import { resolve } from 'path';
import { writeFile } from 'fs/promises';
import { loadAllDocuments } from '../lib/document-scanner.js';
import { callOpenAI, parseJsonResponse, getOpenAIConfig, setGitHubOutput } from '../lib/utils.js';
import { updateFrontmatterField } from '../lib/frontmatter.js';
import { addAIHistoryEntry } from '../lib/ai-history.js';

const WIKI_DIR = resolve(process.cwd(), 'wiki');
const IS_DRY_RUN = process.env.DRY_RUN === 'true';

/**
 * AI를 사용하여 문서 요약 생성 (배치)
 */
async function generateSummaries(documents) {
  const batchSize = 10;
  const results = [];

  for (let i = 0; i < documents.length; i += batchSize) {
    const batch = documents.slice(i, i + batchSize);
    console.log(`   요약 생성 중... (${i + 1}-${Math.min(i + batchSize, documents.length)}/${documents.length})`);

    const docContents = batch.map((doc) => ({
      path: doc.path,
      title: doc.title,
      content: doc.content ? doc.content.slice(0, 1000) : '',
    }));

    const systemPrompt = `당신은 기술 문서 요약 전문가입니다.
각 문서의 핵심 내용을 200자 이내의 한국어 요약으로 작성합니다.

## 출력 형식 (JSON 배열)
[
  {
    "path": "문서 경로",
    "description": "200자 이내 요약 (한국어)"
  }
]

## 규칙
- 문서의 핵심 주제와 목적을 간결하게 요약
- 기술 용어는 유지하되 이해하기 쉬운 표현 사용
- 추측이나 허위 내용 포함 금지
- 각 요약은 반드시 200자(한국어 기준) 이내`;

    const response = await callOpenAI(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `다음 문서들의 요약을 생성해주세요:\n${JSON.stringify(docContents, null, 2)}` },
      ],
      { temperature: 0.1, maxTokens: 2000 }
    );

    const parsed = parseJsonResponse(response, { fallback: [] });
    if (Array.isArray(parsed)) {
      results.push(...parsed);
    }
  }

  return results;
}

/**
 * 메인 실행
 */
async function main() {
  console.log('📝 요약 자동 생성 시작...');
  if (IS_DRY_RUN) console.log('🧪 DRY RUN 모드');
  console.log('---');

  try {
    // 1. 문서 로드
    const documents = await loadAllDocuments({ wikiDir: WIKI_DIR, includeContent: true });
    console.log(`📚 ${documents.length}개 문서 로드됨`);

    // 2. description 없는 문서 필터링
    const docsNeedingSummary = documents.filter(
      (doc) => !doc.frontmatter.description || doc.frontmatter.description.trim() === ''
    );
    console.log(`📋 요약이 필요한 문서: ${docsNeedingSummary.length}개`);

    if (docsNeedingSummary.length === 0) {
      console.log('ℹ️ 모든 문서에 요약이 있습니다.');
      await setGitHubOutput({ has_changes: 'false', updated_count: '0' });
      return;
    }

    // 3. AI 요약 생성
    console.log('🤖 AI 요약 생성 중...');
    const summaries = await generateSummaries(docsNeedingSummary);
    console.log(`✅ ${summaries.length}개 요약 생성 완료`);

    // 4. frontmatter 업데이트
    let updatedCount = 0;
    for (const summary of summaries) {
      if (!summary.description) continue;

      const doc = documents.find((d) => d.path === summary.path);
      if (!doc || !doc.rawContent) continue;

      // description에 백슬래시/따옴표가 포함될 수 있으므로 escape (백슬래시 먼저)
      const safeDescription = summary.description.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      const updatedContent = updateFrontmatterField(
        doc.rawContent,
        'description',
        `"${safeDescription}"`
      );

      if (updatedContent !== doc.rawContent && !IS_DRY_RUN) {
        await writeFile(doc.fullPath, updatedContent);
        updatedCount++;
        console.log(`   ✅ ${doc.path}: 요약 추가`);
      }
    }

    // 5. AI History 기록
    if (!IS_DRY_RUN && updatedCount > 0) {
      await addAIHistoryEntry({
        actionType: 'summary_generate',
        issueNumber: null,
        issueTitle: '문서 요약 자동 생성',
        documentSlug: '_summary-generate',
        documentTitle: '문서 요약 자동 생성',
        summary: `${updatedCount}개 문서에 요약 추가`,
        trigger: 'scheduled',
        model: getOpenAIConfig().model,
      });
    }

    // 6. GitHub Actions 출력
    await setGitHubOutput({
      has_changes: updatedCount > 0 ? 'true' : 'false',
      updated_count: String(updatedCount),
      needed_count: String(docsNeedingSummary.length),
    });

    console.log('---');
    console.log(`🎉 요약 생성 완료: ${updatedCount}/${docsNeedingSummary.length}개 업데이트`);
  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
