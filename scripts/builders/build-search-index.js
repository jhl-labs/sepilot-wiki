#!/usr/bin/env node

/**
 * 빌드 시점에 검색 인덱스 XML 파일을 생성하는 스크립트
 * 정적 사이트 블로그 방식의 검색을 지원
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

const PUBLIC_DIR = join(process.cwd(), 'public');
const WIKI_DATA_FILE = join(PUBLIC_DIR, 'wiki-data.json');
const GUIDE_DATA_FILE = join(PUBLIC_DIR, 'guide-data.json');
const OUTPUT_FILE = join(PUBLIC_DIR, 'search-index.xml');
const JSON_OUTPUT_FILE = join(PUBLIC_DIR, 'search-index.json');

// 마크다운에서 텍스트만 추출 (검색용)
function extractPlainText(markdown) {
  let text = markdown
    // 코드 블록 제거
    .replace(/```[\s\S]*?```/g, '')
    // 인라인 코드 제거
    .replace(/`[^`]+`/g, '')
    // 이미지 제거
    .replace(/!\[.*?\]\(.*?\)/g, '')
    // 링크에서 텍스트만 추출
    .replace(/\[([^\]]+)\]\(.*?\)/g, '$1');
  // 루프 기반 HTML 태그 제거 (중첩/변형 태그 방지)
  let prev;
  do {
    prev = text;
    text = text.replace(/<script\b[^>]*>[\s\S]*?<\/script[^>]*>/gi, '');
    text = text.replace(/<style\b[^>]*>[\s\S]*?<\/style[^>]*>/gi, '');
    text = text.replace(/<[^>]+>/g, '');
  } while (text !== prev);
  return text
    // 헤더 기호 제거
    .replace(/^#+\s*/gm, '')
    // 굵게/기울임 마크다운 제거
    .replace(/[*_~]{1,3}([^*_~]+)[*_~]{1,3}/g, '$1')
    // 인용문 기호 제거
    .replace(/^>\s*/gm, '')
    // 리스트 기호 제거
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    // 구분선 제거
    .replace(/^[-*_]{3,}$/gm, '')
    // 테이블 구분자 제거
    .replace(/\|/g, ' ')
    // 여러 줄바꿈을 하나로
    .replace(/\n{2,}/g, '\n')
    // 앞뒤 공백 제거
    .trim();
}

// XML 특수문자 이스케이프
function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// 검색용 요약 생성 (처음 200자)
function createExcerpt(content, maxLength = 200) {
  const plainText = extractPlainText(content);
  if (plainText.length <= maxLength) {
    return plainText;
  }
  return plainText.substring(0, maxLength).trim() + '...';
}

/**
 * 검색 인덱스 빌드
 * @param {Object} [options] - 옵션
 * @param {Array} [options.wikiPages] - 미리 파싱된 wiki 페이지 배열 (파이프라인에서 전달)
 * @param {Array} [options.guidePages] - 미리 파싱된 guide 페이지 배열 (파이프라인에서 전달)
 * @param {boolean} [options.incremental=false] - 증분 업데이트 모드
 * @param {string[]} [options.changedSlugs] - 변경된 페이지 slug 목록 (증분 모드 시)
 * @param {string[]} [options.removedSlugs] - 삭제된 페이지 slug 목록 (증분 모드 시)
 */
export async function buildSearchIndex(options = {}) {
  console.log('🔍 검색 인덱스 빌드 시작...');

  let wikiPages;
  let guidePages;

  if (options.wikiPages) {
    // 파이프라인에서 이미 파싱된 데이터를 받은 경우 디스크 I/O 없이 진행
    wikiPages = options.wikiPages;
    guidePages = options.guidePages || [];
  } else {
    // 기존 방식: JSON 파일에서 로드
    if (!existsSync(WIKI_DATA_FILE)) {
      console.log('⚠️ wiki-data.json이 없습니다. 먼저 build-wiki-data.js를 실행하세요.');
      return;
    }

    const wikiData = JSON.parse(await readFile(WIKI_DATA_FILE, 'utf-8'));
    wikiPages = wikiData.pages || [];

    guidePages = [];
    if (existsSync(GUIDE_DATA_FILE)) {
      const guideData = JSON.parse(await readFile(GUIDE_DATA_FILE, 'utf-8'));
      guidePages = (guideData.pages || []).map(page => ({
        ...page,
        slug: `guide/${page.slug}`,
      }));
    }
  }

  // 증분 업데이트 모드: 기존 인덱스에서 변경된 부분만 교체
  if (options.incremental && existsSync(JSON_OUTPUT_FILE)) {
    try {
      const existingIndex = JSON.parse(await readFile(JSON_OUTPUT_FILE, 'utf-8'));
      const changedSlugs = new Set(options.changedSlugs || []);
      const removedSlugs = new Set(options.removedSlugs || []);

      // 삭제된 페이지 제거, 변경된 페이지 제거
      const filtered = existingIndex.filter(
        (item) => !changedSlugs.has(item.slug) && !removedSlugs.has(item.slug)
      );

      // 변경/추가된 페이지 새로 추가
      const allPages = [...wikiPages, ...guidePages];
      const updatedPages = allPages.filter((p) => changedSlugs.has(p.slug));

      for (const page of updatedPages) {
        filtered.push({
          title: page.title,
          slug: page.slug,
          content: extractPlainText(page.content),
          excerpt: createExcerpt(page.content),
          tags: page.tags || [],
          lastModified: page.lastModified,
          author: page.author,
        });
      }

      await writeFile(JSON_OUTPUT_FILE, JSON.stringify(filtered, null, 2));
      console.log(`✅ 검색 인덱스 증분 업데이트: ${updatedPages.length}개 갱신, ${removedSlugs.size}개 삭제`);
      return;
    } catch (err) {
      console.warn(`⚠️ 증분 업데이트 실패, 전체 재생성으로 폴백: ${err.message}`);
    }
  }

  // 모든 페이지 합치기
  const pages = [...wikiPages, ...guidePages];

  if (pages.length === 0) {
    console.log('⚠️ 검색할 페이지가 없습니다.');
    return;
  }

  // XML 생성
  const xmlItems = pages.map((page) => {
    const plainContent = extractPlainText(page.content);
    const excerpt = createExcerpt(page.content);
    const tags = Array.isArray(page.tags) ? page.tags.join(', ') : '';

    return `  <item>
    <title>${escapeXml(page.title)}</title>
    <slug>${escapeXml(page.slug)}</slug>
    <content>${escapeXml(plainContent)}</content>
    <excerpt>${escapeXml(excerpt)}</excerpt>
    <tags>${escapeXml(tags)}</tags>
    <lastModified>${page.lastModified}</lastModified>
    <author>${escapeXml(page.author || '')}</author>
  </item>`;
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<searchIndex>
  <generated>${new Date().toISOString()}</generated>
  <count>${pages.length}</count>
  <items>
${xmlItems.join('\n')}
  </items>
</searchIndex>`;

  // JSON 인덱스도 함께 생성 (클라이언트에서 더 쉽게 사용 가능)
  const jsonIndex = pages.map((page) => ({
    title: page.title,
    slug: page.slug,
    content: extractPlainText(page.content),
    excerpt: createExcerpt(page.content),
    tags: page.tags || [],
    lastModified: page.lastModified,
    author: page.author,
  }));

  // 파일 저장
  await mkdir(PUBLIC_DIR, { recursive: true });
  await writeFile(OUTPUT_FILE, xml);
  await writeFile(JSON_OUTPUT_FILE, JSON.stringify(jsonIndex, null, 2));

  console.log(`✅ 검색 인덱스 빌드 완료: ${pages.length}개 문서`);
  console.log(`   XML: ${OUTPUT_FILE}`);
  console.log(`   JSON: ${JSON_OUTPUT_FILE}`);
}

// extractPlainText와 createExcerpt도 export (외부 사용 가능)
export { extractPlainText, createExcerpt };

// CLI 직접 실행 지원
const isDirectRun = process.argv[1]?.includes('build-search-index');
if (isDirectRun) {
  buildSearchIndex().catch((err) => {
    console.error('❌ 검색 인덱스 빌드 실패:', err);
    process.exit(1);
  });
}
