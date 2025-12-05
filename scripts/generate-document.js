#!/usr/bin/env node

/**
 * AI를 사용하여 문서를 생성하는 스크립트
 * GitHub Issue의 request 라벨이 붙으면 issue-handler.yml에서 호출됨
 *
 * 환경 변수:
 * - OPENAI_BASE_URL: OpenAI API 호환 엔드포인트 (기본: https://api.openai.com/v1)
 * - OPENAI_API_KEY: API 키 (또는 OPENAI_TOKEN)
 * - OPENAI_MODEL: 사용할 모델 (기본: gpt-4o)
 *
 * 사용법:
 * node scripts/generate-document.js --issue-number 123 --issue-title "문서 제목" --issue-body "요청 내용"
 */

import { writeFile, mkdir, readFile, readdir } from 'fs/promises';
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
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4000,
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
async function generateDocument(issueNumber, issueTitle, issueBody) {
  console.log('🤖 AI 문서 생성 시작...');
  console.log(`   Issue #${issueNumber}: ${issueTitle}`);
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
사용자의 요청에 따라 고품질의 마크다운 문서를 작성합니다.

작성 규칙:
1. 항상 한국어로 작성합니다.
2. 마크다운 형식을 사용합니다.
3. 문서 시작에 YAML frontmatter를 포함합니다:
   ---
   title: 문서 제목
   author: SEPilot AI
   tags: [관련, 태그, 목록]
   ---
4. 명확하고 간결한 설명을 제공합니다.
5. 필요한 경우 코드 예제를 포함합니다.
6. 제목은 H1(#)으로 시작하고, 섹션은 H2(##) 이하를 사용합니다.
${existingDocsContext}`;

  // 사용자 프롬프트
  const userPrompt = `다음 요청에 대한 문서를 작성해주세요:

제목: ${issueTitle}

요청 내용:
${issueBody || '(상세 내용 없음)'}

위 요청에 맞는 완전한 마크다운 문서를 작성해주세요.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  // AI 호출
  const content = await callOpenAI(messages);

  // 슬러그 생성 (제목에서 파일명 생성)
  const slug = issueTitle
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .slice(0, 50);

  const filename = `${slug}.md`;
  const filepath = join(WIKI_DIR, filename);

  // wiki 폴더 생성
  await mkdir(WIKI_DIR, { recursive: true });

  // 파일 저장
  await writeFile(filepath, content);

  console.log('✅ 문서 생성 완료');
  console.log(`   파일: ${filepath}`);
  console.log(`   슬러그: ${slug}`);

  return {
    filepath,
    filename,
    slug,
    content,
  };
}

// 메인 함수
async function main() {
  const args = parseArgs();

  // 필수 인자 확인
  if (!args['issue-number']) {
    console.error('❌ 오류: --issue-number 인자가 필요합니다.');
    console.error('사용법: node scripts/generate-document.js --issue-number 123 --issue-title "제목" --issue-body "내용"');
    process.exit(1);
  }

  const issueNumber = args['issue-number'];
  const issueTitle = args['issue-title'] || `문서 요청 #${issueNumber}`;
  const issueBody = args['issue-body'] || '';

  try {
    const result = await generateDocument(issueNumber, issueTitle, issueBody);

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
