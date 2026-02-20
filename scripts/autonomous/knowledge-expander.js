#!/usr/bin/env node

/**
 * 지식 확장 (Knowledge Expander)
 *
 * 기존 Wiki 문서의 태그·관련문서·본문을 분석하여
 * 가지치기 확장이 가능한 새 주제를 발견하고 Issue를 생성
 *
 * 트리거: 주 1회 (autonomous-knowledge.yml)
 */

import { callOpenAI, parseJsonResponse } from '../lib/utils.js';
import { saveReport, createGitHubIssues, getExistingIssues } from '../lib/report-generator.js';
import { loadAllDocuments } from '../lib/document-scanner.js';
import { addAIHistoryEntry } from '../lib/ai-history.js';
import { MAX_AUTO_ISSUES, MAX_EXPANSION_SUGGESTIONS } from './config.js';

const IS_DRY_RUN = process.env.DRY_RUN === 'true';

/**
 * 지식 그래프 분석 — 태그 빈도, 연결 밀도, 카테고리 분포 계산
 * @param {Array} documents - loadAllDocuments 결과
 * @returns {{ tagFrequency: Object, connectionDensity: Object, categoryDistribution: Object, orphanDocs: Array, weakConnections: Array }}
 */
function buildKnowledgeGraph(documents) {
  const publishedDocs = documents.filter((d) => d.status === 'published');
  const slugSet = new Set(publishedDocs.map((d) => d.slug));

  // 태그 빈도
  const tagFrequency = {};
  for (const doc of publishedDocs) {
    for (const tag of doc.tags) {
      tagFrequency[tag] = (tagFrequency[tag] || 0) + 1;
    }
  }

  // 카테고리 분포
  const categoryDistribution = {};
  for (const doc of publishedDocs) {
    const category = doc.directory === '/' ? 'root' : doc.directory.split('/')[0];
    categoryDistribution[category] = (categoryDistribution[category] || 0) + 1;
  }

  // 연결 밀도 (related_docs 기반)
  const connectionDensity = {};
  for (const doc of publishedDocs) {
    const relatedDocs = doc.frontmatter?.related_docs || [];
    connectionDensity[doc.slug] = {
      outgoing: relatedDocs.length,
      incoming: 0,
    };
  }

  // incoming 연결 계산
  for (const doc of publishedDocs) {
    const relatedDocs = doc.frontmatter?.related_docs || [];
    for (const ref of relatedDocs) {
      if (connectionDensity[ref]) {
        connectionDensity[ref].incoming++;
      }
    }
  }

  // 고아 문서 (연결 없음)
  const orphanDocs = publishedDocs
    .filter((doc) => {
      const conn = connectionDensity[doc.slug];
      return conn && conn.outgoing === 0 && conn.incoming === 0;
    })
    .map((d) => d.slug);

  // 약한 연결 (나가는 연결만 있고 들어오는 연결 없음)
  const weakConnections = publishedDocs
    .filter((doc) => {
      const conn = connectionDensity[doc.slug];
      return conn && conn.outgoing > 0 && conn.incoming === 0;
    })
    .map((d) => d.slug);

  // 깨진 related_docs (존재하지 않는 slug 참조)
  const brokenRefs = [];
  for (const doc of publishedDocs) {
    const relatedDocs = doc.frontmatter?.related_docs || [];
    for (const ref of relatedDocs) {
      if (!slugSet.has(ref)) {
        brokenRefs.push({ from: doc.slug, to: ref });
      }
    }
  }

  return {
    tagFrequency,
    connectionDensity,
    categoryDistribution,
    orphanDocs,
    weakConnections,
    brokenRefs,
    totalPublished: publishedDocs.length,
  };
}

/**
 * AI에게 확장 주제 제안 받기
 * @param {Object} graph - buildKnowledgeGraph 결과
 * @param {Array} documents - 문서 목록
 * @returns {Promise<Array<{ topic: string, category: string, reason: string, suggestedTitle: string, relatedExisting: string[], priority: string }>>}
 */
async function suggestExpansionTopics(graph, documents) {
  const publishedDocs = documents.filter((d) => d.status === 'published');

  // 태그 빈도 상위 20개
  const topTags = Object.entries(graph.tagFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([tag, count]) => `${tag}(${count})`)
    .join(', ');

  // 카테고리별 문서 수
  const categoryInfo = Object.entries(graph.categoryDistribution)
    .map(([cat, count]) => `${cat}: ${count}개`)
    .join(', ');

  // 문서 목록 요약
  const docList = publishedDocs
    .map((d) => `- [${d.directory}] ${d.title} (tags: ${d.tags.join(', ')})`)
    .join('\n');

  const systemPrompt = `당신은 기술 Wiki의 지식 확장 전문가입니다.
기존 문서 목록과 지식 그래프 분석 결과를 바탕으로,
"가지치기" 확장이 가능한 새 문서 주제를 제안하세요.

제안 기준:
1. 기존 문서에서 자주 언급되지만 전용 문서가 없는 주제
2. 태그는 많이 사용되지만 관련 문서가 부족한 영역
3. 기존 문서의 하위 주제나 심화 내용
4. 연결이 약한 카테고리를 보강할 주제
5. 최신 기술 트렌드와 기존 문서의 교차점

JSON 배열로 응답 (최대 ${MAX_EXPANSION_SUGGESTIONS}개):
[{
  "topic": "주제 설명",
  "category": "ai|kubernetes|bun|projects",
  "reason": "이 주제가 필요한 이유",
  "suggestedTitle": "[요청] 문서 제목",
  "relatedExisting": ["관련 기존 문서 slug"],
  "priority": "high|medium"
}]`;

  const userPrompt = `## 지식 그래프 분석 결과

- 전체 문서 수: ${graph.totalPublished}개
- 카테고리 분포: ${categoryInfo}
- 주요 태그 (빈도순): ${topTags}
- 고아 문서 (연결 없음): ${graph.orphanDocs.length}개
- 약한 연결 문서: ${graph.weakConnections.length}개

## 기존 문서 목록
${docList}

위 분석을 바탕으로 확장 주제를 제안해주세요.`;

  const response = await callOpenAI(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    { temperature: 0.3, maxTokens: 4000, responseFormat: 'json_object' }
  );

  const parsed = parseJsonResponse(response, { fallback: [] });
  if (!parsed) return [];

  // 배열이 아닌 경우 배열 추출
  const suggestions = Array.isArray(parsed)
    ? parsed
    : parsed.suggestions || parsed.topics || parsed.items || [];

  return suggestions.slice(0, MAX_EXPANSION_SUGGESTIONS);
}

/** 메인 실행 */
async function main() {
  console.log('🌱 지식 확장 분석 시작...');

  // 1. 전체 문서 로드
  const documents = await loadAllDocuments({ includeContent: true });
  const publishedDocs = documents.filter((d) => d.status === 'published');
  console.log(`📚 로드 완료: 전체 ${documents.length}개, published ${publishedDocs.length}개`);

  if (publishedDocs.length === 0) {
    console.log('published 문서 없음, 종료');
    await saveReport('knowledge-expander-report.json', {
      generatedAt: new Date().toISOString(),
      suggestions: [],
      issuesCreated: 0,
    });
    return;
  }

  // 2. 지식 그래프 분석
  const graph = buildKnowledgeGraph(documents);
  console.log(`\n📊 지식 그래프 분석 완료:`);
  console.log(`   태그: ${Object.keys(graph.tagFrequency).length}종`);
  console.log(`   카테고리: ${Object.keys(graph.categoryDistribution).length}개`);
  console.log(`   고아 문서: ${graph.orphanDocs.length}개`);
  console.log(`   약한 연결: ${graph.weakConnections.length}개`);

  // 3. AI 확장 주제 제안
  console.log('\n🤖 AI 확장 주제 제안 요청 중...');
  const suggestions = await suggestExpansionTopics(graph, documents);
  console.log(`   제안 수: ${suggestions.length}개`);

  if (suggestions.length === 0) {
    console.log('확장 제안 없음, 종료');
    await saveReport('knowledge-expander-report.json', {
      generatedAt: new Date().toISOString(),
      graph: { totalPublished: graph.totalPublished, tags: Object.keys(graph.tagFrequency).length },
      suggestions: [],
      issuesCreated: 0,
    });
    return;
  }

  // 4. 중복 체크 및 Issue 생성
  let issuesCreated = 0;
  const createdIssues = [];

  if (!IS_DRY_RUN) {
    const existingIssueTitles = await getExistingIssues('request');

    // 우선순위 정렬 (high → medium)
    const sorted = suggestions.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1 };
      return (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2);
    });

    const candidates = sorted.slice(0, MAX_AUTO_ISSUES);

    for (const suggestion of candidates) {
      const issueTitle = suggestion.suggestedTitle || `[요청] ${suggestion.topic}`;

      // 중복 확인
      if (existingIssueTitles.some((t) => t.includes(issueTitle.toLowerCase()))) {
        console.log(`⏭️ 중복 건너뜀: ${issueTitle}`);
        continue;
      }

      const issueBody = [
        '> 🌱 자동 감지: 지식 확장 분석',
        '',
        `**카테고리**: ${suggestion.category}`,
        `**우선순위**: ${suggestion.priority}`,
        '',
        '## 제안 주제',
        suggestion.topic,
        '',
        '## 필요성',
        suggestion.reason,
        '',
        suggestion.relatedExisting?.length > 0
          ? `## 관련 기존 문서\n${suggestion.relatedExisting.map((s) => `- ${s}`).join('\n')}`
          : '',
      ]
        .filter(Boolean)
        .join('\n');

      try {
        const issues = await createGitHubIssues(
          [{ title: issueTitle, body: issueBody, labels: ['request', 'auto-detected'] }],
          { titlePrefix: '[Wiki Maintenance]', defaultLabels: ['request', 'auto-detected'] }
        );

        if (issues.length > 0) {
          createdIssues.push(issues[0]);
          issuesCreated++;
        }
      } catch (error) {
        console.warn(`⚠️ Issue 생성 실패: ${error.message}`);
      }
    }
  } else {
    console.log(`[DRY RUN] ${Math.min(suggestions.length, MAX_AUTO_ISSUES)}개 Issue 생성 건너뜀`);
    for (const s of suggestions.slice(0, MAX_AUTO_ISSUES)) {
      console.log(`  - ${s.suggestedTitle || s.topic} (${s.priority})`);
    }
  }

  // 5. 보고서 저장
  const report = {
    generatedAt: new Date().toISOString(),
    graph: {
      totalPublished: graph.totalPublished,
      tags: Object.keys(graph.tagFrequency).length,
      categories: graph.categoryDistribution,
      orphanDocs: graph.orphanDocs,
      weakConnections: graph.weakConnections,
      brokenRefs: graph.brokenRefs,
    },
    suggestions,
    summary: {
      totalSuggestions: suggestions.length,
      issuesCreated,
    },
  };

  await saveReport('knowledge-expander-report.json', report);

  // 6. AI History 기록
  await addAIHistoryEntry({
    actionType: 'maintain',
    issueNumber: null,
    issueTitle: '지식 확장 분석',
    documentSlug: null,
    documentTitle: null,
    summary: `지식 확장: ${graph.totalPublished}개 문서 분석, ${suggestions.length}개 제안, ${issuesCreated}개 Issue 생성`,
    trigger: 'scheduled',
  });

  console.log(`\n✅ 지식 확장 분석 완료`);
  console.log(`   분석 문서: ${graph.totalPublished}개, 제안: ${suggestions.length}개, Issue 생성: ${issuesCreated}개`);
}

main().catch((error) => {
  console.error('❌ 지식 확장 분석 실패:', error.message);
  process.exit(1);
});
