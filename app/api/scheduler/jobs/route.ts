/**
 * 스케줄러 작업 목록 API
 * GET /api/scheduler/jobs - 작업 목록 조회
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSchedulerStatus } from '@/lib/scheduler';

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

    const status = await getSchedulerStatus();

    return NextResponse.json({
      jobs: status.jobs,
      totalCount: status.jobs.length,
    });
  } catch (error) {
    console.error('[Scheduler API] 작업 목록 조회 오류:', error);
    return NextResponse.json(
      { error: 'Failed to get jobs' },
      { status: 500 }
    );
  }
}
