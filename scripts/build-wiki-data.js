#!/usr/bin/env node

/**
 * 빌드 시점에 wiki 폴더의 마크다운 파일을 읽어 JSON으로 변환하는 스크립트
 * Private 저장소에서도 wiki 데이터를 정적으로 제공하기 위함
 * Git 히스토리를 포함하여 버전 관리 지원
 */

import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { join, basename } from 'path';
import { existsSync } from 'fs';
import { execSync } from 'child_process';

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

// Git 히스토리 가져오기
function getGitHistory(filePath, maxEntries = 20) {
  try {
    // git log로 파일의 커밋 히스토리 가져오기
    const format = '%H|%s|%an|%ae|%aI';
    const cmd = `git log --follow --format="${format}" -n ${maxEntries} -- "${filePath}"`;
    const output = execSync(cmd, { encoding: 'utf-8', cwd: process.cwd() });

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
        const statCmd = `git show --stat --format="" ${revision.sha} -- "${filePath}"`;
        const statOutput = execSync(statCmd, { encoding: 'utf-8', cwd: process.cwd() });

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
    const cmd = `git show ${sha}:${relativePath}`;
    return execSync(cmd, { encoding: 'utf-8', cwd: process.cwd() });
  } catch {
    return null;
  }
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

    // Git 히스토리 가져오기
    const history = getGitHistory(filePath);

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
      history,
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

  const totalRevisions = pages.reduce((sum, p) => sum + (p.history?.length || 0), 0);
  console.log(`✅ Wiki 데이터 빌드 완료: ${pages.length}개 문서, ${totalRevisions}개 리비전`);
  console.log(`   출력: ${OUTPUT_FILE}`);
}

buildWikiData().catch((err) => {
  console.error('❌ Wiki 데이터 빌드 실패:', err);
  process.exit(1);
});
