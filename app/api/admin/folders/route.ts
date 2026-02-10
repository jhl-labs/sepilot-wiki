/**
 * 관리자 폴더 관리 API
 * POST: 새 폴더 생성 (.gitkeep 파일 생성)
 * DELETE: 폴더 삭제 (빈 폴더만)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth, isAdmin } from '@/lib/auth';
import { Octokit } from '@octokit/rest';

// 문서 저장 경로
const DOCS_PATH = 'data';

// GitHub API 클라이언트
function getOctokit() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('서버 설정 오류');
  }
  return new Octokit({ auth: token });
}

// 저장소 정보 파싱
function getRepoInfo() {
  const repo = process.env.GITHUB_REPO;
  if (!repo) {
    throw new Error('서버 설정 오류');
  }
  const [owner, repoName] = repo.split('/');
  return { owner, repo: repoName };
}

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

// POST: 새 폴더 생성
export async function POST(request: NextRequest) {
  const authResult = await checkAdminAuth();
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const body = await request.json();
    const { path: folderPath, name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: '폴더 이름이 필요합니다.' }, { status: 400 });
    }

    // 폴더명 유효성 검사
    const folderName = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9가-힣\-_]/g, '');
    if (!folderName) {
      return NextResponse.json({ error: '유효하지 않은 폴더 이름입니다.' }, { status: 400 });
    }

    const { owner, repo } = getRepoInfo();
    const octokit = getOctokit();

    // 경로 생성: folderPath가 있으면 그 아래에, 없으면 DOCS_PATH 바로 아래에
    let basePath = DOCS_PATH;
    if (folderPath) {
      // folderPath에서 data/ 접두사 제거 후 다시 붙이기
      const cleanPath = folderPath.replace(/^data\/?/, '');
      basePath = cleanPath ? `${DOCS_PATH}/${cleanPath}` : DOCS_PATH;
    }
    const fullPath = `${basePath}/${folderName}/.gitkeep`;

    // 폴더가 이미 존재하는지 확인
    try {
      await octokit.repos.getContent({
        owner,
        repo,
        path: `${basePath}/${folderName}`,
      });
      return NextResponse.json(
        { error: '이미 존재하는 폴더입니다.' },
        { status: 409 }
      );
    } catch {
      // 폴더가 없으면 정상 - 계속 진행
    }

    const { session } = authResult;

    // .gitkeep 파일 생성으로 폴더 생성
    const result = await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: fullPath,
      message: `docs: ${folderName} 폴더 생성`,
      content: Buffer.from('').toString('base64'),
      committer: {
        name: session.user?.name || 'Wiki Admin',
        email: session.user?.email || 'wiki-admin@example.com',
      },
      author: {
        name: session.user?.name || 'Wiki Admin',
        email: session.user?.email || 'wiki-admin@example.com',
      },
    });

    return NextResponse.json({
      success: true,
      path: `${basePath}/${folderName}`,
      commit: result.data.commit.sha,
    });
  } catch (error) {
    console.error('Folder creation error:', error);
    return NextResponse.json(
      { error: '폴더를 생성할 수 없습니다.' },
      { status: 500 }
    );
  }
}

// DELETE: 폴더 삭제 (빈 폴더만 - .gitkeep만 있는 경우)
export async function DELETE(request: NextRequest) {
  const authResult = await checkAdminAuth();
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const body = await request.json();
    const { path: folderPath } = body;

    if (!folderPath) {
      return NextResponse.json({ error: '폴더 경로가 필요합니다.' }, { status: 400 });
    }

    const { owner, repo } = getRepoInfo();
    const octokit = getOctokit();

    // 폴더 내용 확인
    const { data: contents } = await octokit.repos.getContent({
      owner,
      repo,
      path: folderPath,
    });

    if (!Array.isArray(contents)) {
      return NextResponse.json({ error: '폴더가 아닙니다.' }, { status: 400 });
    }

    // 빈 폴더인지 확인 (.gitkeep만 있거나 완전히 비어있어야 함)
    const nonGitkeepFiles = contents.filter(f => f.name !== '.gitkeep');
    if (nonGitkeepFiles.length > 0) {
      return NextResponse.json(
        { error: '폴더가 비어있지 않습니다. 먼저 내부 파일을 삭제해주세요.' },
        { status: 400 }
      );
    }

    const { session } = authResult;

    // .gitkeep 파일이 있으면 삭제
    const gitkeepFile = contents.find(f => f.name === '.gitkeep');
    if (gitkeepFile) {
      await octokit.repos.deleteFile({
        owner,
        repo,
        path: `${folderPath}/.gitkeep`,
        message: `docs: ${folderPath.split('/').pop()} 폴더 삭제`,
        sha: gitkeepFile.sha,
        committer: {
          name: session.user?.name || 'Wiki Admin',
          email: session.user?.email || 'wiki-admin@example.com',
        },
        author: {
          name: session.user?.name || 'Wiki Admin',
          email: session.user?.email || 'wiki-admin@example.com',
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: '폴더가 삭제되었습니다.',
    });
  } catch (error) {
    console.error('Folder deletion error:', error);
    return NextResponse.json(
      { error: '폴더를 삭제할 수 없습니다.' },
      { status: 500 }
    );
  }
}
