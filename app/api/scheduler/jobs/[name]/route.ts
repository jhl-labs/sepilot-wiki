/**
 * 개별 작업 제어 API
 * POST /api/scheduler/jobs/[name] - 작업 수동 실행
 */
import { NextRequest, NextResponse } from 'next/server';
import { runJobManually, getSchedulerStatus } from '@/lib/scheduler';

interface RouteParams {
  params: Promise<{ name: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { name } = await params;

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
    const job = status.jobs.find((j) => j.name === name);

    if (!job) {
      return NextResponse.json(
        { error: `Job '${name}' not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({ job });
  } catch (error) {
    console.error('[Scheduler API] 작업 조회 오류:', error);
    return NextResponse.json(
      { error: 'Failed to get job' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { name } = await params;

    // 인증 확인
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

    console.log(`[Scheduler API] 수동 실행 요청: ${name}`);

    const result = await runJobManually(name);

    return NextResponse.json({
      jobName: name,
      ...result,
    });
  } catch (error) {
    console.error('[Scheduler API] 작업 실행 오류:', error);
    return NextResponse.json(
      { error: 'Failed to run job' },
      { status: 500 }
    );
  }
}
