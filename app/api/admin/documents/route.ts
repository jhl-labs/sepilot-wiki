/**
 * 관리자 문서 관리 API
 * GET: 전체 문서 목록 조회
 * POST: 새 문서 생성
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

// 관리자 권한 확인 미들웨어
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

// 문서 저장 경로
const DOCS_PATH = 'data';

// 재귀적으로 data 폴더의 모든 파일 조회
async function getAllWikiFiles(octokit: Octokit, owner: string, repo: string) {
  const files: Array<{
    path: string;
    name: string;
    sha: string;
    type: 'file' | 'directory';
  }> = [];

  async function traverse(path: string) {
    try {
      const { data } = await octokit.repos.getContent({
        owner,
        repo,
        path,
      });

      if (Array.isArray(data)) {
        for (const item of data) {
          if (item.type === 'dir') {
            files.push({
              path: item.path,
              name: item.name,
              sha: item.sha,
              type: 'directory',
            });
            await traverse(item.path);
          } else if (item.type === 'file' && item.name.endsWith('.md')) {
            files.push({
              path: item.path,
              name: item.name,
              sha: item.sha,
              type: 'file',
            });
          }
        }
      }
    } catch (error) {
      // 폴더가 없으면 빈 배열 반환
      console.error(`Failed to traverse ${path}:`, error);
    }
  }

  await traverse(DOCS_PATH);
  return files;
}

export async function GET() {
  const authResult = await checkAdminAuth();
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const { owner, repo } = getRepoInfo();
    const octokit = getOctokit();

    const files = await getAllWikiFiles(octokit, owner, repo);

    // 트리 구조로 변환
    const tree = buildTree(files);

    return NextResponse.json({
      files,
      tree,
      total: files.filter((f) => f.type === 'file').length,
    });
  } catch (error) {
    console.error('Admin documents GET error:', error);
    return NextResponse.json(
      { error: '문서 목록을 조회할 수 없습니다.' },
      { status: 500 }
    );
  }
}

// 파일 목록을 트리 구조로 변환
function buildTree(
  files: Array<{ path: string; name: string; sha: string; type: 'file' | 'directory' }>
) {
  interface TreeNode {
    name: string;
    path: string;
    type: 'file' | 'directory';
    sha?: string;
    children?: TreeNode[];
  }

  const root: TreeNode = { name: DOCS_PATH, path: DOCS_PATH, type: 'directory', children: [] };

  for (const file of files) {
    const parts = file.path.split('/').slice(1); // 'data/' 제거
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;

      if (!current.children) {
        current.children = [];
      }

      let child = current.children.find((c) => c.name === part);
      if (!child) {
        child = {
          name: part,
          path: file.path,
          type: isLast ? file.type : 'directory',
          sha: isLast ? file.sha : undefined,
          children: isLast && file.type === 'file' ? undefined : [],
        };
        current.children.push(child);
      }
      current = child;
    }
  }

  return root;
}

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
    const { path, content, message, title } = body;

    if (!path) {
      return NextResponse.json({ error: '파일 경로가 필요합니다.' }, { status: 400 });
    }

    // 환경변수 확인
    if (!process.env.GITHUB_TOKEN) {
      return NextResponse.json({ error: 'GITHUB_TOKEN이 설정되지 않았습니다.' }, { status: 500 });
    }
    if (!process.env.GITHUB_REPO) {
      return NextResponse.json({ error: 'GITHUB_REPO가 설정되지 않았습니다.' }, { status: 500 });
    }

    const { owner, repo } = getRepoInfo();
    const octokit = getOctokit();

    // 파일 경로 정규화 (data/ 폴더에 저장)
    const filePath = path.startsWith(`${DOCS_PATH}/`) ? path : `${DOCS_PATH}/${path}`;
    const finalPath = filePath.endsWith('.md') ? filePath : `${filePath}.md`;

    // 파일이 이미 존재하는지 확인
    try {
      await octokit.repos.getContent({
        owner,
        repo,
        path: finalPath,
      });
      return NextResponse.json(
        { error: '이미 존재하는 문서입니다.' },
        { status: 409 }
      );
    } catch {
      // 파일이 없으면 정상 - 계속 진행
    }

    const { session } = authResult;

    // 문서 제목 생성
    const docTitle = title || path.split('/').pop()?.replace(/\.md$/, '') || 'Untitled';
    const commitMessage = message || `docs: ${docTitle} 문서 생성`;

    // 기본 문서 템플릿
    const defaultContent = content || `# ${docTitle}

## 개요

문서 내용을 작성하세요.

## 참고

- 관련 링크
`;

    const result = await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: finalPath,
      message: commitMessage,
      content: Buffer.from(defaultContent).toString('base64'),
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
      path: finalPath,
      sha: result.data.content?.sha,
      commit: result.data.commit.sha,
    });
  } catch (error) {
    console.error('Admin documents POST error:', error);
    const errorMessage = error instanceof Error ? error.message : '문서를 생성할 수 없습니다.';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
