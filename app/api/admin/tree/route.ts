/**
 * 관리자 트리 조정 API
 * PUT: 문서 이동 (rename)
 * POST: 폴더 생성
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth, isAdmin } from '@/lib/auth';
import { Octokit } from '@octokit/rest';

// GitHub API 클라이언트
function getOctokit() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN이 설정되지 않았습니다.');
  }
  return new Octokit({ auth: token });
}

// 저장소 정보 파싱
function getRepoInfo() {
  const repo = process.env.GITHUB_REPO;
  if (!repo) {
    throw new Error('GITHUB_REPO가 설정되지 않았습니다.');
  }
  const [owner, repoName] = repo.split('/');
  return { owner, repo: repoName };
}

// 관리자 권한 확인
async function checkAdminAuth() {
  // Public 모드에서는 인증 건너뛰기
  if (process.env.AUTH_MODE === 'public') {
    return { session: { user: { name: 'Anonymous', email: 'anonymous@example.com' } } };
  }

  const session = await auth();
  if (!session) {
    return { error: '인증이 필요합니다.', status: 401 };
  }
  if (!isAdmin(session as { user?: { roles?: string[]; clientRoles?: string[] } } | null)) {
    return { error: '관리자 권한이 필요합니다.', status: 403 };
  }
  return { session };
}

// PUT: 문서 이동 (rename)
export async function PUT(request: NextRequest) {
  const authResult = await checkAdminAuth();
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const { sourcePath, targetPath, message } = await request.json();

    if (!sourcePath || !targetPath) {
      return NextResponse.json(
        { error: '원본 경로와 대상 경로가 필요합니다.' },
        { status: 400 }
      );
    }

    const { owner, repo } = getRepoInfo();
    const octokit = getOctokit();
    const { session } = authResult;

    // 원본 파일 내용 조회
    const normalizedSource = sourcePath.startsWith('wiki/') ? sourcePath : `wiki/${sourcePath}`;
    const normalizedTarget = targetPath.startsWith('wiki/') ? targetPath : `wiki/${targetPath}`;

    const { data: sourceData } = await octokit.repos.getContent({
      owner,
      repo,
      path: normalizedSource,
    });

    if (Array.isArray(sourceData) || sourceData.type !== 'file') {
      return NextResponse.json({ error: '원본 파일을 찾을 수 없습니다.' }, { status: 404 });
    }

    const content = Buffer.from(sourceData.content, 'base64').toString('utf-8');
    const commitMessage = message || `docs: ${normalizedSource} → ${normalizedTarget} 이동`;

    // 새 위치에 파일 생성
    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: normalizedTarget,
      message: commitMessage,
      content: Buffer.from(content).toString('base64'),
      committer: {
        name: session.user?.name || 'Wiki Admin',
        email: session.user?.email || 'admin@example.com',
      },
      author: {
        name: session.user?.name || 'Wiki Admin',
        email: session.user?.email || 'admin@example.com',
      },
    });

    // 원본 파일 삭제
    await octokit.repos.deleteFile({
      owner,
      repo,
      path: normalizedSource,
      message: `docs: ${normalizedSource} 삭제 (이동됨)`,
      sha: sourceData.sha,
      committer: {
        name: session.user?.name || 'Wiki Admin',
        email: session.user?.email || 'admin@example.com',
      },
      author: {
        name: session.user?.name || 'Wiki Admin',
        email: session.user?.email || 'admin@example.com',
      },
    });

    return NextResponse.json({
      success: true,
      message: '문서가 이동되었습니다.',
      from: normalizedSource,
      to: normalizedTarget,
    });
  } catch (error) {
    console.error('Tree PUT error:', error);
    return NextResponse.json(
      { error: '문서를 이동할 수 없습니다.' },
      { status: 500 }
    );
  }
}

// POST: 폴더 생성 (.gitkeep 파일로)
export async function POST(request: NextRequest) {
  const authResult = await checkAdminAuth();
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const { path, message } = await request.json();

    if (!path) {
      return NextResponse.json({ error: '폴더 경로가 필요합니다.' }, { status: 400 });
    }

    const { owner, repo } = getRepoInfo();
    const octokit = getOctokit();
    const { session } = authResult;

    const normalizedPath = path.startsWith('wiki/') ? path : `wiki/${path}`;
    const gitkeepPath = `${normalizedPath}/.gitkeep`;

    // 폴더가 이미 존재하는지 확인
    try {
      await octokit.repos.getContent({
        owner,
        repo,
        path: normalizedPath,
      });
      return NextResponse.json(
        { error: '이미 존재하는 폴더입니다.' },
        { status: 409 }
      );
    } catch {
      // 폴더가 없으면 정상
    }

    const commitMessage = message || `docs: ${normalizedPath} 폴더 생성`;

    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: gitkeepPath,
      message: commitMessage,
      content: Buffer.from('').toString('base64'),
      committer: {
        name: session.user?.name || 'Wiki Admin',
        email: session.user?.email || 'admin@example.com',
      },
      author: {
        name: session.user?.name || 'Wiki Admin',
        email: session.user?.email || 'admin@example.com',
      },
    });

    return NextResponse.json({
      success: true,
      message: '폴더가 생성되었습니다.',
      path: normalizedPath,
    });
  } catch (error) {
    console.error('Tree POST error:', error);
    return NextResponse.json(
      { error: '폴더를 생성할 수 없습니다.' },
      { status: 500 }
    );
  }
}

// DELETE: 폴더 삭제 (폴더 내 모든 파일 삭제)
export async function DELETE(request: NextRequest) {
  const authResult = await checkAdminAuth();
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const { path, message } = await request.json();

    if (!path) {
      return NextResponse.json({ error: '폴더 경로가 필요합니다.' }, { status: 400 });
    }

    const { owner, repo } = getRepoInfo();
    const octokit = getOctokit();
    const { session } = authResult;

    const normalizedPath = path.startsWith('wiki/') ? path : `wiki/${path}`;

    // 폴더 내 모든 파일 조회
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path: normalizedPath,
    });

    if (!Array.isArray(data)) {
      return NextResponse.json({ error: '폴더가 아닙니다.' }, { status: 400 });
    }

    const commitMessage = message || `docs: ${normalizedPath} 폴더 삭제`;
    const deletedFiles: string[] = [];

    // 재귀적으로 모든 파일 삭제
    async function deleteRecursive(items: Array<{ type: string; path: string; sha: string; name: string }>) {
      for (const item of items) {
        if (item.type === 'dir') {
          const { data: subItems } = await octokit.repos.getContent({
            owner,
            repo,
            path: item.path,
          });
          if (Array.isArray(subItems)) {
            await deleteRecursive(subItems);
          }
        } else {
          await octokit.repos.deleteFile({
            owner,
            repo,
            path: item.path,
            message: commitMessage,
            sha: item.sha,
            committer: {
              name: session.user?.name || 'Wiki Admin',
              email: session.user?.email || 'admin@example.com',
            },
            author: {
              name: session.user?.name || 'Wiki Admin',
              email: session.user?.email || 'admin@example.com',
            },
          });
          deletedFiles.push(item.path);
        }
      }
    }

    await deleteRecursive(data);

    return NextResponse.json({
      success: true,
      message: '폴더가 삭제되었습니다.',
      path: normalizedPath,
      deletedFiles,
    });
  } catch (error) {
    console.error('Tree DELETE error:', error);
    return NextResponse.json(
      { error: '폴더를 삭제할 수 없습니다.' },
      { status: 500 }
    );
  }
}
