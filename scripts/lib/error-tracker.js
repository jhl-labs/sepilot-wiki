/**
 * 에러 트래커
 *
 * 워크플로우 실패를 구조화하여 기록
 * 동일 에러 3회 연속 시 GitHub Issue 자동 생성
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const DATA_DIR = join(process.cwd(), 'public', 'data');
const ERROR_LOG_FILE = join(DATA_DIR, 'error-log.json');

/** 동일 에러 연속 발생 시 Issue 생성 임계값 */
const CONSECUTIVE_THRESHOLD = 3;

/** 최대 에러 로그 항목 수 */
const MAX_ENTRIES = 200;

/**
 * 에러 로그 로드
 * @returns {Promise<Object>}
 */
async function loadErrorLog() {
  if (!existsSync(ERROR_LOG_FILE)) {
    return { entries: [], lastUpdated: null };
  }
  try {
    return JSON.parse(await readFile(ERROR_LOG_FILE, 'utf-8'));
  } catch {
    return { entries: [], lastUpdated: null };
  }
}

/**
 * 에러 로그 저장
 * @param {Object} data
 */
async function saveErrorLog(data) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(ERROR_LOG_FILE, JSON.stringify(data, null, 2));
}

/**
 * 에러 기록
 *
 * @param {Object} error
 * @param {string} error.workflow - 워크플로우 이름
 * @param {string} error.step - 실패한 step
 * @param {string} error.message - 에러 메시지
 * @param {string} [error.runUrl] - 실행 URL
 * @returns {Promise<{shouldCreateIssue: boolean, consecutiveCount: number}>}
 */
export async function trackError(error) {
  const data = await loadErrorLog();

  const entry = {
    timestamp: new Date().toISOString(),
    workflow: error.workflow,
    step: error.step,
    message: error.message,
    runUrl: error.runUrl || null,
  };

  data.entries.push(entry);

  // 최대 항목 수 제한
  if (data.entries.length > MAX_ENTRIES) {
    data.entries = data.entries.slice(-MAX_ENTRIES);
  }
  data.lastUpdated = new Date().toISOString();

  await saveErrorLog(data);

  // 동일 에러 연속 발생 체크
  const errorKey = `${error.workflow}:${error.step}:${error.message}`;
  const recentEntries = data.entries.slice(-10).reverse();
  let consecutiveCount = 0;

  for (const e of recentEntries) {
    const key = `${e.workflow}:${e.step}:${e.message}`;
    if (key === errorKey) {
      consecutiveCount++;
    } else {
      break;
    }
  }

  return {
    shouldCreateIssue: consecutiveCount >= CONSECUTIVE_THRESHOLD,
    consecutiveCount,
  };
}

/**
 * GitHub Issue 생성 (동일 에러 반복 시)
 *
 * @param {Object} params
 * @param {string} params.workflow
 * @param {string} params.step
 * @param {string} params.message
 * @param {number} params.consecutiveCount
 */
export async function createErrorIssue(params) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY;

  if (!token || !repo) {
    console.warn('⚠️ GITHUB_TOKEN 또는 GITHUB_REPOSITORY 미설정, Issue 생성 건너뜀');
    return;
  }

  const title = `[자동] ${params.workflow} - ${params.step} 반복 실패 (${params.consecutiveCount}회)`;
  const body = [
    '## 반복 에러 감지',
    '',
    `**워크플로우**: ${params.workflow}`,
    `**Step**: ${params.step}`,
    `**연속 실패**: ${params.consecutiveCount}회`,
    '',
    '### 에러 메시지',
    '```',
    params.message,
    '```',
    '',
    '> 이 Issue는 에러 트래커에 의해 자동 생성되었습니다.',
  ].join('\n');

  const [owner, repoName] = repo.split('/');
  const url = `https://api.github.com/repos/${owner}/${repoName}/issues`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({
        title,
        body,
        labels: ['bug', 'automated'],
      }),
    });

    if (response.ok) {
      const issue = await response.json();
      console.log(`✅ 에러 Issue 생성: #${issue.number}`);
    } else {
      console.warn(`⚠️ Issue 생성 실패: ${response.status}`);
    }
  } catch (err) {
    console.warn(`⚠️ Issue 생성 실패: ${err.message}`);
  }
}

/**
 * 워크플로우 에러 추적 편의 함수
 * @param {string} workflowName - 워크플로우 이름
 * @param {string} stepName - 실패한 step
 * @param {string} errorMessage - 에러 메시지
 * @param {string} [runUrl] - 실행 URL
 * @returns {Promise<{shouldCreateIssue: boolean, consecutiveCount: number}>}
 */
export async function trackWorkflowError(workflowName, stepName, errorMessage, runUrl) {
  const result = await trackError({
    workflow: workflowName,
    step: stepName,
    message: errorMessage,
    runUrl,
  });

  if (result.shouldCreateIssue) {
    await createErrorIssue({
      workflow: workflowName,
      step: stepName,
      message: errorMessage,
      consecutiveCount: result.consecutiveCount,
    });
  }

  return result;
}

/**
 * 에러 로그 조회
 * @returns {Promise<Object>}
 */
export async function getErrorLog() {
  return loadErrorLog();
}

// CLI 직접 실행 지원
const isDirectRun = process.argv[1]?.includes('error-tracker');
if (isDirectRun) {
  const args = {};
  for (let i = 2; i < process.argv.length; i++) {
    if (process.argv[i].startsWith('--')) {
      const key = process.argv[i].slice(2);
      const value = process.argv[i + 1];
      if (value && !value.startsWith('--')) {
        args[key] = value;
        i++;
      }
    }
  }

  if (args.workflow && args.step && args.message) {
    trackWorkflowError(args.workflow, args.step, args.message, args['run-url'])
      .then((result) => {
        console.log(`에러 추적 완료: 연속 ${result.consecutiveCount}회, Issue 생성: ${result.shouldCreateIssue}`);
      })
      .catch((err) => {
        console.error('에러 추적 실패:', err.message);
        process.exit(1);
      });
  } else {
    console.error('사용법: bun run scripts/lib/error-tracker.js --workflow "..." --step "..." --message "..."');
    process.exit(1);
  }
}
