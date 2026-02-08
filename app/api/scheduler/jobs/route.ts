/**
 * 스케줄러 작업 목록 API
 * GET /api/scheduler/jobs - 작업 목록 조회
 */
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getSchedulerStatus } from '@/lib/scheduler';
import { checkAdminApiAuth } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  try {
    if (!checkAdminApiAuth(request)) {
      return NextResponse.json({ error: '인증 필요' }, { status: 401 });
    }

    const status = await getSchedulerStatus();

    return NextResponse.json({
      jobs: status.jobs,
      totalCount: status.jobs.length,
    });
  } catch (error) {
    console.error('[Scheduler API] 작업 목록 조회 오류:', error);
    return NextResponse.json(
      { error: '작업 목록 조회 실패' },
      { status: 500 }
    );
  }
}
