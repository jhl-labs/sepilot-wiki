/**
 * 스케줄러 실행 이력 API
 * GET /api/scheduler/history - 실행 이력 조회
 */
import { NextRequest, NextResponse } from 'next/server';
import { getExecutionHistory } from '@/lib/scheduler';
import { checkAdminApiAuth } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  try {
    if (!checkAdminApiAuth(request)) {
      return NextResponse.json(
        { error: '인증 필요' },
        { status: 401 }
      );
    }

    // 쿼리 파라미터로 limit 지정 가능
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const jobName = searchParams.get('job');

    const safeLimit = Math.max(1, Math.min(Number.isNaN(limit) ? 50 : limit, 100));
    let history = await getExecutionHistory(safeLimit);

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
      { error: '실행 이력 조회 실패' },
      { status: 500 }
    );
  }
}
