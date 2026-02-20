#!/usr/bin/env node

/**
 * 뉴스 인텔리전스 시스템
 *
 * euno.news RSS를 스캔하여 기존 Wiki 문서와 관련된 기술 뉴스를 감지하고
 * 문서 업데이트/생성 Issue를 자동 생성하는 5단계 파이프라인.
 *
 * Stage 1: RSS 스캔 + GUID 북마크 (신규 아이템만 추출)
 * Stage 2: 키워드 사전필터 (AI 비용 절감)
 * Stage 3: AI 관련성 분석 (배치)
 * Stage 4: 원본 출처 연구 (euno 페이지 + 원문)
 * Stage 5: AI 액션 계획 + Issue 생성
 *
 * 트리거: 4시간마다 (news-intelligence.yml)
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { resolve, join } from 'path';
import { existsSync } from 'fs';
import { callOpenAI, parseJsonResponse } from '../lib/utils.js';
import { saveReport, createGitHubIssues, getExistingIssues } from '../lib/report-generator.js';
import { loadAllDocuments, getDocumentSummaries } from '../lib/document-scanner.js';
import { fetchPageContent } from '../lib/web-fetcher.js';
import { addAIHistoryEntry } from '../lib/ai-history.js';
import {
  EUNO_RSS_URL,
  EUNO_BASE_URL,
  NEWS_RSS_MAX_ITEMS,
  NEWS_BOOKMARK_WINDOW,
  NEWS_MAX_AI_BATCH,
  NEWS_RELEVANCE_THRESHOLD,
  NEWS_MAX_ISSUES,
  NEWS_MAX_SOURCE_FETCH,
  NEWS_FETCH_TIMEOUT,
  NEWS_BOOKMARK_FILE,
  NEWS_REPORT_FILE,
} from './config.js';

const IS_DRY_RUN = process.env.DRY_RUN === 'true';
const DATA_DIR = resolve(process.cwd(), 'public', 'data');
const BOOKMARK_PATH = join(DATA_DIR, NEWS_BOOKMARK_FILE);

/** 고정 키워드 풀 (Wiki 관련 기술 토픽) */
const FIXED_KEYWORDS = [
  'kubernetes', 'k8s', 'docker', 'container', 'devops',
  'github', 'gitlab', 'ci/cd', 'cicd',
  'bun', 'deno', 'node', 'nodejs',
  'react', 'vue', 'angular', 'svelte', 'nextjs', 'next.js',
  'ai', 'llm', 'gpt', 'claude', 'openai', 'anthropic', 'gemini',
  'typescript', 'javascript', 'python', 'rust', 'go', 'golang',
  'cloud', 'aws', 'azure', 'gcp',
  'security', 'cve', 'vulnerability',
  'linux', 'ubuntu', 'kernel',
  'api', 'rest', 'graphql', 'grpc',
  'database', 'postgresql', 'mysql', 'redis', 'mongodb',
  'terraform', 'ansible', 'helm',
  'microservice', 'serverless', 'edge',
  'wasm', 'webassembly',
  'vite', 'webpack', 'esbuild',
  'git', 'open source', 'opensource',
];

/* ===================================================================
 * Stage 1: RSS 스캔 + GUID 북마크
 * =================================================================== */

/** euno.news RSS XML 파싱 (guid 추출 포함) */
function parseEunoRSSItems(xml, maxItems = NEWS_RSS_MAX_ITEMS) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null && items.length < maxItems) {
    const itemXml = match[1];
    const title = itemXml.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
      ?.replace(/<!\[CDATA\[|\]\]>/g, '').trim() || '';
    const link = itemXml.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1]?.trim() || '';
    const guid = itemXml.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i)?.[1]?.trim() || link;
    const pubDate = itemXml.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1]?.trim() || '';

    let description = itemXml.match(/<description[^>]*>([\s\S]*?)<\/description>/i)?.[1]
      ?.replace(/<!\[CDATA\[|\]\]>/g, '') || '';
    // 루프 기반 HTML 태그 제거
    let prevDesc;
    do {
      prevDesc = description;
      description = description.replace(/<script\b[^>]*>[\s\S]*?<\/script[^>]*>/gi, '');
      description = description.replace(/<style\b[^>]*>[\s\S]*?<\/style[^>]*>/gi, '');
      description = description.replace(/<[^>]+>/g, '');
    } while (description !== prevDesc);
    description = description.trim().slice(0, 500);

    if (title) {
      items.push({ title, link, guid, pubDate, description });
    }
  }

  return items;
}

/** 북마크 파일 로드 */
async function loadBookmark() {
  if (!existsSync(BOOKMARK_PATH)) {
    return {
      lastScanAt: null,
      lastProcessedPubDate: null,
      stats: { totalScanned: 0, totalRelevant: 0, totalIssuesCreated: 0, totalSkipped: 0, lastRunStats: {} },
      processedGuids: [],
    };
  }
  try {
    return JSON.parse(await readFile(BOOKMARK_PATH, 'utf-8'));
  } catch {
    console.warn('⚠️ 북마크 파일 파싱 실패, 초기화');
    return {
      lastScanAt: null,
      lastProcessedPubDate: null,
      stats: { totalScanned: 0, totalRelevant: 0, totalIssuesCreated: 0, totalSkipped: 0, lastRunStats: {} },
      processedGuids: [],
    };
  }
}

/** 북마크 파일 저장 */
async function saveBookmark(bookmark) {
  if (IS_DRY_RUN) {
    console.log('🏜️ DRY_RUN: 북마크 저장 건너뜀');
    return;
  }
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }
  await writeFile(BOOKMARK_PATH, JSON.stringify(bookmark, null, 2), 'utf-8');
}

/** Stage 1: RSS fetch + GUID 기반 신규 아이템 필터링 */
async function scanRSSAndFilter() {
  console.log('\n📡 [Stage 1] RSS 스캔 + GUID 북마크...');

  // RSS fetch
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), NEWS_FETCH_TIMEOUT);

  let xml;
  try {
    const response = await fetch(EUNO_RSS_URL, {
      signal: controller.signal,
      headers: { 'User-Agent': 'SEPilot-WikiBot/1.0 (News Intelligence)' },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`RSS fetch 실패: HTTP ${response.status}`);
    }
    xml = await response.text();
  } catch (error) {
    clearTimeout(timeoutId);
    throw new Error(`RSS 수집 실패: ${error.message}`);
  }

  const allItems = parseEunoRSSItems(xml);
  console.log(`   RSS 파싱: ${allItems.length}개 아이템`);

  // 북마크 기반 필터
  const bookmark = await loadBookmark();
  const processedSet = new Set(bookmark.processedGuids);
  const newItems = allItems.filter(item => !processedSet.has(item.guid));

  // 북마크 업데이트: 새 GUID 추가 (롤링 윈도우)
  const newGuids = newItems.map(item => item.guid);
  bookmark.processedGuids = [...newGuids, ...bookmark.processedGuids].slice(0, NEWS_BOOKMARK_WINDOW);
  bookmark.lastScanAt = new Date().toISOString();
  if (newItems.length > 0 && newItems[0].pubDate) {
    bookmark.lastProcessedPubDate = newItems[0].pubDate;
  }

  console.log(`   신규 아이템: ${newItems.length}개 (기존 처리됨: ${allItems.length - newItems.length}개)`);

  return { newItems, bookmark, totalScanned: allItems.length };
}

/* ===================================================================
 * Stage 2: 키워드 사전필터 (AI 없음)
 * =================================================================== */

/** Stage 2: Wiki 태그 + 고정 키워드로 빠른 필터 */
function prefilterByKeywords(items, documents) {
  console.log('\n🔑 [Stage 2] 키워드 사전필터...');

  // Wiki 문서 태그에서 동적 키워드 추출
  const docTags = new Set();
  for (const doc of documents) {
    if (doc.tags) {
      for (const tag of doc.tags) {
        docTags.add(tag.toLowerCase());
      }
    }
  }

  const allKeywords = [...new Set([...FIXED_KEYWORDS, ...docTags])];

  const filtered = items.filter(item => {
    const text = `${item.title} ${item.description}`.toLowerCase();
    return allKeywords.some(kw => text.includes(kw));
  });

  // 최대 배치 크기 제한
  const result = filtered.slice(0, NEWS_MAX_AI_BATCH);
  console.log(`   키워드 매칭: ${filtered.length}개 (전체 ${items.length}개 중)`);
  if (filtered.length > NEWS_MAX_AI_BATCH) {
    console.log(`   배치 제한 적용: ${NEWS_MAX_AI_BATCH}개로 제한`);
  }

  return result;
}

/* ===================================================================
 * Stage 3: AI 관련성 분석 (배치)
 * =================================================================== */

/** Stage 3: AI로 관련성 분석 */
async function analyzeRelevance(items, documents) {
  console.log('\n🤖 [Stage 3] AI 관련성 분석...');

  if (items.length === 0) {
    console.log('   분석할 아이템 없음');
    return [];
  }

  const docSummaries = getDocumentSummaries(documents);
  const docList = docSummaries
    .map(d => `- ${d.path}: "${d.title}" [태그: ${(d.tags || []).join(', ')}]`)
    .join('\n');

  const itemsList = items
    .map((item, i) => `[${i}] "${item.title}" - ${item.description}`)
    .join('\n');

  const systemPrompt = `당신은 기술 Wiki 큐레이터입니다.
기존 Wiki 문서 목록:
${docList || '(문서 없음)'}

각 뉴스에 대해 JSON 배열로 응답하세요:
[
  {
    "index": 0,
    "relevanceScore": 0-100,
    "relatedDocuments": ["관련 기존 문서 slug"],
    "keyTopics": ["핵심 토픽 2-3개"],
    "needsSourceFetch": true/false,
    "briefReason": "판단 근거 (한 줄)"
  }
]

점수 기준:
- 80+: 기존 문서에 직접 관련된 중요 업데이트
- 65-79: 유용한 정보, 기존 문서 보강 가능
- 65 미만: Wiki와 관련성 낮음

중요: "기존 문서 업데이트"가 "새 문서 생성"보다 항상 우선입니다.
needsSourceFetch: euno 요약만으로 내용이 부족하면 true`;

  const response = await callOpenAI(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `다음 뉴스 항목들을 분석하세요:\n\n${itemsList}` },
    ],
    { temperature: 0.1, maxTokens: 4000, responseFormat: 'json_object' },
  );

  const parsed = parseJsonResponse(response, { fallback: [], silent: false });
  const results = Array.isArray(parsed) ? parsed : parsed.items || parsed.results || parsed.analyses || [];

  // 임계값 필터 + 원본 아이템 병합
  const relevant = results
    .filter(r => r.relevanceScore >= NEWS_RELEVANCE_THRESHOLD)
    .map(r => ({
      ...items[r.index],
      ...r,
      originalIndex: r.index,
    }))
    .sort((a, b) => b.relevanceScore - a.relevanceScore);

  console.log(`   관련 아이템: ${relevant.length}개 (임계값 ${NEWS_RELEVANCE_THRESHOLD}점 이상)`);
  for (const item of relevant) {
    console.log(`   - [${item.relevanceScore}점] ${item.title}`);
  }

  return relevant;
}

/* ===================================================================
 * Stage 4: 원본 출처 연구
 * =================================================================== */

/** euno 기사 페이지에서 원문 URL 추출 */
function extractSourceUrl(content) {
  if (!content) return null;

  // 전략 1: "원문 보기" 근처 URL 매칭
  const sourcePatterns = [
    /원문\s*보기[^"'<]*?(?:href=["']|:\s*)(https?:\/\/[^\s"'<>]+)/i,
    /원문\s*(?:링크|URL|주소)[^"'<]*?(?:href=["']|:\s*)(https?:\/\/[^\s"'<>]+)/i,
    /<a[^>]*href=["'](https?:\/\/[^\s"'<>]+)["'][^>]*>\s*원문\s*보기/i,
    /<a[^>]*href=["'](https?:\/\/[^\s"'<>]+)["'][^>]*>\s*원문/i,
  ];

  for (const pattern of sourcePatterns) {
    const match = content.match(pattern);
    if (match?.[1] && !match[1].includes('euno.news')) {
      return match[1];
    }
  }

  // 전략 2: JSON-LD의 isBasedOn / sameAs
  const jsonLdMatch = content.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
  if (jsonLdMatch) {
    try {
      const ld = JSON.parse(jsonLdMatch[1]);
      if (ld.isBasedOn) return typeof ld.isBasedOn === 'string' ? ld.isBasedOn : ld.isBasedOn.url;
      if (ld.sameAs) return typeof ld.sameAs === 'string' ? ld.sameAs : ld.sameAs[0];
    } catch { /* 파싱 실패 무시 */ }
  }

  return null;
}

/** Stage 4: 관련 아이템의 원본 출처 fetch */
async function researchSources(relevantItems) {
  console.log('\n🔎 [Stage 4] 원본 출처 연구...');

  let fetchCount = 0;
  const enriched = [];

  for (const item of relevantItems) {
    const enrichedItem = { ...item, sourceUrl: null, sourceContent: null, eunoContent: null };

    // euno 기사 페이지 fetch
    if (item.link && fetchCount < NEWS_MAX_SOURCE_FETCH) {
      try {
        const eunoPage = await fetchPageContent(item.link);
        if (eunoPage) {
          enrichedItem.eunoContent = eunoPage.content;
          fetchCount++;

          // 원문 URL 추출 시도 (raw HTML이 필요하므로 별도 fetch)
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), NEWS_FETCH_TIMEOUT);
          try {
            const rawResponse = await fetch(item.link, {
              signal: controller.signal,
              headers: { 'User-Agent': 'SEPilot-WikiBot/1.0 (News Intelligence)' },
            });
            clearTimeout(timeoutId);
            if (rawResponse.ok) {
              const rawHtml = await rawResponse.text();
              enrichedItem.sourceUrl = extractSourceUrl(rawHtml);
            }
          } catch {
            clearTimeout(timeoutId);
          }
        }
      } catch (error) {
        console.warn(`   ⚠️ euno 페이지 fetch 실패: ${error.message}`);
      }
    }

    // 원본 사이트 fetch (내용 부족 또는 needsSourceFetch)
    if (enrichedItem.sourceUrl && fetchCount < NEWS_MAX_SOURCE_FETCH) {
      const eunoLen = (enrichedItem.eunoContent || '').length;
      if (item.needsSourceFetch || eunoLen < 500) {
        try {
          const sourcePage = await fetchPageContent(enrichedItem.sourceUrl);
          if (sourcePage) {
            enrichedItem.sourceContent = sourcePage.content;
            fetchCount++;
          }
        } catch (error) {
          console.warn(`   ⚠️ 원본 사이트 fetch 실패: ${error.message}`);
        }
      }
    }

    enriched.push(enrichedItem);
    console.log(`   ${enrichedItem.sourceUrl ? '🔗' : '📄'} ${item.title.slice(0, 50)}${enrichedItem.sourceUrl ? ` → ${enrichedItem.sourceUrl.slice(0, 60)}` : ''}`);
  }

  console.log(`   소스 fetch: ${fetchCount}건 완료`);
  return enriched;
}

/* ===================================================================
 * Stage 5: AI 액션 계획 + Issue 생성
 * =================================================================== */

/** Stage 5: 액션 계획 수립 + Issue 생성 */
async function planActionsAndCreateIssues(enrichedItems, documents) {
  console.log('\n📋 [Stage 5] AI 액션 계획 + Issue 생성...');

  if (enrichedItems.length === 0) {
    console.log('   액션 대상 아이템 없음');
    return { actions: [], issuesCreated: 0 };
  }

  const docSummaries = getDocumentSummaries(documents);
  const docList = docSummaries
    .map(d => `- ${d.path}: "${d.title}" [${d.wordCount}자, 태그: ${(d.tags || []).join(', ')}]`)
    .join('\n');

  const itemsList = enrichedItems
    .map((item, i) => {
      const content = item.sourceContent || item.eunoContent || item.description;
      return `[${i}] "${item.title}"
  관련도: ${item.relevanceScore}/100
  관련문서: ${(item.relatedDocuments || []).join(', ')}
  토픽: ${(item.keyTopics || []).join(', ')}
  원문URL: ${item.sourceUrl || '없음'}
  내용요약: ${(content || '').slice(0, 300)}`;
    })
    .join('\n\n');

  const systemPrompt = `당신은 기술 Wiki 콘텐츠 전략가입니다.

기존 Wiki 문서 목록:
${docList || '(문서 없음)'}

액션 결정 원칙 (중요도 순서):
1. update_existing (최우선): 기존 문서에 새 정보 추가/보강
2. new_document (보조): 기존 문서로 다룰 수 없는 완전히 새로운 주제만
3. skip: 정보 가치 낮거나 이미 충분히 다뤄진 내용

JSON 배열로 응답하세요:
[
  {
    "index": 0,
    "action": "update_existing" | "new_document" | "skip",
    "targetSlug": "wiki/path/to/document.md (update_existing 시)",
    "suggestedTitle": "제안 제목",
    "reason": "액션 결정 근거",
    "updateSections": ["추가/수정할 섹션 제안"],
    "priority": "high" | "medium" | "low"
  }
]`;

  const response = await callOpenAI(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `다음 뉴스 항목들에 대한 액션을 결정하세요:\n\n${itemsList}` },
    ],
    { temperature: 0.1, maxTokens: 4000, responseFormat: 'json_object' },
  );

  const parsed = parseJsonResponse(response, { fallback: [], silent: false });
  const actions = Array.isArray(parsed) ? parsed : parsed.items || parsed.actions || parsed.results || [];

  // skip 제외, update_existing 우선 정렬
  const actionable = actions
    .filter(a => a.action !== 'skip')
    .sort((a, b) => {
      // update_existing을 new_document보다 우선
      if (a.action === 'update_existing' && b.action !== 'update_existing') return -1;
      if (a.action !== 'update_existing' && b.action === 'update_existing') return 1;
      // 같은 타입이면 priority 순
      const pOrder = { high: 0, medium: 1, low: 2 };
      return (pOrder[a.priority] || 1) - (pOrder[b.priority] || 1);
    })
    .slice(0, NEWS_MAX_ISSUES);

  console.log(`   액션 계획: ${actionable.length}건 (${actions.filter(a => a.action === 'skip').length}건 skip)`);

  // Issue 생성
  let issuesCreated = 0;

  if (actionable.length > 0 && !IS_DRY_RUN) {
    const existingIssueTitles = await getExistingIssues('news-intelligence');

    for (const action of actionable) {
      const item = enrichedItems[action.index];
      if (!item) continue;

      const isUpdate = action.action === 'update_existing';
      const prefix = isUpdate ? '[업데이트]' : '[요청]';
      const issueTitle = `${prefix} ${action.suggestedTitle || item.title}`;

      // 중복 확인
      if (existingIssueTitles.includes(issueTitle.toLowerCase())) {
        console.log(`   ⏭️ 중복 Issue 건너뜀: ${issueTitle}`);
        continue;
      }

      const labels = isUpdate
        ? ['update-request', 'auto-detected', 'news-intelligence']
        : ['request', 'auto-detected', 'news-intelligence'];

      const issueBody = buildIssueBody(item, action, isUpdate);

      try {
        const issues = await createGitHubIssues([
          { title: issueTitle, body: issueBody, labels },
        ]);

        if (issues.length > 0) {
          action.issueNumber = issues[0].number;
          action.issueUrl = issues[0].url;
          issuesCreated++;
          console.log(`   ✅ Issue #${issues[0].number}: ${issueTitle}`);
        }
      } catch (error) {
        console.warn(`   ⚠️ Issue 생성 실패: ${error.message}`);
      }
    }
  } else if (IS_DRY_RUN && actionable.length > 0) {
    console.log('   🏜️ DRY_RUN: Issue 생성 건너뜀');
    for (const action of actionable) {
      const item = enrichedItems[action.index];
      console.log(`   - [${action.action}] ${action.suggestedTitle || item?.title}`);
    }
  }

  return { actions: actionable, issuesCreated };
}

/** Issue 본문 생성 */
function buildIssueBody(item, action, isUpdate) {
  const sections = [
    '> 📰 자동 감지: 뉴스 인텔리전스 (euno.news)',
    '',
    `**출처**: [euno.news](${item.link})`,
  ];

  if (item.sourceUrl) {
    sections.push(`**원본**: [원문 보기](${item.sourceUrl})`);
  }

  sections.push(
    `**관련도**: ${item.relevanceScore}/100`,
    `**핵심 토픽**: ${(item.keyTopics || []).join(', ')}`,
  );

  if (isUpdate && action.targetSlug) {
    sections.push(
      '',
      '## 업데이트 대상 문서',
      `**경로**: \`${action.targetSlug}\``,
    );
  }

  if (action.updateSections && action.updateSections.length > 0) {
    sections.push(
      '',
      '## 업데이트 제안 섹션',
      ...action.updateSections.map(s => `- ${s}`),
    );
  }

  sections.push(
    '',
    '## 뉴스 요약',
    item.description || '(요약 없음)',
  );

  // 보강된 내용이 있으면 추가
  const extraContent = item.sourceContent || item.eunoContent;
  if (extraContent && extraContent.length > item.description.length + 100) {
    sections.push(
      '',
      '## 상세 내용',
      extraContent.slice(0, 1000),
    );
  }

  sections.push(
    '',
    '## 판단 근거',
    action.reason || item.briefReason || '(근거 없음)',
  );

  return sections.join('\n');
}

/* ===================================================================
 * 메인 실행
 * =================================================================== */

async function main() {
  console.log('📰 뉴스 인텔리전스 시작...');
  console.log(`   RSS: ${EUNO_RSS_URL}`);
  console.log(`   DRY_RUN: ${IS_DRY_RUN}`);

  const startTime = Date.now();

  // Stage 1: RSS 스캔 + GUID 북마크
  const { newItems, bookmark, totalScanned } = await scanRSSAndFilter();

  if (newItems.length === 0) {
    console.log('\n✅ 신규 아이템 없음, 종료');
    bookmark.stats.lastRunStats = {
      scannedAt: new Date().toISOString(),
      totalScanned,
      newItems: 0,
      prefiltered: 0,
      relevant: 0,
      issuesCreated: 0,
      durationMs: Date.now() - startTime,
    };
    await saveBookmark(bookmark);
    await saveReport(NEWS_REPORT_FILE, {
      generatedAt: new Date().toISOString(),
      summary: { totalScanned, newItems: 0, prefiltered: 0, relevant: 0, issuesCreated: 0 },
      items: [],
    });
    return;
  }

  // 문서 목록 로드 (Stage 2, 3, 5에서 공용)
  const documents = await loadAllDocuments({ includeContent: false });
  console.log(`\n📚 Wiki 문서: ${documents.length}개 로드`);

  // Stage 2: 키워드 사전필터
  const prefiltered = prefilterByKeywords(newItems, documents);

  // Stage 3: AI 관련성 분석
  const relevant = await analyzeRelevance(prefiltered, documents);

  // Stage 4: 원본 출처 연구
  const enriched = await researchSources(relevant);

  // Stage 5: 액션 계획 + Issue 생성
  const { actions, issuesCreated } = await planActionsAndCreateIssues(enriched, documents);

  // 북마크 통계 업데이트
  const runStats = {
    scannedAt: new Date().toISOString(),
    totalScanned,
    newItems: newItems.length,
    prefiltered: prefiltered.length,
    relevant: relevant.length,
    issuesCreated,
    durationMs: Date.now() - startTime,
  };

  bookmark.stats.totalScanned += totalScanned;
  bookmark.stats.totalRelevant += relevant.length;
  bookmark.stats.totalIssuesCreated += issuesCreated;
  bookmark.stats.totalSkipped += (newItems.length - prefiltered.length);
  bookmark.stats.lastRunStats = runStats;

  await saveBookmark(bookmark);

  // 보고서 저장
  await saveReport(NEWS_REPORT_FILE, {
    generatedAt: new Date().toISOString(),
    config: {
      rssUrl: EUNO_RSS_URL,
      maxAiBatch: NEWS_MAX_AI_BATCH,
      relevanceThreshold: NEWS_RELEVANCE_THRESHOLD,
      maxIssues: NEWS_MAX_ISSUES,
    },
    summary: runStats,
    items: enriched.map(item => ({
      title: item.title,
      link: item.link,
      guid: item.guid,
      relevanceScore: item.relevanceScore,
      relatedDocuments: item.relatedDocuments,
      keyTopics: item.keyTopics,
      sourceUrl: item.sourceUrl,
    })),
    actions: actions.map(a => ({
      action: a.action,
      targetSlug: a.targetSlug,
      suggestedTitle: a.suggestedTitle,
      priority: a.priority,
      issueNumber: a.issueNumber || null,
    })),
  });

  // AI History 기록
  await addAIHistoryEntry({
    actionType: 'maintain',
    issueNumber: null,
    issueTitle: '뉴스 인텔리전스',
    documentSlug: null,
    documentTitle: null,
    summary: `뉴스 인텔리전스: ${totalScanned}건 스캔, ${newItems.length}건 신규, ${relevant.length}건 관련, ${issuesCreated}건 Issue 생성`,
    trigger: 'scheduled',
  });

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✅ 뉴스 인텔리전스 완료 (${duration}초)`);
  console.log(`   스캔: ${totalScanned}건, 신규: ${newItems.length}건, 필터: ${prefiltered.length}건`);
  console.log(`   관련: ${relevant.length}건, Issue 생성: ${issuesCreated}건`);
}

main().catch((error) => {
  console.error('❌ 뉴스 인텔리전스 실패:', error.message);
  process.exit(1);
});
