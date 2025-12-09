/**
 * Issue 처리 워크플로우 공통 모듈
 * 여러 스크립트에서 반복되는 Issue 처리 보일러플레이트 추출
 */

import { parseArgs, setGitHubOutput } from './utils.js';
import { getGitHubInfoFromEnv, collectIssueContext } from './issue-context.js';

/**
 * Issue 워크플로우 실행
 * CLI 인자 파싱, GitHub 정보 추출, 컨텍스트 수집, 에러 처리를 자동화
 *
 * @param {Object} options - 워크플로우 옵션
 * @param {string} options.scriptName - 스크립트 이름 (로깅용)
 * @param {Array<string>} options.requiredArgs - 필수 인자 목록
 * @param {Function} handler - 실제 작업을 수행하는 핸들러 함수
 *   @param {Object} context - Issue 컨텍스트
 *   @param {Object} args - CLI 인자
 *   @param {Object} githubInfo - GitHub 정보
 *   @returns {Promise<Object>} outputs - GitHub Actions 출력
 *
 * @example
 * runIssueWorkflow({
 *   scriptName: 'generate-document',
 *   requiredArgs: ['issue-number', 'issue-title']
 * }, async (context, args, githubInfo) => {
 *   // 작업 수행
 *   return { document_path: '/wiki/my-doc.md' };
 * });
 */
export async function runIssueWorkflow(options, handler) {
  const { scriptName, requiredArgs = ['issue-number'] } = options;

  console.log(`🚀 ${scriptName} 시작...`);

  const args = parseArgs();

  // 필수 인자 검증
  for (const arg of requiredArgs) {
    if (!args[arg]) {
      console.error(`❌ 오류: --${arg} 인자가 필요합니다.`);
      process.exit(1);
    }
  }

  const issueNumber = parseInt(args['issue-number'], 10);
  const githubInfo = getGitHubInfoFromEnv();

  try {
    // Issue 컨텍스트 수집
    const context = await collectIssueContext({
      owner: githubInfo.owner,
      repo: githubInfo.repo,
      issueNumber,
      issueTitle: args['issue-title'],
      issueBody: args['issue-body'],
      token: githubInfo.token,
    });

    // 핸들러 실행
    const outputs = await handler(context, args, githubInfo);

    // GitHub Actions 출력 설정
    if (outputs) {
      await setGitHubOutput(outputs);
    }

    console.log(`✅ ${scriptName} 완료`);
  } catch (error) {
    console.error(`❌ ${scriptName} 실패:`, error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

/**
 * 간단한 스크립트 실행 래퍼
 * Issue 컨텍스트가 필요없는 스크립트용
 *
 * @param {string} scriptName - 스크립트 이름
 * @param {Function} handler - 핸들러 함수
 */
export async function runSimpleScript(scriptName, handler) {
  console.log(`🚀 ${scriptName} 시작...`);

  try {
    const args = parseArgs();
    const result = await handler(args);

    if (result) {
      await setGitHubOutput(result);
    }

    console.log(`✅ ${scriptName} 완료`);
  } catch (error) {
    console.error(`❌ ${scriptName} 실패:`, error.message);
    process.exit(1);
  }
}

/**
 * 작업 결과를 GitHub 출력으로 설정
 * @param {Object} outputs - 출력할 값들
 */
export async function outputResults(outputs) {
  await setGitHubOutput(outputs);
}
