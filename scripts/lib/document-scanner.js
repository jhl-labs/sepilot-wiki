/**
 * Wiki 문서 스캐너 공통 모듈
 * maintain-wiki-tree.js의 loadAllDocuments()를 추출하여 모든 maintenance 스크립트에서 재사용
 */

import { readFile, readdir } from 'fs/promises';
import { join, resolve } from 'path';
import { existsSync } from 'fs';
import { execFileSync } from 'child_process';
import { parseFrontmatter } from './frontmatter.js';

// 기본 Wiki 디렉토리
const DEFAULT_WIKI_DIR = resolve(process.cwd(), 'wiki');

/**
 * 경로가 Wiki 디렉토리 내부에 있는지 검증 (Path Traversal 방지)
 * @param {string} targetPath - 검증할 경로
 * @param {string} wikiDir - Wiki 디렉토리 경로
 */
export function validatePath(targetPath, wikiDir = DEFAULT_WIKI_DIR) {
  const resolvedPath = resolve(targetPath);
  const resolvedWikiDir = resolve(wikiDir);
  if (!resolvedPath.startsWith(resolvedWikiDir + '/') && resolvedPath !== resolvedWikiDir) {
    throw new Error(`보안 오류: 경로가 wiki 디렉토리 외부를 가리킵니다: ${targetPath}`);
  }
  return resolvedPath;
}

/**
 * 본문에서 제목 추출
 * @param {string} content - 마크다운 본문
 * @returns {string|null} 추출된 제목
 */
function extractTitle(content) {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

/**
 * Wiki 문서 전체 로드
 * @param {Object} options - 옵션
 * @param {string} [options.wikiDir] - Wiki 디렉토리 경로
 * @param {boolean} [options.includeContent] - 본문 내용 포함 여부 (기본: true)
 * @param {boolean} [options.includeGitHistory] - Git 히스토리 포함 여부 (기본: false)
 * @param {number} [options.maxHistoryEntries] - Git 히스토리 최대 항목 수 (기본: 5)
 * @returns {Promise<Array>} 문서 목록
 */
export async function loadAllDocuments(options = {}) {
  const {
    wikiDir = DEFAULT_WIKI_DIR,
    includeContent = true,
    includeGitHistory = false,
    maxHistoryEntries = 5,
  } = options;

  if (!existsSync(wikiDir)) {
    console.log('⚠️ wiki 디렉토리가 없습니다.');
    return [];
  }

  const documents = [];

  async function scanDir(dir, prefix = '') {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        await scanDir(fullPath, relativePath);
      } else if (entry.name.endsWith('.md')) {
        const rawContent = await readFile(fullPath, 'utf-8');
        const { frontmatter, body } = parseFrontmatter(rawContent);

        const doc = {
          path: relativePath,
          fullPath,
          filename: entry.name,
          slug: relativePath.replace('.md', ''),
          directory: prefix || '/',
          frontmatter,
          title: frontmatter.title || extractTitle(body) || entry.name.replace('.md', ''),
          status: frontmatter.status || 'unknown',
          tags: frontmatter.tags || [],
          wordCount: body.split(/\s+/).filter(Boolean).length,
          hasKoreanFilename: /[가-힣]/.test(entry.name),
        };

        if (includeContent) {
          doc.content = body;
          doc.rawContent = rawContent;
        }

        if (includeGitHistory) {
          doc.gitHistory = getGitHistory(fullPath, maxHistoryEntries);
          if (doc.gitHistory.length > 0) {
            doc.lastModified = doc.gitHistory[0].date;
            doc.lastModifiedBy = doc.gitHistory[0].author;
          }
        }

        documents.push(doc);
      }
    }
  }

  await scanDir(wikiDir);
  return documents;
}

/**
 * Git 히스토리 가져오기
 * @param {string} filePath - 파일 경로
 * @param {number} maxEntries - 최대 항목 수
 * @returns {Array} 히스토리 배열
 */
export function getGitHistory(filePath, maxEntries = 20) {
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
        return {
          sha: sha.substring(0, 7),
          message,
          author,
          authorEmail,
          date,
        };
      });
  } catch (error) {
    console.warn(`⚠️ Git 히스토리 가져오기 실패: ${filePath}`, error.message);
    return [];
  }
}

/**
 * 문서의 마지막 수정일로부터 경과 일수 계산
 * @param {string} filePath - 파일 경로
 * @returns {number} 경과 일수 (-1: 히스토리 없음)
 */
export function getDaysSinceLastModified(filePath) {
  const history = getGitHistory(filePath, 1);
  if (history.length === 0) return -1;

  const lastModified = new Date(history[0].date);
  const now = new Date();
  const diffMs = now - lastModified;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * 문서 요약 정보 생성 (AI 프롬프트용)
 * @param {Array} documents - 문서 배열
 * @returns {Array} 요약 정보 배열
 */
export function getDocumentSummaries(documents) {
  return documents.map((doc) => ({
    path: doc.path,
    title: doc.title,
    directory: doc.directory,
    status: doc.status,
    tags: doc.tags,
    wordCount: doc.wordCount,
    preview: doc.content ? doc.content.slice(0, 300) : '',
  }));
}
