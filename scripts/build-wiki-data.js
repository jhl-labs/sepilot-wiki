#!/usr/bin/env node

/**
 * 빌드 시점에 wiki 폴더의 마크다운 파일을 읽어 JSON으로 변환하는 스크립트
 * Private 저장소에서도 wiki 데이터를 정적으로 제공하기 위함
 */

import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { join, basename } from 'path';
import { existsSync } from 'fs';

const WIKI_DIR = join(process.cwd(), 'wiki');
const OUTPUT_DIR = join(process.cwd(), 'public');
const OUTPUT_FILE = join(OUTPUT_DIR, 'wiki-data.json');

// 마크다운 프론트매터 파싱
function parseMarkdownWithFrontmatter(content) {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { metadata: {}, body: content };
  }

  const [, frontmatter, body] = match;
  const metadata = {};

  frontmatter.split('\n').forEach((line) => {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();

      // YAML 배열 파싱
      if (value.startsWith('[') && value.endsWith(']')) {
        metadata[key] = value
          .slice(1, -1)
          .split(',')
          .map((v) => v.trim().replace(/['\"]/g, ''));
      } else {
        metadata[key] = value.replace(/['\"]/g, '');
      }
    }
  });

  return { metadata, body };
}

// 슬러그를 제목으로 변환
function formatTitle(slug) {
  return slug
    .replace(/-/g, ' ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

async function buildWikiData() {
  console.log('📚 Wiki 데이터 빌드 시작...');

  // wiki 폴더가 없으면 빈 데이터 생성
  if (!existsSync(WIKI_DIR)) {
    console.log('⚠️ wiki 폴더가 없습니다. 빈 데이터를 생성합니다.');
    await mkdir(OUTPUT_DIR, { recursive: true });
    await writeFile(OUTPUT_FILE, JSON.stringify({ pages: [], tree: [] }, null, 2));
    console.log('✅ 빈 wiki-data.json 생성 완료');
    return;
  }

  // wiki 폴더의 모든 마크다운 파일 읽기
  const files = await readdir(WIKI_DIR);
  const mdFiles = files.filter((f) => f.endsWith('.md'));

  const pages = [];
  const tree = [];

  for (const file of mdFiles) {
    const filePath = join(WIKI_DIR, file);
    const content = await readFile(filePath, 'utf-8');
    const slug = basename(file, '.md');
    const { metadata, body } = parseMarkdownWithFrontmatter(content);

    const page = {
      title: metadata.title || formatTitle(slug),
      slug,
      content: body,
      lastModified: metadata.lastModified || new Date().toISOString(),
      author: metadata.author || undefined,
      isDraft: metadata.isDraft === 'true' || metadata.isDraft === true,
      isInvalid: metadata.isInvalid === 'true' || metadata.isInvalid === true,
      tags: metadata.tags || [],
    };

    pages.push(page);
    tree.push({
      title: page.title,
      slug: page.slug,
    });
  }

  // 제목 기준 정렬
  tree.sort((a, b) => a.title.localeCompare(b.title, 'ko'));

  // public 폴더 생성
  await mkdir(OUTPUT_DIR, { recursive: true });

  // JSON 파일 저장
  const data = { pages, tree };
  await writeFile(OUTPUT_FILE, JSON.stringify(data, null, 2));

  console.log(`✅ Wiki 데이터 빌드 완료: ${pages.length}개 문서`);
  console.log(`   출력: ${OUTPUT_FILE}`);
}

buildWikiData().catch((err) => {
  console.error('❌ Wiki 데이터 빌드 실패:', err);
  process.exit(1);
});
