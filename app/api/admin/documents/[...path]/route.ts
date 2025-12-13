/**
 * 관리자 개별 문서 관리 API
 * GET: 문서 상세 조회
 * PUT: 문서 수정
 * DELETE: 문서 삭제
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

// 문서 저장 경로
const DOCS_PATH = 'data';

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

// 파일 경로 정규화 (data/ 접두사가 이미 있으면 그대로, 없으면 추가)
function normalizeFilePath(pathParts: string[]): string {
  const joinedPath = pathParts.join('/');
  // 이미 data/로 시작하면 그대로 사용
  if (joinedPath.startsWith(`${DOCS_PATH}/`)) {
    return joinedPath;
  }
  // data로만 시작하면 (슬래시 없이) 그대로 사용
  if (joinedPath === DOCS_PATH) {
    return joinedPath;
  }
  // 그 외에는 data/ 접두사 추가
  return `${DOCS_PATH}/${joinedPath}`;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const authResult = await checkAdminAuth();
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const { path } = await params;
    const filePath = normalizeFilePath(path);
    const { owner, repo } = getRepoInfo();
    const octokit = getOctokit();

    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path: filePath,
    });

    if (Array.isArray(data) || data.type !== 'file') {
      return NextResponse.json({ error: '파일을 찾을 수 없습니다.' }, { status: 404 });
    }

    const content = Buffer.from(data.content, 'base64').toString('utf-8');

    // 커밋 히스토리 조회
    const { data: commits } = await octokit.repos.listCommits({
      owner,
      repo,
      path: filePath,
      per_page: 10,
    });

    return NextResponse.json({
      path: data.path,
      name: data.name,
      content,
      sha: data.sha,
      size: data.size,
      history: commits.map((c) => ({
        sha: c.sha,
        message: c.commit.message,
        author: c.commit.author?.name,
        date: c.commit.author?.date,
      })),
    });
  } catch (error) {
    console.error('Admin document GET error:', error);
    return NextResponse.json(
      { error: '문서를 조회할 수 없습니다.' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const authResult = await checkAdminAuth();
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const { path } = await params;
    const { content, message, sha } = await request.json();

    if (!content) {
      return NextResponse.json({ error: '내용이 필요합니다.' }, { status: 400 });
    }

    const filePath = normalizeFilePath(path);
    const { owner, repo } = getRepoInfo();
    const octokit = getOctokit();

    // 현재 파일 SHA 확인
    let currentSha = sha;
    if (!currentSha) {
      try {
        const { data } = await octokit.repos.getContent({
          owner,
          repo,
          path: filePath,
        });
        if (!Array.isArray(data) && data.type === 'file') {
          currentSha = data.sha;
        }
      } catch {
        // 새 파일 생성
      }
    }

    const { session } = authResult;
    const commitMessage = message || `docs: ${path.join('/')} 문서 수정`;

    const result = await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: filePath,
      message: commitMessage,
      content: Buffer.from(content).toString('base64'),
      sha: currentSha,
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
      sha: result.data.content?.sha,
      commit: result.data.commit.sha,
    });
  } catch (error) {
    console.error('Admin document PUT error:', error);
    return NextResponse.json(
      { error: '문서를 수정할 수 없습니다.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const authResult = await checkAdminAuth();
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const { path } = await params;
    const { message, sha } = await request.json().catch(() => ({}));

    const filePath = normalizeFilePath(path);
    const { owner, repo } = getRepoInfo();
    const octokit = getOctokit();

    // 파일 SHA 확인
    let currentSha = sha;
    if (!currentSha) {
      const { data } = await octokit.repos.getContent({
        owner,
        repo,
        path: filePath,
      });
      if (!Array.isArray(data) && data.type === 'file') {
        currentSha = data.sha;
      } else {
        return NextResponse.json({ error: '파일을 찾을 수 없습니다.' }, { status: 404 });
      }
    }

    const { session } = authResult;
    const commitMessage = message || `docs: ${path.join('/')} 문서 삭제`;

    const result = await octokit.repos.deleteFile({
      owner,
      repo,
      path: filePath,
      message: commitMessage,
      sha: currentSha,
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
      commit: result.data.commit.sha,
    });
  } catch (error) {
    console.error('Admin document DELETE error:', error);
    return NextResponse.json(
      { error: '문서를 삭제할 수 없습니다.' },
      { status: 500 }
    );
  }
}
