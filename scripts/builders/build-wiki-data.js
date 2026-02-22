#!/usr/bin/env node

/**
 * 빌드 시점에 wiki 폴더의 마크다운 파일을 읽어 JSON으로 변환하는 스크립트
 * Private 저장소에서도 wiki 데이터를 정적으로 제공하기 위함
 * Git 히스토리를 포함하여 버전 관리 지원
 */

import { readdir, readFile, writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { execFileSync } from 'child_process';
import matter from 'gray-matter';
import { validateFrontmatter } from '../lib/frontmatter-schema.js';

const WIKI_DIR = join(process.cwd(), 'wiki');
const GUIDE_DIR = join(process.cwd(), 'guide');
const OUTPUT_DIR = join(process.cwd(), 'public');
const OUTPUT_FILE = join(OUTPUT_DIR, 'wiki-data.json');
const META_OUTPUT_FILE = join(OUTPUT_DIR, 'wiki-meta.json');
const PAGES_OUTPUT_DIR = join(OUTPUT_DIR, 'wiki-pages');
const GUIDE_OUTPUT_FILE = join(OUTPUT_DIR, 'guide-data.json');
const DATA_DIR = join(OUTPUT_DIR, 'data');
const AI_HISTORY_FILE = join(DATA_DIR, 'ai-history.json');

// 자동화 커밋 필터링 패턴 (교차 참조, 트리 유지보수, 머지 등)
const AUTO_COMMIT_PREFIXES = [
  '🔗 교차 참조',
  '🌳 Wiki Tree Maintenance',
  'Merge branch',
];

// 추가 문서 소스 디렉토리 (환경변수 또는 설정 파일에서 로드)
// EXTRA_WIKI_DIRS 환경변수: 콤마로 구분된 경로 목록 (예: "/app/data,/app/docs")
const EXTRA_WIKI_DIRS = process.env.EXTRA_WIKI_DIRS
  ? process.env.EXTRA_WIKI_DIRS.split(',').map(p => p.trim()).filter(Boolean)
  : [];

// 마크다운 프론트매터 파싱 (gray-matter 사용)
export function parseMarkdownWithFrontmatter(content) {
  try {
    const { data: metadata, content: body } = matter(content);
    return { metadata, body };
  } catch (err) {
    console.warn(`⚠️ 프론트매터 파싱 실패, 원본 반환: ${err.message}`);
    return { metadata: {}, body: content };
  }
}

// 슬러그를 제목으로 변환
export function formatTitle(slug) {
  return slug
    .replace(/-/g, ' ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

// Git 히스토리 배치 캐시 (한 번의 git log로 전체 이력 수집)
let _gitHistoryBatchCache = null;

/**
 * 배치 방식: wiki/ 폴더 전체에 대해 한 번의 git log로 이력 수집
 * @param {string} wikiDir - wiki 디렉토리 경로
 * @returns {Map<string, Array>} 파일별 이력 맵
 */
function getGitHistoryBatch(wikiDir) {
  if (_gitHistoryBatchCache) return _gitHistoryBatchCache;

  const historyMap = new Map();
  try {
    const format = '%H|%s|%an|%ae|%aI';
    const raw = execFileSync(
      'git',
      ['log', `--pretty=format:${format}`, '--name-only', '-n', '200', '--', wikiDir],
      { encoding: 'utf-8', cwd: process.cwd(), maxBuffer: 10 * 1024 * 1024 }
    );

    if (!raw.trim()) {
      _gitHistoryBatchCache = historyMap;
      return historyMap;
    }

    // 파싱: 커밋 정보와 파일명이 번갈아 나옴
    const blocks = raw.trim().split('\n\n');
    for (const block of blocks) {
      const lines = block.split('\n').filter(Boolean);
      if (lines.length === 0) continue;

      // 첫 줄이 커밋 정보
      const [sha, message, author, authorEmail, date] = lines[0].split('|');
      const isAutoCommit = AUTO_COMMIT_PREFIXES.some(p => message?.startsWith(p));
      const commit = {
        sha: sha?.substring(0, 7),
        message,
        author,
        authorEmail,
        date,
        isAutoCommit,
        additions: 0,
        deletions: 0,
      };

      // 나머지 줄은 파일명
      for (let i = 1; i < lines.length; i++) {
        const filepath = lines[i].trim();
        if (!filepath || filepath.includes('|')) continue;

        if (!historyMap.has(filepath)) {
          historyMap.set(filepath, []);
        }
        historyMap.get(filepath).push({ ...commit });
      }
    }
  } catch (error) {
    console.warn(`⚠️ Git 히스토리 배치 수집 실패: ${error.message}`);
  }

  _gitHistoryBatchCache = historyMap;
  return historyMap;
}

// Git 히스토리 가져오기 (배치 캐시 우선, 폴백으로 개별 조회)
export function getGitHistory(filePath, maxEntries = 20) {
  // 배치 캐시에서 조회 시도
  if (_gitHistoryBatchCache) {
    // filePath에서 상대 경로 추출
    const relativePath = filePath.replace(process.cwd() + '/', '');
    const cached = _gitHistoryBatchCache.get(relativePath);
    if (cached) {
      return cached.slice(0, maxEntries);
    }
  }

  // 폴백: 개별 git log 호출
  try {
    const format = '%H|%s|%an|%ae|%aI';
    const output = execFileSync(
      'git',
      ['log', '--follow', `--format=${format}`, '-n', String(maxEntries), '--', filePath],
      { encoding: 'utf-8', cwd: process.cwd() }
    );

    if (!output.trim()) {
      return [];
    }

    return output
      .trim()
      .split('\n')
      .map((line) => {
        const [sha, message, author, authorEmail, date] = line.split('|');
        const isAutoCommit = AUTO_COMMIT_PREFIXES.some(p => message?.startsWith(p));
        return {
          sha: sha.substring(0, 7),
          message,
          author,
          authorEmail,
          date,
          isAutoCommit,
          additions: 0,
          deletions: 0,
        };
      });
  } catch (error) {
    console.warn(`⚠️ Git 히스토리 가져오기 실패: ${filePath}`, error.message);
    return [];
  }
}

// 재귀적으로 모든 마크다운 파일 찾기
export async function findMarkdownFiles(dir, baseDir = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findMarkdownFiles(fullPath, baseDir)));
    } else if (entry.name.endsWith('.md')) {
      // 상대 경로 계산 (wiki/ 기준)
      const relativePath = fullPath.replace(baseDir + '/', '');
      files.push({ fullPath, relativePath });
    }
  }

  return files;
}

// 카테고리 메타데이터 로드 (_category.json)
export async function loadCategoryMeta(wikiDir) {
  const meta = {};
  async function scan(dir, prefix = '') {
    if (!existsSync(dir)) return;
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const categoryPath = prefix ? `${prefix}/${entry.name}` : entry.name;
        const metaFile = join(dir, entry.name, '_category.json');
        if (existsSync(metaFile)) {
          const content = JSON.parse(await readFile(metaFile, 'utf-8'));
          meta[categoryPath] = content;
        }
        await scan(join(dir, entry.name), categoryPath);
      }
    }
  }
  await scan(wikiDir);
  return meta;
}

// 트리 구조 생성 (중첩 카테고리 지원)
export function buildTreeStructure(pages, categoryMeta = {}) {
  const tree = [];
  const categories = {}; // path -> category object

  // 1단계: 모든 카테고리 경로를 먼저 생성
  for (const page of pages) {
    const parts = page.slug.split('/');
    if (parts.length > 1) {
      // 모든 중간 카테고리 경로 생성 (예: bun/ci/github-actions -> bun, bun/ci)
      for (let i = 1; i < parts.length; i++) {
        const categoryPath = parts.slice(0, i).join('/');
        if (!categories[categoryPath]) {
          categories[categoryPath] = {
            name: categoryMeta[categoryPath]?.displayName || parts[i - 1],
            path: categoryPath,
            isCategory: true,
            order: categoryMeta[categoryPath]?.order ?? 999,
            children: [],
          };
        }
      }
    }
  }

  // 2단계: 페이지를 해당 카테고리에 추가
  for (const page of pages) {
    const parts = page.slug.split('/');
    const pageItem = {
      title: page.title,
      slug: page.slug,
      menu: page.menu,
      order: page.order,
      lastModified: page.lastModified,
    };

    if (parts.length === 1) {
      // 루트 레벨 문서
      tree.push(pageItem);
    } else {
      // 직접 부모 카테고리에 추가
      const parentPath = parts.slice(0, -1).join('/');
      if (categories[parentPath]) {
        categories[parentPath].children.push(pageItem);
      }
    }
  }

  // 3단계: 카테고리를 부모 카테고리 또는 루트에 추가 (깊은 것부터 처리)
  const sortedPaths = Object.keys(categories).sort((a, b) => b.length - a.length);
  for (const path of sortedPaths) {
    const category = categories[path];
    const parts = path.split('/');

    if (parts.length === 1) {
      // 최상위 카테고리 -> 루트 트리에 추가
      tree.push(category);
    } else {
      // 중첩 카테고리 -> 부모 카테고리에 추가
      const parentPath = parts.slice(0, -1).join('/');
      if (categories[parentPath]) {
        categories[parentPath].children.push(category);
      }
    }
  }

  // 4단계: 재귀적으로 정렬
  const sortChildren = (items) => {
    items.sort((a, b) => {
      // 카테고리 우선
      if (a.isCategory && !b.isCategory) return -1;
      if (!a.isCategory && b.isCategory) return 1;
      // 페이지: lastModified 최신순
      if (!a.isCategory && !b.isCategory) {
        const dateA = a.lastModified || '';
        const dateB = b.lastModified || '';
        if (dateA !== dateB) return dateB.localeCompare(dateA);
      }
      // 카테고리: order 기반
      const orderA = a.order ?? 999;
      const orderB = b.order ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      return (a.title || a.name || '').localeCompare(b.title || b.name || '', 'ko');
    });
    for (const item of items) {
      if (item.children && item.children.length > 0) {
        sortChildren(item.children);
      }
    }
  };
  sortChildren(tree);

  return tree;
}

export async function buildWikiData() {
  console.log('📚 Wiki 데이터 빌드 시작...');

  // 모든 문서 소스 디렉토리 수집
  const wikiDirs = [WIKI_DIR, ...EXTRA_WIKI_DIRS].filter(dir => existsSync(dir));

  if (wikiDirs.length === 0) {
    console.log('⚠️ wiki 폴더가 없습니다. 빈 데이터를 생성합니다.');
    await mkdir(OUTPUT_DIR, { recursive: true });
    await writeFile(OUTPUT_FILE, JSON.stringify({ pages: [], tree: [] }, null, 2));
    console.log('✅ 빈 wiki-data.json 생성 완료');
    return;
  }

  // 모든 소스에서 마크다운 파일 수집
  let mdFiles = [];
  for (const dir of wikiDirs) {
    const files = await findMarkdownFiles(dir);
    console.log(`   [${dir}] 발견된 마크다운 파일: ${files.length}개`);
    mdFiles.push(...files);
  }
  console.log(`   총 마크다운 파일: ${mdFiles.length}개`);

  // Git 히스토리 배치 캐시 워밍업 (1회 호출로 전체 이력 수집)
  console.log('   📜 Git 히스토리 배치 수집...');
  getGitHistoryBatch(WIKI_DIR);

  const pages = [];

  for (const { fullPath, relativePath } of mdFiles) {
    const content = await readFile(fullPath, 'utf-8');
    // 슬러그는 상대 경로에서 .md 제거
    const slug = relativePath.replace('.md', '');
    const { metadata: rawMetadata, body } = parseMarkdownWithFrontmatter(content);

    // 프론트매터 스키마 검증 및 자동 보정
    const validation = validateFrontmatter(rawMetadata, slug);
    const metadata = validation.corrected;

    // Git 히스토리 가져오기
    const history = getGitHistory(fullPath);

    // 자동화 커밋을 제외한 실제 수정 커밋에서 lastModified와 author 추출
    let lastModified = metadata.lastModified || new Date().toISOString();
    let author = metadata.author;

    if (history.length > 0) {
      // 자동화 커밋을 건너뛰고 실제 내용 변경 커밋 찾기
      const contentCommit = history.find(h => !h.isAutoCommit);
      if (contentCommit) {
        lastModified = contentCommit.date;
        if (!author) {
          author = contentCommit.author;
        }
      } else {
        // 모든 커밋이 자동화인 경우 최신 커밋 사용 (폴백)
        lastModified = history[0].date;
        if (!author) {
          author = history[0].author;
        }
      }
    }

    // status 필드 기반 상태 결정 (draft, published, needs_review, deleted 등)
    const status = metadata.status || 'published';

    // status: deleted 문서는 빌드에서 제외
    if (status === 'deleted') {
      console.log(`   ⏭️ 삭제된 문서 건너뜀: ${slug}`);
      continue;
    }

    const isDraft = status === 'draft' || metadata.isDraft === 'true' || metadata.isDraft === true;
    const isInvalid = status === 'needs_review' || metadata.isInvalid === 'true' || metadata.isInvalid === true;

    const page = {
      title: metadata.title || formatTitle(slug),
      slug,
      content: body,
      lastModified,
      author,
      status,
      isDraft,
      isInvalid,
      tags: metadata.tags || [],
      menu: metadata.menu,
      order: metadata.order ? parseInt(metadata.order, 10) : undefined,
      history,
    };

    pages.push(page);
  }

  // 중복 제목 감지
  const titleMap = new Map();
  for (const page of pages) {
    const existing = titleMap.get(page.title);
    if (existing) {
      console.warn(`⚠️ 중복 제목 감지: "${page.title}"`);
      console.warn(`   - ${existing.slug}`);
      console.warn(`   - ${page.slug}`);
    }
    titleMap.set(page.title, page);
  }

  // 카테고리 메타데이터 로드 및 트리 구조 생성
  const categoryMeta = await loadCategoryMeta(WIKI_DIR);
  const tree = buildTreeStructure(pages, categoryMeta);

  // 스테일 파일 방지: wiki-pages/ 디렉토리 전체 삭제 후 재생성
  if (existsSync(PAGES_OUTPUT_DIR)) {
    await rm(PAGES_OUTPUT_DIR, { recursive: true });
    console.log('🧹 기존 wiki-pages/ 정리 완료');
  }

  // public 폴더 생성
  await mkdir(OUTPUT_DIR, { recursive: true });

  // JSON 파일 저장 (기존 wiki-data.json — 하위 호환 + search-index 빌더 의존)
  const data = { pages, tree };
  await writeFile(OUTPUT_FILE, JSON.stringify(data, null, 2));

  // wiki-meta.json 생성 (경량 메타데이터 — 목록/트리 표시 전용)
  const metaPages = pages.map(({ title, slug, status, tags, lastModified, author, isDraft, isInvalid, menu }) => ({
    title, slug, status, tags, lastModified, author, isDraft, isInvalid, menu,
  }));
  const metaData = { pages: metaPages, tree };
  await writeFile(META_OUTPUT_FILE, JSON.stringify(metaData, null, 2));

  // wiki-pages/{slug}.json 생성 (개별 페이지 전문)
  await mkdir(PAGES_OUTPUT_DIR, { recursive: true });
  for (const page of pages) {
    // 슬래시 포함 slug는 디렉토리 구조로 생성 (예: bun/overview → wiki-pages/bun/overview.json)
    const pageJsonPath = join(PAGES_OUTPUT_DIR, `${page.slug}.json`);
    const pageDir = join(pageJsonPath, '..');
    await mkdir(pageDir, { recursive: true });
    await writeFile(pageJsonPath, JSON.stringify(page, null, 2));
  }

  const totalRevisions = pages.reduce((sum, p) => sum + (p.history?.length || 0), 0);
  console.log(`✅ Wiki 데이터 빌드 완료: ${pages.length}개 문서, ${totalRevisions}개 리비전`);
  console.log(`   출력: ${OUTPUT_FILE}`);
  console.log(`   메타: ${META_OUTPUT_FILE} (${JSON.stringify(metaData).length} bytes)`);
  console.log(`   페이지: ${PAGES_OUTPUT_DIR}/ (${pages.length}개 파일)`);

  // AI History 파일이 없으면 빈 파일 생성 (wx 플래그로 경합 조건 방지)
  await mkdir(DATA_DIR, { recursive: true });
  try {
    const emptyHistory = { entries: [], lastUpdated: new Date().toISOString() };
    await writeFile(AI_HISTORY_FILE, JSON.stringify(emptyHistory, null, 2), { flag: 'wx' });
    console.log(`✅ 빈 AI History 파일 생성: ${AI_HISTORY_FILE}`);
  } catch (err) {
    if (err.code === 'EEXIST') {
      console.log(`ℹ️ AI History 파일 존재: ${AI_HISTORY_FILE}`);
    } else {
      throw err;
    }
  }
}

// Guide 데이터 빌드 (정적 가이드 페이지)
export async function buildGuideData() {
  console.log('📖 Guide 데이터 빌드 시작...');

  // guide 폴더가 없으면 빈 데이터 생성
  if (!existsSync(GUIDE_DIR)) {
    console.log('⚠️ guide 폴더가 없습니다. 빈 데이터를 생성합니다.');
    await mkdir(OUTPUT_DIR, { recursive: true });
    await writeFile(GUIDE_OUTPUT_FILE, JSON.stringify({ pages: [] }, null, 2));
    console.log('✅ 빈 guide-data.json 생성 완료');
    return;
  }

  // guide 폴더의 모든 마크다운 파일 찾기
  const mdFiles = await findMarkdownFiles(GUIDE_DIR);
  console.log(`   발견된 가이드 파일: ${mdFiles.length}개`);

  const pages = [];

  for (const { fullPath, relativePath } of mdFiles) {
    const content = await readFile(fullPath, 'utf-8');
    // 슬러그는 상대 경로에서 .md 제거
    const slug = relativePath.replace('.md', '');
    const { metadata, body } = parseMarkdownWithFrontmatter(content);

    const page = {
      title: metadata.title || formatTitle(slug),
      slug,
      content: body,
      tags: metadata.tags || [],
      menu: metadata.menu,
    };

    pages.push(page);
  }

  // JSON 파일 저장
  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(GUIDE_OUTPUT_FILE, JSON.stringify({ pages }, null, 2));

  console.log(`✅ Guide 데이터 빌드 완료: ${pages.length}개 문서`);
  console.log(`   출력: ${GUIDE_OUTPUT_FILE}`);
}

async function main() {
  await buildWikiData();
  await buildGuideData();
}

// CLI 직접 실행 지원
const isDirectRun = process.argv[1]?.includes('build-wiki-data');
if (isDirectRun) {
  main().catch((err) => {
    console.error('❌ 데이터 빌드 실패:', err);
    process.exit(1);
  });
}
