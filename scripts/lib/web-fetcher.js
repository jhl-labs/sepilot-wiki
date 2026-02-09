/**
 * 웹 페이지 콘텐츠 자동 수집 모듈
 *
 * Issue 참고 URL에서 실제 콘텐츠를 가져와 AI 프롬프트에 포함시키기 위한 유틸리티
 * 외부 의존성 없이 정규식 기반으로 HTML → 텍스트 변환
 */

/** URL당 최대 콘텐츠 길이 */
const MAX_CONTENT_LENGTH = 8000;

/** 최대 처리할 URL 수 */
const MAX_URLS = 5;

/** fetch 타임아웃 (ms) */
const FETCH_TIMEOUT = 10000;

/** 건너뛸 URL 패턴 */
const SKIP_PATTERNS = [
  /^https?:\/\/api\.github\.com/i,
  /\.(png|jpg|jpeg|gif|svg|webp|ico|bmp|mp4|mp3|wav|avi|mov|pdf|zip|tar|gz)(\?|$)/i,
];

/**
 * 텍스트에서 URL을 추출
 * @param {string} text - URL을 추출할 텍스트
 * @returns {string[]} 추출된 URL 배열 (중복 제거)
 */
export function extractUrls(text) {
  if (!text) return [];

  const urlPattern = /https?:\/\/[^\s<>"')\]]+/g;
  const matches = text.match(urlPattern) || [];

  // 중복 제거 및 후행 구두점 정리
  const cleaned = matches.map((url) => url.replace(/[.,;:!?)]+$/, ''));

  return [...new Set(cleaned)];
}

/**
 * URL이 건너뛸 대상인지 확인
 * @param {string} url
 * @returns {boolean}
 */
function shouldSkipUrl(url) {
  return SKIP_PATTERNS.some((pattern) => pattern.test(url));
}

/**
 * HTML에서 불필요한 태그를 제거하고 텍스트 추출
 * @param {string} html - 원본 HTML
 * @returns {string} 추출된 텍스트
 */
function htmlToText(html) {
  let content = html;

  // 우선 <main>, <article> 내부 콘텐츠 추출 시도
  const mainMatch = content.match(/<(?:main|article)[^>]*>([\s\S]*?)<\/(?:main|article)>/i);
  if (mainMatch && mainMatch[1].trim().length > 200) {
    content = mainMatch[1];
  }

  // script, style, nav, footer, header, aside 태그 제거
  content = content.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  content = content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  content = content.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '');
  content = content.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '');
  content = content.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '');
  content = content.replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '');

  // 블록 요소를 줄바꿈으로 변환
  content = content.replace(/<\/(?:p|div|h[1-6]|li|tr|br|blockquote|pre)[^>]*>/gi, '\n');
  content = content.replace(/<br\s*\/?>/gi, '\n');

  // 나머지 HTML 태그 제거
  content = content.replace(/<[^>]+>/g, '');

  // HTML 엔티티 디코딩
  content = content
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');

  // 연속 공백/줄바꿈 정리
  content = content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n');

  // 연속된 빈 줄 제거
  content = content.replace(/\n{3,}/g, '\n\n');

  return content.trim();
}

/**
 * HTML에서 <title> 태그의 내용을 추출
 * @param {string} html
 * @returns {string} 페이지 제목
 */
function extractTitle(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? match[1].replace(/<[^>]+>/g, '').trim() : '';
}

/**
 * URL의 웹 페이지를 가져와 텍스트로 변환
 * @param {string} url - 가져올 URL
 * @returns {Promise<{url: string, title: string, content: string} | null>}
 */
export async function fetchPageContent(url) {
  if (shouldSkipUrl(url)) {
    console.log(`   ⏭️ 건너뜀 (제외 대상): ${url}`);
    return null;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'SEPilot-WikiBot/1.0 (Reference Content Fetcher)',
        Accept: 'text/html,application/xhtml+xml,text/plain',
      },
      redirect: 'follow',
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`   ⚠️ HTTP ${response.status}: ${url}`);
      return null;
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
      console.log(`   ⏭️ 건너뜀 (비 HTML): ${url}`);
      return null;
    }

    const html = await response.text();
    const title = extractTitle(html) || url;
    const content = htmlToText(html);

    if (content.length < 50) {
      console.log(`   ⏭️ 건너뜀 (내용 부족): ${url}`);
      return null;
    }

    const truncated = content.slice(0, MAX_CONTENT_LENGTH);

    console.log(`   ✅ ${title.slice(0, 60)} (${truncated.length}자)`);

    return {
      url,
      title,
      content: truncated,
    };
  } catch (error) {
    const message = error.name === 'AbortError' ? '타임아웃' : error.message;
    console.warn(`   ⚠️ fetch 실패 (${message}): ${url}`);
    return null;
  }
}

/**
 * 텍스트에서 URL을 추출하고 병렬로 콘텐츠를 가져옴
 * @param {string} text - URL이 포함된 텍스트
 * @returns {Promise<Array<{url: string, title: string, content: string}>>}
 */
export async function fetchReferenceContents(text) {
  const urls = extractUrls(text);

  if (urls.length === 0) {
    return [];
  }

  // 건너뛸 URL 필터링 후 최대 개수 제한
  const targetUrls = urls.filter((url) => !shouldSkipUrl(url)).slice(0, MAX_URLS);

  if (targetUrls.length === 0) {
    return [];
  }

  console.log(`🌐 참고 URL ${targetUrls.length}개 콘텐츠 수집 중...`);

  const results = await Promise.all(targetUrls.map((url) => fetchPageContent(url)));

  // null 결과 필터링
  return results.filter((r) => r !== null);
}
