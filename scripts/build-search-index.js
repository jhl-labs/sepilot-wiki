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
  return markdown
    // 코드 블록 제거
    .replace(/```[\s\S]*?```/g, '')
    // 인라인 코드 제거
    .replace(/`[^`]+`/g, '')
    // 이미지 제거
    .replace(/!\[.*?\]\(.*?\)/g, '')
    // 링크에서 텍스트만 추출
    .replace(/\[([^\]]+)\]\(.*?\)/g, '$1')
    // HTML 태그 제거
    .replace(/<[^>]+>/g, '')
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

async function buildSearchIndex() {
  console.log('🔍 검색 인덱스 빌드 시작...');

  // wiki-data.json이 없으면 종료
  if (!existsSync(WIKI_DATA_FILE)) {
    console.log('⚠️ wiki-data.json이 없습니다. 먼저 build-wiki-data.js를 실행하세요.');
    return;
  }

  // wiki 데이터 로드
  const wikiData = JSON.parse(await readFile(WIKI_DATA_FILE, 'utf-8'));
  const wikiPages = wikiData.pages || [];

  // guide 데이터 로드 (있으면)
  let guidePages = [];
  if (existsSync(GUIDE_DATA_FILE)) {
    const guideData = JSON.parse(await readFile(GUIDE_DATA_FILE, 'utf-8'));
    // guide 페이지는 slug에 guide/ 접두사 추가
    guidePages = (guideData.pages || []).map(page => ({
      ...page,
      slug: `guide/${page.slug}`,
    }));
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

buildSearchIndex().catch((err) => {
  console.error('❌ 검색 인덱스 빌드 실패:', err);
  process.exit(1);
});
