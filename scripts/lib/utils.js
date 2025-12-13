/**
 * 스크립트 공통 유틸리티 함수들
 * 여러 스크립트에서 중복 사용되는 함수들을 모아둔 모듈
 */

import { readFile, readdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { resolveDocumentPath } from './issue-context.js';

// 환경 변수
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.OPENAI_TOKEN;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

/**
 * 명령줄 인자 파싱
 * @returns {Object} 파싱된 인자 객체
 */
export function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const value = args[i + 1];
      if (value && !value.startsWith('--')) {
        parsed[key] = value;
        i++;
      } else {
        parsed[key] = true;
      }
    }
  }

  return parsed;
}

/**
 * 문서 찾기 (여러 방법 시도)
 * @param {Object} context - Issue 컨텍스트
 * @param {string} wikiDir - Wiki 디렉토리 경로
 * @returns {Promise<Object>} 문서 정보
 */
export async function findDocument(context, wikiDir) {
  // 1. 컨텍스트에서 문서 경로 추출 시도
  const docPath = resolveDocumentPath(context, wikiDir);

  if (existsSync(docPath.filepath)) {
    const content = await readFile(docPath.filepath, 'utf-8');
    return { ...docPath, content, found: true };
  }

  // 2. wiki 폴더의 모든 문서 검색
  if (existsSync(wikiDir)) {
    const files = await readdir(wikiDir);
    for (const file of files.filter((f) => f.endsWith('.md'))) {
      const filepath = join(wikiDir, file);
      const content = await readFile(filepath, 'utf-8');

      // 제목으로 매칭
      const titleMatch = content.match(/title:\s*["']?(.+?)["']?\s*$/m);
      if (titleMatch && titleMatch[1].trim() === context.issueTitle) {
        return {
          filepath,
          filename: file,
          slug: file.replace('.md', ''),
          content,
          found: true,
          source: 'title_match',
        };
      }
    }
  }

  return { ...docPath, content: null, found: false };
}

/**
 * OpenAI API 호출
 * @param {Array} messages - 메시지 배열
 * @param {Object} options - 옵션 (temperature, maxTokens)
 * @returns {Promise<string>} AI 응답 내용
 */
export async function callOpenAI(messages, options = {}) {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY 또는 OPENAI_TOKEN 환경 변수가 설정되지 않았습니다.');
  }

  const url = `${OPENAI_BASE_URL.replace(/\/$/, '')}/chat/completions`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages,
      temperature: options.temperature ?? 0.1,
      max_tokens: options.maxTokens ?? 8000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API 오류: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * OpenAI 설정 정보 반환
 * @returns {Object} OpenAI 설정
 */
export function getOpenAIConfig() {
  return {
    baseUrl: OPENAI_BASE_URL,
    model: OPENAI_MODEL,
    hasApiKey: !!OPENAI_API_KEY,
  };
}

/**
 * frontmatter에서 status 변경
 * @param {string} content - 문서 내용
 * @param {string} newStatus - 새 상태 (draft, published, needs_review, deleted)
 * @returns {string} 수정된 문서 내용
 */
export function updateFrontmatterStatus(content, newStatus) {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    return `---\nstatus: ${newStatus}\n---\n${content}`;
  }

  const frontmatter = frontmatterMatch[1];
  const rest = content.slice(frontmatterMatch[0].length);

  if (/^status:/m.test(frontmatter)) {
    const newFrontmatter = frontmatter.replace(/^status:.*$/m, `status: ${newStatus}`);
    return `---\n${newFrontmatter}\n---${rest}`;
  } else {
    const newFrontmatter = `${frontmatter}\nstatus: ${newStatus}`;
    return `---\n${newFrontmatter}\n---${rest}`;
  }
}

/**
 * 기존 문서 목록 가져오기
 * @param {string} wikiDir - Wiki 디렉토리 경로
 * @param {Object} options - 옵션 (includePreview: 미리보기 포함 여부)
 * @returns {Promise<Array>} 문서 목록
 */
export async function getExistingDocuments(wikiDir, options = {}) {
  if (!existsSync(wikiDir)) {
    return [];
  }

  const files = await readdir(wikiDir);
  const docs = [];

  for (const file of files.filter((f) => f.endsWith('.md'))) {
    const content = await readFile(join(wikiDir, file), 'utf-8');
    const titleMatch = content.match(/^#\s+(.+)$/m) || content.match(/title:\s*["']?(.+?)["']?\s*$/m);

    const doc = {
      filename: file,
      title: titleMatch ? titleMatch[1].trim() : file.replace('.md', ''),
    };

    if (options.includePreview) {
      doc.preview = content.slice(0, 200);
    }

    docs.push(doc);
  }

  return docs;
}

/**
 * GitHub Actions 출력 설정
 * @param {Object} outputs - 출력할 키-값 쌍
 */
export async function setGitHubOutput(outputs) {
  if (!process.env.GITHUB_OUTPUT) {
    return;
  }

  const { writeFile } = await import('fs/promises');
  const output = Object.entries(outputs)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  await writeFile(process.env.GITHUB_OUTPUT, output, { flag: 'a' });
}
