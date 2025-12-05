#!/usr/bin/env node

/**
 * AI를 사용하여 문서를 생성하는 스크립트
 * GitHub Issue의 request 라벨이 붙으면 issue-handler.yml에서 호출됨
 *
 * 환경 변수:
 * - OPENAI_BASE_URL: OpenAI API 호환 엔드포인트 (기본: https://api.openai.com/v1)
 * - OPENAI_API_KEY: API 키 (또는 OPENAI_TOKEN)
 * - OPENAI_MODEL: 사용할 모델 (기본: gpt-4o)
 * - GITHUB_REPOSITORY: owner/repo 형식
 * - GITHUB_TOKEN: GitHub API 토큰
 *
 * 사용법:
 * node scripts/generate-document.js --issue-number 123 --issue-title "문서 제목" --issue-body "요청 내용"
 */

import { writeFile, mkdir, readFile, readdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import {
  collectIssueContext,
  resolveDocumentPath,
  getGitHubInfoFromEnv,
} from './lib/issue-context.js';

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

// 기존 문서 목록 가져오기 (컨텍스트용)
async function getExistingDocuments() {
  if (!existsSync(WIKI_DIR)) {
    return [];
  }

  const files = await readdir(WIKI_DIR);
  const docs = [];

  for (const file of files.filter((f) => f.endsWith('.md'))) {
    const content = await readFile(join(WIKI_DIR, file), 'utf-8');
    const titleMatch = content.match(/^#\s+(.+)$/m) || content.match(/title:\s*(.+)$/m);
    docs.push({
      filename: file,
      title: titleMatch ? titleMatch[1].trim() : file.replace('.md', ''),
    });
  }

  return docs;
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

// 문서 생성
async function generateDocument(context) {
  console.log('🤖 AI 문서 생성 시작...');
  console.log(`   Issue #${context.issueNumber}: ${context.issueTitle}`);
  console.log(`   모델: ${OPENAI_MODEL}`);
  console.log(`   API: ${OPENAI_BASE_URL}`);

  // 기존 문서 목록 가져오기
  const existingDocs = await getExistingDocuments();
  const existingDocsContext =
    existingDocs.length > 0
      ? `\n기존 문서 목록:\n${existingDocs.map((d) => `- ${d.title} (${d.filename})`).join('\n')}`
      : '';

  // 시스템 프롬프트
  const systemPrompt = `당신은 SEPilot Wiki의 기술 문서 작성 AI입니다.
사용자의 요청에 따라 정확하고 신뢰할 수 있는 기술 문서를 작성합니다.

## 핵심 원칙 (반드시 준수)
- 확실하게 알고 있는 사실만 작성하세요.
- 불확실한 정보나 추측은 절대 포함하지 마세요.
- 모르는 내용은 "추가 조사가 필요합니다" 또는 "공식 문서를 참조하세요"라고 명시하세요.
- 허위 정보, 상상의 정보, 검증되지 않은 내용을 작성하지 마세요.

## 작성 규칙
1. 항상 한국어로 작성합니다.
2. 마크다운 형식을 사용합니다.
3. 문서 시작에 YAML frontmatter만 포함합니다 (제목은 본문에서 H1으로 작성하지 않음):
   ---
   title: 문서 제목
   author: SEPilot AI
   status: draft
   tags: [관련, 태그, 목록]
   ---
4. frontmatter 다음에 바로 H2(##)부터 본문을 시작합니다. H1(#) 제목은 사용하지 마세요.
5. 명확하고 간결한 설명을 제공합니다.
6. 필요한 경우 코드 예제를 포함합니다.
7. 코드 예제는 실제로 동작하는 코드만 포함하세요.
8. 외부 라이브러리나 도구를 언급할 때는 공식 문서 링크를 제공하세요.
${existingDocsContext}`;

  // 사용자 프롬프트 - 전체 Issue 컨텍스트 포함
  const userPrompt = `다음 Issue의 요청에 대한 문서를 작성해주세요:

${context.timeline}

위 요청에 맞는 완전한 마크다운 문서를 작성해주세요.
마크다운 코드 블록(\`\`\`) 없이 순수 마크다운만 반환하세요.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  // AI 호출
  const content = await callOpenAI(messages, {
    temperature: 0.1,
    maxTokens: 8000,
  });

  // 문서 경로 결정
  const docPath = resolveDocumentPath(context, WIKI_DIR);

  // wiki 폴더 생성
  await mkdir(WIKI_DIR, { recursive: true });

  // 파일 저장
  await writeFile(docPath.filepath, content);

  console.log('✅ 문서 생성 완료');
  console.log(`   파일: ${docPath.filepath}`);
  console.log(`   슬러그: ${docPath.slug}`);

  return {
    filepath: docPath.filepath,
    filename: docPath.filename,
    slug: docPath.slug,
    content,
  };
}

// 메인 함수
async function main() {
  const args = parseArgs();

  // 필수 인자 확인
  if (!args['issue-number']) {
    console.error('❌ 오류: --issue-number 인자가 필요합니다.');
    console.error(
      '사용법: node scripts/generate-document.js --issue-number 123 --issue-title "제목" --issue-body "내용"'
    );
    process.exit(1);
  }

  const issueNumber = parseInt(args['issue-number'], 10);
  const issueTitle = args['issue-title'] || `문서 요청 #${issueNumber}`;
  const issueBody = args['issue-body'] || '';

  // GitHub 정보 가져오기
  const githubInfo = getGitHubInfoFromEnv();

  try {
    // Issue 전체 컨텍스트 수집
    const context = await collectIssueContext({
      owner: githubInfo.owner,
      repo: githubInfo.repo,
      issueNumber,
      issueTitle,
      issueBody,
      token: githubInfo.token,
    });

    const result = await generateDocument(context);

    // 결과를 JSON으로 출력 (GitHub Actions에서 활용)
    console.log('\n📄 생성 결과:');
    console.log(JSON.stringify(result, null, 2));

    // GitHub Actions 출력 설정
    if (process.env.GITHUB_OUTPUT) {
      const output = [
        `filepath=${result.filepath}`,
        `filename=${result.filename}`,
        `slug=${result.slug}`,
      ].join('\n');
      await writeFile(process.env.GITHUB_OUTPUT, output, { flag: 'a' });
    }
  } catch (error) {
    console.error('❌ 문서 생성 실패:', error.message);
    process.exit(1);
  }
}

main();
