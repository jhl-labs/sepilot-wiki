#!/usr/bin/env node

/**
 * Maintainer 피드백을 AI로 처리하여 문서를 수정하는 스크립트
 * GitHub Issue에 maintainer가 댓글을 달면 issue-handler.yml에서 호출됨
 *
 * Issue의 전체 컨텍스트(body + 모든 comments)를 수집하여 LLM이 문맥을 이해하고
 * 적절한 문서를 찾아 수정함
 *
 * 환경 변수:
 * - OPENAI_BASE_URL: OpenAI API 호환 엔드포인트
 * - OPENAI_API_KEY: API 키 (또는 OPENAI_TOKEN)
 * - OPENAI_MODEL: 사용할 모델
 * - GITHUB_REPOSITORY: owner/repo 형식
 * - GITHUB_TOKEN: GitHub API 토큰
 *
 * 사용법:
 * node scripts/process-feedback.js --issue-number 123 --issue-title "문서 제목" --comment-body "수정 요청 내용"
 */

import { writeFile, readFile, readdir, mkdir } from 'fs/promises';
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

// 문서 찾기 (여러 방법 시도)
async function findDocument(context) {
  // 1. 컨텍스트에서 문서 경로 추출 시도
  const docPath = resolveDocumentPath(context, WIKI_DIR);

  if (existsSync(docPath.filepath)) {
    const content = await readFile(docPath.filepath, 'utf-8');
    return { ...docPath, content, found: true };
  }

  // 2. wiki 폴더의 모든 문서 검색
  if (existsSync(WIKI_DIR)) {
    const files = await readdir(WIKI_DIR);
    for (const file of files.filter((f) => f.endsWith('.md'))) {
      const filepath = join(WIKI_DIR, file);
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

// 기존 문서 목록 가져오기
async function getExistingDocuments() {
  if (!existsSync(WIKI_DIR)) {
    return [];
  }

  const files = await readdir(WIKI_DIR);
  const docs = [];

  for (const file of files.filter((f) => f.endsWith('.md'))) {
    const content = await readFile(join(WIKI_DIR, file), 'utf-8');
    const titleMatch = content.match(/title:\s*["']?(.+?)["']?\s*$/m);
    docs.push({
      filename: file,
      title: titleMatch ? titleMatch[1].trim() : file.replace('.md', ''),
      preview: content.slice(0, 200),
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

// 피드백 처리
async function processFeedback(context, currentCommentBody) {
  console.log('🤖 피드백 처리 시작...');
  console.log(`   Issue #${context.issueNumber}: ${context.issueTitle}`);
  console.log(`   현재 피드백: ${currentCommentBody.slice(0, 100)}...`);

  // 문서 찾기
  const doc = await findDocument(context);
  const existingDocs = await getExistingDocuments();

  // 시스템 프롬프트
  const systemPrompt = `당신은 SEPilot Wiki의 기술 문서 편집 AI입니다.
Maintainer의 피드백에 따라 문서를 수정, 생성, 또는 삭제합니다.

## 핵심 원칙 (반드시 준수)
- Issue의 전체 컨텍스트를 이해하고 적절한 작업을 수행하세요.
- 피드백 내용을 정확히 반영하세요.
- 확실하게 알고 있는 사실만 작성하세요.
- 불확실한 정보나 추측은 절대 포함하지 마세요.

## 현재 상황 분석
- 문서 발견 여부: ${doc.found ? '예' : '아니오'}
- 문서 경로: ${doc.filepath}
${doc.found ? `- 문서 내용 길이: ${doc.content.length}자` : ''}

## 작업 유형 결정
피드백 내용을 분석하여 다음 중 하나를 수행하세요:
1. **수정**: 기존 문서의 내용 변경
2. **복구**: 삭제된 문서 재생성 (컨텍스트에서 이전 내용 참조)
3. **삭제**: 문서 삭제 요청 시 빈 내용 반환

## 응답 형식
반드시 다음 JSON 형식으로 응답하세요:
\`\`\`json
{
  "action": "modify" | "create" | "delete",
  "targetPath": "wiki/파일명.md",
  "content": "수정된 전체 마크다운 내용 (삭제 시 null)",
  "summary": "수행한 작업 요약"
}
\`\`\`

## 기존 문서 목록
${existingDocs.map((d) => `- ${d.title} (${d.filename})`).join('\n')}`;

  // 사용자 프롬프트 - 전체 Issue 컨텍스트 포함
  const userPrompt = `다음 Issue의 컨텍스트를 이해하고 현재 피드백을 처리해주세요:

${context.timeline}

## 현재 처리할 피드백
${currentCommentBody}

${doc.found ? `## 현재 문서 내용\n\`\`\`markdown\n${doc.content}\n\`\`\`` : '## 문서가 존재하지 않습니다\n이전 컨텍스트를 참조하여 문서를 복구하거나 새로 생성해주세요.'}

피드백에 따라 적절한 작업을 수행하고 JSON 형식으로 응답해주세요.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  // AI 호출
  const response = await callOpenAI(messages, {
    temperature: 0.1,
    maxTokens: 8000,
  });

  // JSON 파싱
  let result;
  try {
    const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) || response.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : response;
    result = JSON.parse(jsonStr);
  } catch (e) {
    console.error('JSON 파싱 실패, 기본 수정으로 처리:', e.message);
    result = {
      action: 'modify',
      targetPath: doc.filepath,
      content: response,
      summary: '피드백 반영',
    };
  }

  // 작업 수행
  if (result.action === 'delete') {
    console.log('🗑️ 문서 삭제 요청');
    // 실제 삭제는 위험하므로 status만 변경
    if (doc.found) {
      const deletedContent = doc.content.replace(/status:\s*\w+/, 'status: deleted');
      await writeFile(doc.filepath, deletedContent);
    }
    return { hasChanges: true, action: 'delete', summary: result.summary };
  }

  if (result.action === 'create' || result.action === 'modify') {
    const targetPath = result.targetPath || doc.filepath;
    const fullPath = targetPath.startsWith('/') ? targetPath : join(process.cwd(), targetPath);

    // 디렉토리 생성
    await mkdir(WIKI_DIR, { recursive: true });

    // 파일 저장
    await writeFile(fullPath, result.content);

    console.log(`✅ 문서 ${result.action === 'create' ? '생성' : '수정'} 완료`);
    console.log(`   파일: ${fullPath}`);
    console.log(`   요약: ${result.summary}`);

    return {
      hasChanges: true,
      action: result.action,
      filepath: fullPath,
      summary: result.summary,
    };
  }

  return { hasChanges: false, reason: 'no_action_needed' };
}

// 메인 함수
async function main() {
  const args = parseArgs();

  // 필수 인자 확인
  if (!args['issue-number']) {
    console.error('❌ 오류: --issue-number 인자가 필요합니다.');
    console.error(
      '사용법: node scripts/process-feedback.js --issue-number 123 --issue-title "제목" --comment-body "피드백"'
    );
    process.exit(1);
  }

  const issueNumber = parseInt(args['issue-number'], 10);
  const issueTitle = args['issue-title'] || '';
  const commentBody = args['comment-body'] || '';

  // GitHub 정보 가져오기
  const githubInfo = getGitHubInfoFromEnv();

  try {
    // Issue 전체 컨텍스트 수집
    const context = await collectIssueContext({
      owner: githubInfo.owner,
      repo: githubInfo.repo,
      issueNumber,
      issueTitle,
      token: githubInfo.token,
    });

    const result = await processFeedback(context, commentBody);

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
