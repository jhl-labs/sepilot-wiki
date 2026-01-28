/**
 * GitHub Webhook 서명 검증
 */
import crypto from 'crypto';

/**
 * GitHub Webhook 서명 검증
 * @param body - 원본 요청 본문 (문자열)
 * @param signature - x-hub-signature-256 헤더 값
 * @returns 유효성 여부
 */
export function verifyGitHubSignature(
  body: string,
  signature: string | null
): boolean {
  if (!signature) {
    console.warn('[Webhook] 서명 헤더 없음');
    return false;
  }

  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    // 보안: 환경에 관계없이 시크릿 필수
    console.error('[Webhook] GITHUB_WEBHOOK_SECRET 환경변수 미설정 - Webhook 비활성화');
    return false;
  }

  try {
    const expectedSignature =
      'sha256=' +
      crypto.createHmac('sha256', secret).update(body).digest('hex');

    // 타이밍 공격 방지를 위한 상수 시간 비교
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('[Webhook] 서명 검증 오류:', error);
    return false;
  }
}

/**
 * Webhook 요청 유효성 검사
 */
export interface WebhookValidation {
  valid: boolean;
  error?: string;
  event?: string;
  action?: string;
  delivery?: string;
}

export function validateWebhookRequest(
  body: string,
  headers: {
    signature: string | null;
    event: string | null;
    delivery: string | null;
  }
): WebhookValidation {
  // 서명 검증
  if (!verifyGitHubSignature(body, headers.signature)) {
    return { valid: false, error: 'Invalid signature' };
  }

  // 이벤트 헤더 확인
  if (!headers.event) {
    return { valid: false, error: 'Missing x-github-event header' };
  }

  // 본문 파싱 테스트
  try {
    const payload = JSON.parse(body);
    return {
      valid: true,
      event: headers.event,
      action: payload.action,
      delivery: headers.delivery || undefined,
    };
  } catch {
    return { valid: false, error: 'Invalid JSON body' };
  }
}
