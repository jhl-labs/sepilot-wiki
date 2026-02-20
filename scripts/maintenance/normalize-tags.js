#!/usr/bin/env node

/**
 * 태그 정규화 스크립트
 * 중복 태그 통합, 누락 태그 추천, 태그 분류 체계 생성
 *
 * 동작: 기존 wiki-tree-maintainer.yml에 step으로 추가
 * 출력: public/data/tag-taxonomy.json, frontmatter 태그 업데이트
 */

import { resolve } from 'path';
import { writeFile } from 'fs/promises';
import { loadAllDocuments } from '../lib/document-scanner.js';
import { callOpenAI, parseJsonResponse, getOpenAIConfig, setGitHubOutput } from '../lib/utils.js';
import { updateFrontmatterField } from '../lib/frontmatter.js';
import { addAIHistoryEntry } from '../lib/ai-history.js';
import { saveReport } from '../lib/report-generator.js';

const WIKI_DIR = resolve(process.cwd(), 'wiki');
const IS_DRY_RUN = process.env.DRY_RUN === 'true';

/**
 * 현재 태그 통계 수집
 */
function collectTagStats(documents) {
  const tagMap = {};

  for (const doc of documents) {
    const tags = doc.tags;
    if (!tags || tags.length === 0) continue;

    const tagList = Array.isArray(tags) ? tags : [tags];
    for (const tag of tagList) {
      const normalizedTag = tag.trim().toLowerCase();
      if (!normalizedTag) continue;

      if (!tagMap[normalizedTag]) {
        tagMap[normalizedTag] = {
          original: tag.trim(),
          count: 0,
          documents: [],
        };
      }
      tagMap[normalizedTag].count++;
      tagMap[normalizedTag].documents.push(doc.path);
    }
  }

  return tagMap;
}

/**
 * AI를 사용하여 태그 정규화 분석
 */
async function analyzeTagNormalization(tagStats, documents) {
  const systemPrompt = `당신은 Wiki 태그 관리 전문가입니다.
주어진 태그 목록과 문서를 분석하여 태그 정규화를 수행합니다.

## 출력 형식 (JSON)
{
  "merges": [
    {
      "target": "유지할 태그",
      "sources": ["통합할 태그1", "통합할 태그2"],
      "reason": "통합 이유"
    }
  ],
  "suggestions": [
    {
      "document": "문서 경로",
      "currentTags": ["현재 태그"],
      "suggestedTags": ["추천 태그"],
      "reason": "추천 이유"
    }
  ],
  "taxonomy": {
    "카테고리명": ["해당 태그들"]
  }
}

## 규칙
- 유사한 태그(예: 'k8s'와 'kubernetes')는 하나로 통합
- 대소문자 통일 (소문자 기본)
- 불필요한 태그 제거 제안
- 문서별 태그 누락 시 추천 (최대 5개/문서)
- taxonomy는 태그를 카테고리별로 분류`;

  const docsForContext = documents.map((d) => ({
    path: d.path,
    title: d.title,
    tags: d.tags,
    preview: d.content ? d.content.slice(0, 200) : '',
  }));

  const response = await callOpenAI(
    [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `현재 태그 통계:\n${JSON.stringify(tagStats, null, 2)}\n\n문서 목록:\n${JSON.stringify(docsForContext, null, 2)}`,
      },
    ],
    { temperature: 0.1, maxTokens: 4000, responseFormat: 'json_object' }
  );

  return parseJsonResponse(response, {
    fallback: { merges: [], suggestions: [], taxonomy: {} },
  });
}

/**
 * 메인 실행
 */
async function main() {
  console.log('🏷️ 태그 정규화 시작...');
  if (IS_DRY_RUN) console.log('🧪 DRY RUN 모드');
  console.log('---');

  try {
    // 1. 문서 로드
    const documents = await loadAllDocuments({ wikiDir: WIKI_DIR, includeContent: true });
    console.log(`📚 ${documents.length}개 문서 로드됨`);

    // 2. 태그 통계 수집
    const tagStats = collectTagStats(documents);
    const uniqueTags = Object.keys(tagStats).length;
    console.log(`🏷️ 고유 태그: ${uniqueTags}개`);

    if (uniqueTags === 0) {
      console.log('ℹ️ 태그가 없습니다.');
      await setGitHubOutput({ has_changes: 'false' });
      return;
    }

    // 3. AI 분석
    console.log('🤖 AI 태그 분석 중...');
    const analysis = await analyzeTagNormalization(tagStats, documents);

    // 4. 태그 통합 적용
    let updatedCount = 0;

    for (const merge of analysis.merges || []) {
      for (const doc of documents) {
        if (!doc.tags || !Array.isArray(doc.tags)) continue;

        let changed = false;
        let newTags = [...doc.tags];

        for (const source of merge.sources) {
          const idx = newTags.findIndex((t) => t.toLowerCase() === source.toLowerCase());
          if (idx >= 0) {
            newTags[idx] = merge.target;
            changed = true;
          }
        }

        // 중복 제거
        newTags = [...new Set(newTags)];

        if (changed && !IS_DRY_RUN) {
          const tagsStr = `[${newTags.map((t) => `"${t}"`).join(', ')}]`;
          const updatedContent = updateFrontmatterField(doc.rawContent, 'tags', tagsStr);
          await writeFile(doc.fullPath, updatedContent);
          updatedCount++;
        }
      }
    }

    // 5. 태그 추천 적용 (suggestion)
    for (const suggestion of analysis.suggestions || []) {
      const doc = documents.find((d) => d.path === suggestion.document);
      if (!doc || !doc.rawContent) continue;

      const suggestedTags = suggestion.suggestedTags || [];
      if (suggestedTags.length === 0) continue;

      const currentTags = Array.isArray(doc.tags) ? doc.tags : [];
      const mergedTags = [...new Set([...currentTags, ...suggestedTags])];

      if (mergedTags.length > currentTags.length && !IS_DRY_RUN) {
        const tagsStr = `[${mergedTags.map((t) => `"${t}"`).join(', ')}]`;
        const updatedContent = updateFrontmatterField(doc.rawContent, 'tags', tagsStr);
        await writeFile(doc.fullPath, updatedContent);
        updatedCount++;
      }
    }

    console.log(`📝 ${updatedCount}개 문서 태그 업데이트`);

    // 6. 태그 분류 체계 저장
    const taxonomy = {
      generatedAt: new Date().toISOString(),
      model: getOpenAIConfig().model,
      totalTags: uniqueTags,
      merges: analysis.merges || [],
      suggestions: analysis.suggestions || [],
      taxonomy: analysis.taxonomy || {},
      tagStats: Object.entries(tagStats).map(([tag, info]) => ({
        tag: info.original,
        count: info.count,
        documents: info.documents,
      })),
    };

    await saveReport('tag-taxonomy.json', taxonomy);

    // 7. AI History 기록
    if (!IS_DRY_RUN && updatedCount > 0) {
      await addAIHistoryEntry({
        actionType: 'tag_normalize',
        issueNumber: null,
        issueTitle: '태그 정규화',
        documentSlug: '_tag-normalize',
        documentTitle: '태그 정규화',
        summary: `태그 정규화: ${updatedCount}개 문서 업데이트, ${(analysis.merges || []).length}개 통합`,
        trigger: 'scheduled',
        model: getOpenAIConfig().model,
      });
    }

    // 8. GitHub Actions 출력
    await setGitHubOutput({
      has_changes: updatedCount > 0 ? 'true' : 'false',
      updated_count: String(updatedCount),
      total_tags: String(uniqueTags),
    });

    console.log('---');
    console.log('🎉 태그 정규화 완료');
  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
