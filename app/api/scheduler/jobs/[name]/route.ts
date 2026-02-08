/**
 * 개별 작업 제어 API
 * POST /api/scheduler/jobs/[name] - 작업 수동 실행
 */
import { NextRequest, NextResponse } from 'next/server';
import { runJobManually, getSchedulerStatus } from '@/lib/scheduler';
import { checkAdminApiAuth } from '@/lib/admin-auth';

interface RouteParams {
  params: Promise<{ name: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { name } = await params;

    if (!checkAdminApiAuth(request)) {
      return NextResponse.json({ error: '인증 필요' }, { status: 401 });
    }

    const status = await getSchedulerStatus();
    const job = status.jobs.find((j) => j.name === name);

    if (!job) {
      return NextResponse.json(
        { error: `작업 '${name}'을 찾을 수 없음` },
        { status: 404 }
      );
    }

    return NextResponse.json({ job });
  } catch (error) {
    console.error('[Scheduler API] 작업 조회 오류:', error);
    return NextResponse.json(
      { error: '작업 조회 실패' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { name } = await params;

    if (!checkAdminApiAuth(request)) {
      return NextResponse.json({ error: '인증 필요' }, { status: 401 });
    }

    // body에서 dryRun 옵션 파싱
    let dryRun: boolean | undefined;
    try {
      const body = await request.json();
      if (typeof body.dryRun === 'boolean') {
        dryRun = body.dryRun;
      }
    } catch {
      // body가 없거나 파싱 실패 시 무시
    }

    console.log(`[Scheduler API] 수동 실행 요청: ${name}${dryRun ? ' (DRY_RUN)' : ''}`);

    const result = await runJobManually(name, { dryRun });

    return NextResponse.json({
      jobName: name,
      ...result,
    });
  } catch (error) {
    console.error('[Scheduler API] 작업 실행 오류:', error);
    return NextResponse.json(
      { error: '작업 실행 실패' },
      { status: 500 }
    );
  }
}
