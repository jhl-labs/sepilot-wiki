/**
 * Wiki 문서 API Route
 * GET: 문서 조회
 * PUT: 문서 수정 (인증 필요)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth, canEdit } from '@/lib/auth';
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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  try {
    const { slug } = await params;
    const slugPath = slug.join('/');
    const { owner, repo } = getRepoInfo();
    const octokit = getOctokit();

    // wiki 폴더에서 파일 조회
    const path = `wiki/${slugPath}.md`;

    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path,
    });

    if (Array.isArray(data) || data.type !== 'file') {
      return NextResponse.json({ error: '파일을 찾을 수 없습니다.' }, { status: 404 });
    }

    const content = Buffer.from(data.content, 'base64').toString('utf-8');

    return NextResponse.json({
      slug: slugPath,
      content,
      sha: data.sha,
      path: data.path,
    });
  } catch (error) {
    console.error('Wiki GET error:', error);
    return NextResponse.json(
      { error: '문서를 조회할 수 없습니다.' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  try {
    // 인증 확인
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    // 편집 권한 확인
    if (!canEdit(session as { user?: { roles?: string[]; clientRoles?: string[] } } | null)) {
      return NextResponse.json({ error: '편집 권한이 없습니다.' }, { status: 403 });
    }

    const { slug } = await params;
    const slugPath = slug.join('/');
    const { content, message } = await request.json();

    if (!content) {
      return NextResponse.json({ error: '내용이 비어있습니다.' }, { status: 400 });
    }

    const { owner, repo } = getRepoInfo();
    const octokit = getOctokit();
    const path = `wiki/${slugPath}.md`;

    // 현재 파일 정보 조회 (SHA 필요)
    let existingSha: string | undefined;
    try {
      const { data } = await octokit.repos.getContent({
        owner,
        repo,
        path,
      });
      if (!Array.isArray(data) && data.type === 'file') {
        existingSha = data.sha;
      }
    } catch {
      // 파일이 없으면 새로 생성
    }

    // 파일 업데이트 또는 생성
    const commitMessage =
      message || `docs: ${slugPath} 문서 ${existingSha ? '수정' : '생성'}`;

    const result = await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message: commitMessage,
      content: Buffer.from(content).toString('base64'),
      sha: existingSha,
      committer: {
        name: session.user?.name || 'Wiki Editor',
        email: session.user?.email || 'wiki@example.com',
      },
      author: {
        name: session.user?.name || 'Wiki Editor',
        email: session.user?.email || 'wiki@example.com',
      },
    });

    return NextResponse.json({
      success: true,
      sha: result.data.content?.sha,
      commit: result.data.commit.sha,
    });
  } catch (error) {
    console.error('Wiki PUT error:', error);
    return NextResponse.json(
      { error: '문서를 저장할 수 없습니다.' },
      { status: 500 }
    );
  }
}
