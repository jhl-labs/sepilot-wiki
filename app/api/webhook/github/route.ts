/**
 * GitHub Webhook 수신 엔드포인트
 * POST /api/webhook/github
 */
import { NextRequest, NextResponse } from 'next/server';

/** 로그 인젝션 방지: 개행/제어 문자 제거 */
function sanitizeLog(value: unknown): string {
  // eslint-disable-next-line no-control-regex
  return String(value).replace(/[\n\r\t\x00-\x1f\x7f]/g, '');
}
import { validateWebhookRequest } from '@/lib/webhook/verifier';
import {
  processIssueEvent,
  processCommentEvent,
  processPingEvent,
} from '@/lib/webhook/handler';

export async function POST(request: NextRequest) {
  try {
    // 원본 본문 읽기
    const body = await request.text();

    // 헤더 추출
    const signature = request.headers.get('x-hub-signature-256');
    const event = request.headers.get('x-github-event');
    const delivery = request.headers.get('x-github-delivery');

    // 요청 검증
    const validation = validateWebhookRequest(body, {
      signature,
      event,
      delivery,
    });

    if (!validation.valid) {
      console.error(`[Webhook] 검증 실패: ${validation.error}`);
      return NextResponse.json(
        { error: validation.error },
        { status: 401 }
      );
    }

    console.log(
      `[Webhook] 수신: ${sanitizeLog(validation.event)}${validation.action ? `/${sanitizeLog(validation.action)}` : ''} (${sanitizeLog(validation.delivery)})`
    );

    // 페이로드 파싱
    const payload = JSON.parse(body);

    // 비동기 처리 (즉시 응답)
    // 실제 처리는 백그라운드에서 수행
    setImmediate(async () => {
      try {
        switch (validation.event) {
          case 'ping':
            processPingEvent(payload);
            break;

          case 'issues':
            await processIssueEvent(payload);
            break;

          case 'issue_comment':
            await processCommentEvent(payload);
            break;

          default:
            console.log(`[Webhook] 미지원 이벤트: ${validation.event}`);
        }
      } catch (error) {
        console.error(`[Webhook] 처리 오류:`, error);
      }
    });

    // 즉시 200 응답
    return NextResponse.json({
      received: true,
      event: validation.event,
      action: validation.action,
      delivery: validation.delivery,
    });
  } catch (error) {
    console.error('[Webhook] 요청 처리 오류:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET 요청은 상태 확인용
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'GitHub Webhook endpoint',
    supportedEvents: ['ping', 'issues', 'issue_comment'],
  });
}
