/**
 * GitHub Webhook 이벤트 핸들러
 */
import { spawn } from 'child_process';
import { join } from 'path';

// 이벤트 페이로드 타입
interface IssuePayload {
  action: string;
  issue: {
    number: number;
    title: string;
    body: string | null;
    state: string;
    labels: Array<{ name: string }>;
    user: { login: string };
    html_url: string;
  };
  repository: {
    full_name: string;
  };
  sender: {
    login: string;
  };
  label?: {
    name: string;
  };
}

interface CommentPayload {
  action: string;
  issue: {
    number: number;
    title: string;
    state: string;
    labels: Array<{ name: string }>;
    user: { login: string };
  };
  comment: {
    id: number;
    body: string;
    user: {
      login: string;
    };
    author_association: string;
  };
  repository: {
    full_name: string;
  };
}

// 처리 결과 타입
interface HandlerResult {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
}

/**
 * Issue 이벤트 처리
 */
export async function processIssueEvent(
  payload: IssuePayload
): Promise<HandlerResult> {
  const { action, issue, label } = payload;

  console.log(
    `[Webhook] Issue 이벤트: #${issue.number} ${action}${label ? ` (${label.name})` : ''}`
  );

  switch (action) {
    case 'labeled':
      return handleIssueLabeled(payload);

    case 'closed':
      return handleIssueClosed(payload);

    case 'reopened':
      return handleIssueReopened(payload);

    default:
      return {
        success: true,
        message: `이벤트 무시됨: ${action}`,
      };
  }
}

/**
 * Issue Comment 이벤트 처리
 */
export async function processCommentEvent(
  payload: CommentPayload
): Promise<HandlerResult> {
  const { action, comment, issue } = payload;

  console.log(
    `[Webhook] Comment 이벤트: #${issue.number} by ${comment.user.login}`
  );

  if (action !== 'created') {
    return {
      success: true,
      message: `코멘트 이벤트 무시됨: ${action}`,
    };
  }

  // maintainer 권한 확인
  const authorAssociation = comment.author_association;
  const isMaintainer = ['OWNER', 'MEMBER', 'COLLABORATOR'].includes(
    authorAssociation
  );

  if (!isMaintainer) {
    return {
      success: true,
      message: '일반 사용자 코멘트 - 처리 건너뜀',
    };
  }

  return handleMaintainerFeedback(payload);
}

/**
 * Issue labeled 이벤트 처리
 */
async function handleIssueLabeled(payload: IssuePayload): Promise<HandlerResult> {
  const { label, issue } = payload;

  if (!label) {
    return { success: true, message: '라벨 정보 없음' };
  }

  if (label.name === 'request') {
    // 문서 생성 요청
    return runIssueScript('generate-document.js', issue.number);
  }

  if (label.name === 'invalid') {
    // 문서 검토 요청
    return runIssueScript('mark-invalid.js', issue.number);
  }

  return {
    success: true,
    message: `라벨 무시됨: ${label.name}`,
  };
}

/**
 * Issue closed 이벤트 처리
 */
async function handleIssueClosed(payload: IssuePayload): Promise<HandlerResult> {
  const { issue } = payload;

  // draft 라벨이 있으면 발행
  const hasDraft = issue.labels.some((l) => l.name === 'draft');
  if (!hasDraft) {
    return {
      success: true,
      message: 'draft 라벨 없음 - 발행 건너뜀',
    };
  }

  return runIssueScript('publish-document.js', issue.number);
}

/**
 * Issue reopened 이벤트 처리
 */
async function handleIssueReopened(
  payload: IssuePayload
): Promise<HandlerResult> {
  const { issue } = payload;

  // published 라벨이 있으면 발행 취소
  const hasPublished = issue.labels.some((l) => l.name === 'published');
  if (!hasPublished) {
    return {
      success: true,
      message: 'published 라벨 없음 - 발행 취소 건너뜀',
    };
  }

  return runIssueScript('unpublish-document.js', issue.number);
}

/**
 * Maintainer 피드백 처리
 */
async function handleMaintainerFeedback(
  payload: CommentPayload
): Promise<HandlerResult> {
  const { issue } = payload;

  return runIssueScript('process-feedback.js', issue.number);
}

/**
 * Issue 처리 스크립트 실행
 */
function runIssueScript(
  scriptName: string,
  issueNumber: number
): Promise<HandlerResult> {
  return new Promise((resolve) => {
    const scriptPath = join(process.cwd(), 'scripts', 'issue', scriptName);

    console.log(`[Webhook] 스크립트 실행: ${scriptName} #${issueNumber}`);

    const child = spawn('node', [scriptPath], {
      env: {
        ...process.env,
        ISSUE_NUMBER: String(issueNumber),
      },
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let resolved = false;
    let timeoutId: NodeJS.Timeout | null = null;
    let killTimeoutId: NodeJS.Timeout | null = null;

    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (killTimeoutId) clearTimeout(killTimeoutId);
      child.stdout.removeAllListeners();
      child.stderr.removeAllListeners();
      child.removeAllListeners();
    };

    const safeResolve = (result: HandlerResult) => {
      if (resolved) return;
      resolved = true;
      cleanup();
      resolve(result);
    };

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`[Webhook] 스크립트 완료: ${scriptName}`);
        safeResolve({
          success: true,
          message: `스크립트 실행 완료: ${scriptName}`,
          data: { issueNumber, output: stdout.slice(0, 500) },
        });
      } else {
        console.error(`[Webhook] 스크립트 실패: ${scriptName}`, stderr);
        safeResolve({
          success: false,
          message: `스크립트 실행 실패: ${scriptName}`,
          data: { issueNumber, error: stderr || stdout },
        });
      }
    });

    child.on('error', (error) => {
      console.error(`[Webhook] 스크립트 오류: ${scriptName}`, error);
      safeResolve({
        success: false,
        message: `스크립트 실행 오류: ${scriptName}`,
        data: { issueNumber, error: error.message },
      });
    });

    // 5분 타임아웃
    timeoutId = setTimeout(() => {
      console.warn(`[Webhook] 스크립트 타임아웃, SIGTERM 전송: ${scriptName}`);
      child.kill('SIGTERM');

      // SIGTERM 후 10초 대기, 여전히 실행 중이면 SIGKILL
      killTimeoutId = setTimeout(() => {
        if (!resolved) {
          console.warn(`[Webhook] SIGTERM 무응답, SIGKILL 전송: ${scriptName}`);
          child.kill('SIGKILL');
        }
      }, 10000);

      // 타임아웃 결과 반환 (프로세스 종료와 별개로)
      safeResolve({
        success: false,
        message: `스크립트 타임아웃: ${scriptName}`,
      });
    }, 5 * 60 * 1000);
  });
}

/**
 * Ping 이벤트 처리 (Webhook 연결 테스트)
 */
export function processPingEvent(payload: {
  zen: string;
  hook_id: number;
}): HandlerResult {
  console.log(`[Webhook] Ping 수신: ${payload.zen}`);
  return {
    success: true,
    message: 'Pong!',
    data: { zen: payload.zen, hookId: payload.hook_id },
  };
}
