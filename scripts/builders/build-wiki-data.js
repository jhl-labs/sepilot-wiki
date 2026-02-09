#!/usr/bin/env node

/**
 * 빌드 시점에 wiki 폴더의 마크다운 파일을 읽어 JSON으로 변환하는 스크립트
 * Private 저장소에서도 wiki 데이터를 정적으로 제공하기 위함
 * Git 히스토리를 포함하여 버전 관리 지원
 */

import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { join, basename } from 'path';
import { existsSync } from 'fs';
import { execFileSync } from 'child_process';

const WIKI_DIR = join(process.cwd(), 'wiki');
const GUIDE_DIR = join(process.cwd(), 'guide');
const OUTPUT_DIR = join(process.cwd(), 'public');
const OUTPUT_FILE = join(OUTPUT_DIR, 'wiki-data.json');
const GUIDE_OUTPUT_FILE = join(OUTPUT_DIR, 'guide-data.json');
const DATA_DIR = join(OUTPUT_DIR, 'data');
const AI_HISTORY_FILE = join(DATA_DIR, 'ai-history.json');

// 추가 문서 소스 디렉토리 (환경변수 또는 설정 파일에서 로드)
// EXTRA_WIKI_DIRS 환경변수: 콤마로 구분된 경로 목록 (예: "/app/data,/app/docs")
const EXTRA_WIKI_DIRS = process.env.EXTRA_WIKI_DIRS
  ? process.env.EXTRA_WIKI_DIRS.split(',').map(p => p.trim()).filter(Boolean)
  : [];

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

// Git 히스토리 가져오기
function getGitHistory(filePath, maxEntries = 20) {
  try {
    // git log로 파일의 커밋 히스토리 가져오기
    const format = '%H|%s|%an|%ae|%aI';
    const output = execFileSync(
      'git',
      ['log', '--follow', `--format=${format}`, '-n', String(maxEntries), '--', filePath],
      { encoding: 'utf-8', cwd: process.cwd() }
    );

    if (!output.trim()) {
      return [];
    }

    const history = output
      .trim()
      .split('\n')
      .map((line) => {
        const [sha, message, author, authorEmail, date] = line.split('|');
        return {
          sha: sha.substring(0, 7), // 짧은 SHA
          message,
          author,
          authorEmail,
          date,
        };
      });

    // 각 커밋의 변경 통계 가져오기 (선택적)
    for (const revision of history) {
      try {
        const statOutput = execFileSync(
          'git',
          ['show', '--stat', '--format=', revision.sha, '--', filePath],
          { encoding: 'utf-8', cwd: process.cwd() }
        );

        // 예: "1 file changed, 10 insertions(+), 5 deletions(-)"
        const insertMatch = statOutput.match(/(\d+) insertion/);
        const deleteMatch = statOutput.match(/(\d+) deletion/);

        revision.additions = insertMatch ? parseInt(insertMatch[1], 10) : 0;
        revision.deletions = deleteMatch ? parseInt(deleteMatch[1], 10) : 0;
      } catch {
        // 통계 가져오기 실패해도 계속 진행
      }
    }

    return history;
  } catch (error) {
    console.warn(`⚠️ Git 히스토리 가져오기 실패: ${filePath}`, error.message);
    return [];
  }
}

// 특정 커밋 시점의 파일 내용 가져오기
function getFileAtCommit(filePath, sha) {
  try {
    const relativePath = filePath.replace(process.cwd() + '/', '');
    return execFileSync(
      'git',
      ['show', `${sha}:${relativePath}`],
      { encoding: 'utf-8', cwd: process.cwd() }
    );
  } catch {
    return null;
  }
}

// 재귀적으로 모든 마크다운 파일 찾기
async function findMarkdownFiles(dir, baseDir = dir) {
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

// 트리 구조 생성 (중첩 카테고리 지원)
function buildTreeStructure(pages) {
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
            name: parts[i - 1],
            path: categoryPath,
            isCategory: true,
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

async function buildWikiData() {
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

  const pages = [];

  for (const { fullPath, relativePath } of mdFiles) {
    const content = await readFile(fullPath, 'utf-8');
    // 슬러그는 상대 경로에서 .md 제거
    const slug = relativePath.replace('.md', '');
    const { metadata, body } = parseMarkdownWithFrontmatter(content);

    // Git 히스토리 가져오기
    const history = getGitHistory(fullPath);

    // 최신 커밋에서 lastModified와 author 추출 (프론트매터보다 우선)
    let lastModified = metadata.lastModified || new Date().toISOString();
    let author = metadata.author;

    if (history.length > 0) {
      lastModified = history[0].date;
      if (!author) {
        author = history[0].author;
      }
    }

    // status 필드 기반 상태 결정 (draft, published, needs_review, deleted 등)
    const status = metadata.status || 'published';
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
      history,
    };

    pages.push(page);
  }

  // 트리 구조 생성
  const tree = buildTreeStructure(pages);

  // public 폴더 생성
  await mkdir(OUTPUT_DIR, { recursive: true });

  // JSON 파일 저장
  const data = { pages, tree };
  await writeFile(OUTPUT_FILE, JSON.stringify(data, null, 2));

  const totalRevisions = pages.reduce((sum, p) => sum + (p.history?.length || 0), 0);
  console.log(`✅ Wiki 데이터 빌드 완료: ${pages.length}개 문서, ${totalRevisions}개 리비전`);
  console.log(`   출력: ${OUTPUT_FILE}`);

  // AI History 파일이 없으면 빈 파일 생성
  await mkdir(DATA_DIR, { recursive: true });
  if (!existsSync(AI_HISTORY_FILE)) {
    const emptyHistory = { entries: [], lastUpdated: new Date().toISOString() };
    await writeFile(AI_HISTORY_FILE, JSON.stringify(emptyHistory, null, 2));
    console.log(`✅ 빈 AI History 파일 생성: ${AI_HISTORY_FILE}`);
  } else {
    console.log(`ℹ️ AI History 파일 존재: ${AI_HISTORY_FILE}`);
  }
}

// Guide 데이터 빌드 (정적 가이드 페이지)
async function buildGuideData() {
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

main().catch((err) => {
  console.error('❌ 데이터 빌드 실패:', err);
  process.exit(1);
});
