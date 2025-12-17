/**
 * 스케줄러 실행 이력 API
 * GET /api/scheduler/history - 실행 이력 조회
 */
import { NextRequest, NextResponse } from 'next/server';
import { getExecutionHistory } from '@/lib/scheduler';

export async function GET(request: NextRequest) {
  try {
    // AUTH_MODE가 public이면 인증 없이 허용
    if (process.env.AUTH_MODE !== 'public') {
      const authHeader = request.headers.get('authorization');
      const apiKey = process.env.SCHEDULER_API_KEY;

      if (apiKey && authHeader !== `Bearer ${apiKey}`) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    // 쿼리 파라미터로 limit 지정 가능
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const jobName = searchParams.get('job');

    let history = await getExecutionHistory(Math.min(limit, 100));

    // 특정 작업으로 필터링
    if (jobName) {
      history = history.filter((h) => h.jobName === jobName);
    }

    return NextResponse.json({
      history,
      totalCount: history.length,
      limit,
    });
  } catch (error) {
    console.error('[Scheduler API] 이력 조회 오류:', error);
    return NextResponse.json(
      { error: 'Failed to get history' },
      { status: 500 }
    );
  }
}
