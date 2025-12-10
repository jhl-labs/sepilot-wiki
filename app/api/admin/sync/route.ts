/**
 * 관리자 Git 동기화 API
 * POST: Git pull 실행 (원격 저장소에서 최신 변경사항 가져오기)
 * PUT: Git push 실행 (로컬 변경사항을 원격 저장소에 푸시)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth, isAdmin } from '@/lib/auth';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// 관리자 권한 확인
async function checkAdminAuth() {
  const session = await auth();
  if (!session) {
    return { error: '인증이 필요합니다.', status: 401 };
  }
  if (!isAdmin(session as { user?: { roles?: string[]; clientRoles?: string[] } } | null)) {
    return { error: '관리자 권한이 필요합니다.', status: 403 };
  }
  return { session };
}

// 서버 모드 확인
function isServerMode() {
  return process.env.BUILD_MODE !== 'static';
}

// Git 명령 실행
async function runGitCommand(command: string): Promise<{ stdout: string; stderr: string }> {
  const wikiPath = process.env.WIKI_GIT_PATH || process.cwd();
  return execAsync(command, { cwd: wikiPath });
}

// GET: Git 상태 조회
export async function GET() {
  const authResult = await checkAdminAuth();
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  if (!isServerMode()) {
    return NextResponse.json(
      { error: '서버 모드에서만 사용 가능합니다.' },
      { status: 400 }
    );
  }

  try {
    // Git 상태 확인
    const { stdout: status } = await runGitCommand('git status --porcelain');
    const { stdout: branch } = await runGitCommand('git branch --show-current');
    const { stdout: lastCommit } = await runGitCommand('git log -1 --format="%H|%s|%an|%ai"');

    // 원격 저장소와의 차이 확인
    await runGitCommand('git fetch origin');
    const { stdout: behind } = await runGitCommand('git rev-list HEAD..origin/main --count').catch(() => ({ stdout: '0' }));
    const { stdout: ahead } = await runGitCommand('git rev-list origin/main..HEAD --count').catch(() => ({ stdout: '0' }));

    const [hash, message, author, date] = lastCommit.trim().split('|');

    return NextResponse.json({
      branch: branch.trim(),
      lastCommit: {
        hash,
        message,
        author,
        date,
      },
      changes: status.trim().split('\n').filter(Boolean).map((line) => ({
        status: line.substring(0, 2).trim(),
        file: line.substring(3),
      })),
      behind: parseInt(behind.trim()) || 0,
      ahead: parseInt(ahead.trim()) || 0,
      hasChanges: status.trim().length > 0,
    });
  } catch (error) {
    console.error('Git status error:', error);
    return NextResponse.json(
      { error: 'Git 상태를 확인할 수 없습니다.' },
      { status: 500 }
    );
  }
}

// POST: Git pull (원격에서 가져오기)
export async function POST(request: NextRequest) {
  const authResult = await checkAdminAuth();
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  if (!isServerMode()) {
    return NextResponse.json(
      { error: '서버 모드에서만 사용 가능합니다.' },
      { status: 400 }
    );
  }

  try {
    const { rebase } = await request.json().catch(() => ({}));

    // Git pull 실행
    const command = rebase ? 'git pull --rebase origin main' : 'git pull origin main';
    const { stdout, stderr } = await runGitCommand(command);

    return NextResponse.json({
      success: true,
      message: 'Pull 완료',
      output: stdout || stderr,
    });
  } catch (error) {
    console.error('Git pull error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Git pull 실패';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// PUT: Git push (원격에 푸시)
export async function PUT(request: NextRequest) {
  const authResult = await checkAdminAuth();
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  if (!isServerMode()) {
    return NextResponse.json(
      { error: '서버 모드에서만 사용 가능합니다.' },
      { status: 400 }
    );
  }

  try {
    const { force } = await request.json().catch(() => ({}));

    // Git push 실행
    const command = force ? 'git push --force origin main' : 'git push origin main';
    const { stdout, stderr } = await runGitCommand(command);

    return NextResponse.json({
      success: true,
      message: 'Push 완료',
      output: stdout || stderr,
    });
  } catch (error) {
    console.error('Git push error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Git push 실패';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// PATCH: Git commit (로컬 변경사항 커밋)
export async function PATCH(request: NextRequest) {
  const authResult = await checkAdminAuth();
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  if (!isServerMode()) {
    return NextResponse.json(
      { error: '서버 모드에서만 사용 가능합니다.' },
      { status: 400 }
    );
  }

  try {
    const { message, files } = await request.json();

    if (!message) {
      return NextResponse.json({ error: '커밋 메시지가 필요합니다.' }, { status: 400 });
    }

    // 파일 스테이징
    if (files && files.length > 0) {
      for (const file of files) {
        await runGitCommand(`git add "${file}"`);
      }
    } else {
      await runGitCommand('git add -A');
    }

    // 커밋
    const { session } = authResult;
    const authorName = session.user?.name || 'Wiki Admin';
    const authorEmail = session.user?.email || 'admin@example.com';

    const { stdout } = await runGitCommand(
      `git commit -m "${message.replace(/"/g, '\\"')}" --author="${authorName} <${authorEmail}>"`
    );

    return NextResponse.json({
      success: true,
      message: '커밋 완료',
      output: stdout,
    });
  } catch (error) {
    console.error('Git commit error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Git commit 실패';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
