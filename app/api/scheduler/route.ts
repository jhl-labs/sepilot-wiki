/**
 * 스케줄러 상태 API
 * GET /api/scheduler - 상태 조회
 * POST /api/scheduler - 시작/중지
 */
export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import {
  getSchedulerStatus,
  startScheduler,
  stopScheduler,
  shouldEnableScheduler,
} from '@/lib/scheduler';
import { checkAdminApiAuth } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  try {
    // 인증 확인
    if (!checkAdminApiAuth(request)) {
      return NextResponse.json(
        { error: '인증 필요' },
        { status: 401 }
      );
    }

    const status = await getSchedulerStatus();

    return NextResponse.json({
      ...status,
      config: {
        enabled: shouldEnableScheduler(),
        buildMode: process.env.BUILD_MODE || 'development',
        redisEnabled: !!(process.env.REDIS_URL || process.env.REDIS_HOST),
      },
    });
  } catch (error) {
    console.error('[Scheduler API] 상태 조회 오류:', error);
    return NextResponse.json(
      { error: '스케줄러 상태 조회 실패' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    if (!checkAdminApiAuth(request)) {
      return NextResponse.json(
        { error: '인증 필요' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const action = body.action as string;

    if (action === 'start') {
      const started = await startScheduler();
      return NextResponse.json({
        success: started,
        message: started ? '스케줄러 시작됨' : '스케줄러 시작 실패',
      });
    }

    if (action === 'stop') {
      await stopScheduler();
      return NextResponse.json({
        success: true,
        message: '스케줄러 중지됨',
      });
    }

    return NextResponse.json(
      { error: '유효하지 않은 작업. "start" 또는 "stop"을 사용하세요' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[Scheduler API] 제어 오류:', error);
    return NextResponse.json(
      { error: '스케줄러 제어 실패' },
      { status: 500 }
    );
  }
}
