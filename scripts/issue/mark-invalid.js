#!/usr/bin/env node

/**
 * Invalid 라벨이 붙으면 문서에 경고를 추가하고 AI가 문제를 분석하는 스크립트
 * GitHub Issue에 invalid 라벨이 붙으면 issue-handler.yml에서 호출됨
 *
 * Issue의 전체 컨텍스트(body + 모든 comments)를 수집하여 LLM이 문맥을 이해하고
 * 오류를 수정함
 *
 * 환경 변수:
 * - OPENAI_BASE_URL: OpenAI API 호환 엔드포인트
 * - OPENAI_API_KEY: API 키 (또는 OPENAI_TOKEN)
 * - OPENAI_MODEL: 사용할 모델
 * - GITHUB_REPOSITORY: owner/repo 형식
 * - GITHUB_TOKEN: GitHub API 토큰
 *
 * 사용법:
 * node scripts/mark-invalid.js --issue-number 123 --issue-title "문서 제목" --issue-body "오류 내용"
 */

import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import {
  collectIssueContext,
  getGitHubInfoFromEnv,
} from './lib/issue-context.js';
import {
  parseArgs,
  findDocument,
  callOpenAI,
  updateFrontmatterStatus,
  setGitHubOutput,
} from './lib/utils.js';
import { addAIHistoryEntry } from './lib/ai-history.js';
import { addLabels } from './lib/issues-store.js';

// 출력 경로
const WIKI_DIR = join(process.cwd(), 'wiki');

// Invalid 처리
async function markInvalid(context) {
  console.log('⚠️ Invalid 처리 시작...');
  console.log(`   Issue #${context.issueNumber}: ${context.issueTitle}`);

  // 문서 찾기
  const doc = await findDocument(context, WIKI_DIR);

  if (!doc.found) {
    console.log('⚠️ 해당 Issue에 연결된 문서를 찾을 수 없습니다.');
    console.log(`   경로: ${doc.filepath}`);
    return { hasChanges: false, reason: 'document_not_found' };
  }

  console.log(`   문서 발견: ${doc.filename}`);

  // 시스템 프롬프트
  const systemPrompt = `당신은 SEPilot Wiki의 기술 문서 검토 AI입니다.
문서에 오류가 보고되었습니다. Issue의 전체 컨텍스트를 이해하고 보고된 오류를 수정해주세요.

## 핵심 원칙 (반드시 준수)
- Issue 컨텍스트에서 보고된 오류를 정확히 파악하세요.
- 확실하게 알고 있는 사실만 작성하세요.
- 불확실한 정보는 "추가 확인이 필요합니다"라고 명시하세요.
- 허위 정보, 상상의 정보, 검증되지 않은 내용을 작성하지 마세요.

## 수정 규칙
1. 오류로 보고된 내용을 수정합니다.
2. 확실하지 않은 부분은 명확하게 표시합니다.
3. frontmatter 형식을 유지합니다.
4. 문서 상단(frontmatter 바로 다음)에 수정 알림을 추가합니다.
5. 수정된 전체 문서를 반환합니다.
6. 마크다운 코드 블록 없이 순수 마크다운만 반환합니다.`;

  // 사용자 프롬프트 - 전체 Issue 컨텍스트 포함
  const userPrompt = `다음 Issue의 컨텍스트를 이해하고 문서의 오류를 수정해주세요:

${context.timeline}

## 현재 문서 내용
\`\`\`markdown
${doc.content}
\`\`\`

오류를 수정하고, 문서 본문 시작 부분(frontmatter 다음)에 다음 형식의 알림을 추가해주세요:

> ⚠️ **수정됨**: 이 문서는 오류 보고(Issue #${context.issueNumber})에 따라 수정되었습니다.

수정된 전체 문서를 반환해주세요. 마크다운 코드 블록(\`\`\`) 없이 순수 마크다운만 반환하세요.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  // AI 호출
  const newContent = await callOpenAI(messages, {
    temperature: 0.1,
    maxTokens: 8000,
  });

  // status를 needs_review로 변경
  const contentWithStatus = updateFrontmatterStatus(newContent, 'needs_review');

  // 디렉토리 생성
  await mkdir(WIKI_DIR, { recursive: true });

  // 파일 저장
  await writeFile(doc.filepath, contentWithStatus);

  console.log('✅ 문서 수정 완료 (status: needs_review)');
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
  if (!args['issue-number']) {
    console.error('❌ 오류: --issue-number 인자가 필요합니다.');
    console.error(
      '사용법: node scripts/mark-invalid.js --issue-number 123 --issue-title "제목" --issue-body "오류 내용"'
    );
    process.exit(1);
  }

  const issueNumber = parseInt(args['issue-number'], 10);
  const issueTitle = args['issue-title'] || '';
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

    const result = await markInvalid(context);

    // AI History 기록 (변경이 있을 때만)
    if (result.hasChanges) {
      const slug = result.filename ? result.filename.replace('.md', '') : '';
      await addAIHistoryEntry({
        actionType: 'invalid',
        issueNumber,
        issueTitle,
        documentSlug: slug,
        documentTitle: issueTitle,
        summary: `오류 수정: Issue #${issueNumber}에 보고된 문제 해결`,
        trigger: 'invalid_label',
      });

      // Issue 라벨 업데이트 (JSON 파일)
      await addLabels(issueNumber, ['invalid']);
    }

    console.log('\n📄 처리 결과:');
    console.log(JSON.stringify(result, null, 2));

    // GitHub Actions 출력 설정
    await setGitHubOutput({ has_changes: result.hasChanges });
  } catch (error) {
    console.error('❌ Invalid 처리 실패:', error.message);
    process.exit(1);
  }
}

main();
