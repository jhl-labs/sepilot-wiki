/**
 * Tavily API 연동 모듈
 *
 * 웹 검색을 통해 주제 관련 최신 자료를 수집
 * TAVILY_API_KEY가 없으면 모든 함수가 빈 결과 반환 (graceful degradation)
 */

const TAVILY_API_URL = 'https://api.tavily.com/search';
const TAVILY_API_KEY = process.env.TAVILY_API_KEY || '';

/** 검색 타임아웃 (ms) */
const SEARCH_TIMEOUT = 15000;

/** 단일 검색당 최대 결과 수 */
const MAX_RESULTS_PER_QUERY = 5;

/**
 * Tavily API 검색 호출
 * @param {Object} options - 검색 옵션
 * @param {string} options.query - 검색 쿼리
 * @param {number} [options.maxResults=5] - 최대 결과 수
 * @param {string} [options.searchDepth='basic'] - 검색 깊이 ('basic' | 'advanced')
 * @param {boolean} [options.includeAnswer=false] - AI 생성 답변 포함 여부
 * @returns {Promise<Array<{url: string, title: string, content: string, score: number}>>}
 */
export async function searchTavily(options) {
  if (!TAVILY_API_KEY) {
    console.log('⏭️ Tavily API 키가 없어 검색을 건너뜁니다.');
    return [];
  }

  const {
    query,
    maxResults = MAX_RESULTS_PER_QUERY,
    searchDepth = 'basic',
    includeAnswer = false,
  } = options;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SEARCH_TIMEOUT);

    const response = await fetch(TAVILY_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query,
        max_results: maxResults,
        search_depth: searchDepth,
        include_answer: includeAnswer,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`⚠️ Tavily API 오류 (${response.status}): ${errorText}`);
      return [];
    }

    const data = await response.json();

    return (data.results || []).map((r) => ({
      url: r.url,
      title: r.title,
      content: r.content,
      score: r.score || 0,
    }));
  } catch (error) {
    const message = error.name === 'AbortError' ? '타임아웃' : error.message;
    console.warn(`⚠️ Tavily 검색 실패 (${message}): ${query}`);
    return [];
  }
}

/**
 * 주제 기반 다각도 검색
 * 하나의 주제에 대해 여러 관점(정의, 비교, 실습)의 쿼리를 생성하여 검색
 *
 * @param {string} topic - 검색 주제
 * @param {number} [maxQueries=3] - 최대 쿼리 수
 * @returns {Promise<Array<{url: string, title: string, snippet: string}>>}
 */
export async function researchTopic(topic, maxQueries = 3) {
  if (!TAVILY_API_KEY) {
    console.log('⏭️ Tavily API 키가 없어 리서치를 건너뜁니다.');
    return [];
  }

  // 다각도 쿼리 생성
  const currentYear = new Date().getFullYear();
  const queries = [
    `${topic} 개요 설명`,
    `${topic} 실무 활용 사례 best practices`,
    `${topic} 최신 동향 ${currentYear - 1} ${currentYear}`,
  ].slice(0, maxQueries);

  console.log(`🔍 Tavily 리서치: "${topic}" (${queries.length}개 쿼리)`);

  const allResults = [];
  const seenUrls = new Set();

  for (const query of queries) {
    const results = await searchTavily({ query, maxResults: 3 });

    for (const result of results) {
      if (!seenUrls.has(result.url)) {
        seenUrls.add(result.url);
        allResults.push({
          url: result.url,
          title: result.title,
          snippet: (result.content || '').slice(0, 500),
        });
      }
    }
  }

  console.log(`   ✅ ${allResults.length}개 고유 소스 수집 완료`);
  return allResults;
}

/**
 * Tavily API 사용 가능 여부 확인
 * @returns {boolean}
 */
export function isTavilyAvailable() {
  return !!TAVILY_API_KEY;
}
