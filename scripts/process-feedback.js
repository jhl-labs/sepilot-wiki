#!/usr/bin/env node

/**
 * Maintainer 피드백을 AI로 처리하여 문서를 수정하는 스크립트
 * GitHub Issue에 maintainer가 댓글을 달면 issue-handler.yml에서 호출됨
 *
 * 환경 변수:
 * - OPENAI_BASE_URL: OpenAI API 호환 엔드포인트
 * - OPENAI_API_KEY: API 키 (또는 OPENAI_TOKEN)
 * - OPENAI_MODEL: 사용할 모델
 *
 * 사용법:
 * node scripts/process-feedback.js --issue-number 123 --issue-title "문서 제목" --comment-body "수정 요청 내용"
 */

import { writeFile, readFile, readdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// 환경 변수
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.OPENAI_TOKEN;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

// 출력 경로
const WIKI_DIR = join(process.cwd(), 'wiki');

// 명령줄 인자 파싱
function parseArgs() {
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

// 슬러그로 문서 찾기
async function findDocumentByTitle(issueTitle) {
  if (!existsSync(WIKI_DIR)) {
    return null;
  }

  // 제목에서 슬러그 생성
  const expectedSlug = issueTitle
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .slice(0, 50);

  const expectedFilename = `${expectedSlug}.md`;
  const filepath = join(WIKI_DIR, expectedFilename);

  if (existsSync(filepath)) {
    const content = await readFile(filepath, 'utf-8');
    return { filepath, filename: expectedFilename, content };
  }

  // 슬러그가 맞지 않으면 모든 문서에서 제목으로 검색
  const files = await readdir(WIKI_DIR);
  for (const file of files.filter((f) => f.endsWith('.md'))) {
    const content = await readFile(join(WIKI_DIR, file), 'utf-8');
    const titleMatch = content.match(/title:\s*["']?(.+?)["']?\s*$/m);
    if (titleMatch && titleMatch[1].trim() === issueTitle) {
      return { filepath: join(WIKI_DIR, file), filename: file, content };
    }
  }

  return null;
}

// OpenAI API 호출
async function callOpenAI(messages, options = {}) {
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

// 피드백 처리
async function processFeedback(issueNumber, issueTitle, commentBody) {
  console.log('🤖 피드백 처리 시작...');
  console.log(`   Issue #${issueNumber}: ${issueTitle}`);
  console.log(`   피드백: ${commentBody.slice(0, 100)}...`);

  // 문서 찾기
  const doc = await findDocumentByTitle(issueTitle);
  if (!doc) {
    console.log('⚠️ 해당 Issue에 연결된 문서를 찾을 수 없습니다.');
    console.log(`   찾으려는 제목: ${issueTitle}`);
    return { hasChanges: false, reason: 'document_not_found' };
  }

  console.log(`   문서 발견: ${doc.filename}`);

  // 시스템 프롬프트
  const systemPrompt = `당신은 SEPilot Wiki의 기술 문서 편집 AI입니다.
Maintainer의 피드백에 따라 기존 문서를 수정합니다.

## 핵심 원칙 (반드시 준수)
- 피드백 내용을 정확히 반영하세요.
- 확실하게 알고 있는 사실만 작성하세요.
- 불확실한 정보나 추측은 절대 포함하지 마세요.
- 허위 정보, 상상의 정보, 검증되지 않은 내용을 작성하지 마세요.

## 수정 규칙
1. 기존 문서의 구조와 스타일을 유지합니다.
2. 피드백에서 요청한 부분만 수정합니다.
3. frontmatter 형식을 유지합니다.
4. 수정된 전체 문서를 반환합니다.
5. 마크다운 코드 블록 없이 순수 마크다운만 반환합니다.`;

  // 사용자 프롬프트
  const userPrompt = `다음 문서를 피드백에 따라 수정해주세요.

## 기존 문서
\`\`\`markdown
${doc.content}
\`\`\`

## Maintainer 피드백
${commentBody}

피드백을 반영하여 수정된 전체 문서를 반환해주세요. 마크다운 코드 블록(\`\`\`) 없이 순수 마크다운만 반환하세요.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  // AI 호출
  const newContent = await callOpenAI(messages, {
    temperature: 0.1,
    maxTokens: 8000,
  });

  // 파일 저장
  await writeFile(doc.filepath, newContent);

  console.log('✅ 문서 수정 완료');
  console.log(`   파일: ${doc.filepath}`);

  return {
    hasChanges: true,
    filepath: doc.filepath,
    filename: doc.filename,
  };
}

// 메인 함수
async function main() {
  const args = parseArgs();

  // 필수 인자 확인
  if (!args['issue-number'] || !args['comment-body']) {
    console.error('❌ 오류: --issue-number와 --comment-body 인자가 필요합니다.');
    console.error(
      '사용법: node scripts/process-feedback.js --issue-number 123 --issue-title "제목" --comment-body "피드백"'
    );
    process.exit(1);
  }

  const issueNumber = args['issue-number'];
  const issueTitle = args['issue-title'] || '';
  const commentBody = args['comment-body'] || '';

  try {
    const result = await processFeedback(issueNumber, issueTitle, commentBody);

    console.log('\n📄 처리 결과:');
    console.log(JSON.stringify(result, null, 2));

    // GitHub Actions 출력 설정
    if (process.env.GITHUB_OUTPUT) {
      const output = [`has_changes=${result.hasChanges}`].join('\n');
      await writeFile(process.env.GITHUB_OUTPUT, output, { flag: 'a' });
    }
  } catch (error) {
    console.error('❌ 피드백 처리 실패:', error.message);
    process.exit(1);
  }
}

main();
