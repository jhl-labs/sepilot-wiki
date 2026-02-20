#!/usr/bin/env node

/**
 * 교차 참조 자동 생성 스크립트
 * 문서 간 주제/태그/내용 관련성을 AI가 분석하여 related_docs frontmatter 업데이트
 *
 * 트리거: wiki 변경 push + 주 1회 schedule
 * 출력: 각 문서의 frontmatter에 related_docs 필드 업데이트
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
 * AI를 사용하여 문서 간 관련성 분석
 */
async function analyzeRelationships(documents) {
  const docSummaries = documents.map((doc) => ({
    path: doc.path,
    title: doc.title,
    tags: doc.tags,
    category: doc.frontmatter.category || '',
    preview: doc.content ? doc.content.slice(0, 400) : '',
  }));

  const systemPrompt = `당신은 Wiki 문서 관련성 분석 전문가입니다.
주어진 문서 목록에서 각 문서의 관련 문서를 찾아줍니다.

## 출력 형식 (JSON)
[
  {
    "path": "문서 경로",
    "related_docs": ["관련문서1.md", "관련문서2.md"]
  }
]

## 규칙
- 각 문서에 최대 5개의 관련 문서를 매칭
- 관련성 기준: 동일 주제, 유사 태그, 보완적 내용, 선행/후행 관계
- related_docs에는 파일명만 포함 (경로 제외, .md 포함)
- 관련 문서가 없으면 빈 배열
- 자기 자신은 포함하지 않음`;

  const response = await callOpenAI(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `다음 문서들의 관련성을 분석해주세요:\n${JSON.stringify(docSummaries, null, 2)}` },
    ],
    { temperature: 0.1, maxTokens: 4000 }
  );

  return parseJsonResponse(response, { fallback: [] });
}

/**
 * 메인 실행
 */
async function main() {
  console.log('🔗 교차 참조 자동 생성 시작...');
  if (IS_DRY_RUN) console.log('🧪 DRY RUN 모드');
  console.log('---');

  try {
    // 1. 문서 로드
    const documents = await loadAllDocuments({ wikiDir: WIKI_DIR, includeContent: true });
    console.log(`📚 ${documents.length}개 문서 로드됨`);

    if (documents.length < 2) {
      console.log('ℹ️ 교차 참조에 최소 2개 이상 문서가 필요합니다.');
      await setGitHubOutput({ has_changes: 'false', updated_count: '0' });
      return;
    }

    // 2. AI 관련성 분석
    console.log('🤖 AI 관련성 분석 중...');
    const relationships = await analyzeRelationships(documents);
    console.log(`✅ ${relationships.length}개 문서 분석 완료`);

    // 3. frontmatter 업데이트
    let updatedCount = 0;
    for (const rel of relationships) {
      if (!rel.related_docs || rel.related_docs.length === 0) continue;

      const doc = documents.find((d) => d.path === rel.path);
      if (!doc || !doc.rawContent) continue;

      const relatedDocsStr = `[${rel.related_docs.map((d) => `"${d}"`).join(', ')}]`;
      const updatedContent = updateFrontmatterField(doc.rawContent, 'related_docs', relatedDocsStr);

      if (updatedContent !== doc.rawContent && !IS_DRY_RUN) {
        await writeFile(doc.fullPath, updatedContent);
        updatedCount++;
        console.log(`   ✅ ${doc.path}: ${rel.related_docs.length}개 참조 추가`);
      }
    }

    // 4. AI History 기록
    if (!IS_DRY_RUN && updatedCount > 0) {
      await addAIHistoryEntry({
        actionType: 'cross_reference',
        issueNumber: null,
        issueTitle: '교차 참조 업데이트',
        documentSlug: '_cross-reference',
        documentTitle: '교차 참조 업데이트',
        summary: `${updatedCount}개 문서의 교차 참조 업데이트`,
        trigger: 'scheduled',
        model: getOpenAIConfig().model,
      });
    }

    // 5. GitHub Actions 출력
    await setGitHubOutput({
      has_changes: updatedCount > 0 ? 'true' : 'false',
      updated_count: String(updatedCount),
    });

    console.log('---');
    console.log(`🎉 교차 참조 업데이트 완료: ${updatedCount}개 문서`);
  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
