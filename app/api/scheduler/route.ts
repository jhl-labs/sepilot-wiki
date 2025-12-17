/**
 * 스케줄러 상태 API
 * GET /api/scheduler - 상태 조회
 * POST /api/scheduler - 시작/중지
 */
import { NextRequest, NextResponse } from 'next/server';
import {
  getSchedulerStatus,
  startScheduler,
  stopScheduler,
  shouldEnableScheduler,
} from '@/lib/scheduler';

// 관리자 인증 확인 (간단한 버전)
async function checkAdminAuth(request: NextRequest): Promise<boolean> {
  // AUTH_MODE가 public이면 인증 없이 허용
  if (process.env.AUTH_MODE === 'public') {
    return true;
  }

  // 실제 환경에서는 세션/토큰 확인 필요
  // 현재는 API 키 방식으로 간단 구현
  const authHeader = request.headers.get('authorization');
  const apiKey = process.env.SCHEDULER_API_KEY;

  if (apiKey && authHeader === `Bearer ${apiKey}`) {
    return true;
  }

  // 추가: NextAuth 세션 확인 로직 가능
  return false;
}

export async function GET(request: NextRequest) {
  try {
    // 인증 확인
    if (!(await checkAdminAuth(request))) {
      return NextResponse.json(
        { error: 'Unauthorized' },
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
      { error: 'Failed to get scheduler status' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    if (!(await checkAdminAuth(request))) {
      return NextResponse.json(
        { error: 'Unauthorized' },
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
      { error: 'Invalid action. Use "start" or "stop"' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[Scheduler API] 제어 오류:', error);
    return NextResponse.json(
      { error: 'Failed to control scheduler' },
      { status: 500 }
    );
  }
}
