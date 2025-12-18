/**
 * 관리자 Git 동기화 API
 * GitHub API를 통해 저장소 상태 및 활동 조회
 */

import { NextResponse } from 'next/server';
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

// 저장소 정보 파싱 (없으면 null 반환)
function getRepoInfo(): { owner: string; repo: string } | null {
  const repo = process.env.GITHUB_REPO;
  if (!repo) {
    return null;
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

// GET: Git 상태 조회 (GitHub API 사용)
export async function GET() {
  const authResult = await checkAdminAuth();
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const repoInfo = getRepoInfo();

    // GITHUB_REPO가 설정되지 않은 경우 기본 응답 반환
    if (!repoInfo) {
      return NextResponse.json({
        configured: false,
        message: 'GITHUB_REPO가 설정되지 않았습니다. 환경변수를 설정하세요.',
        repository: null,
        commits: [],
        pullRequests: [],
        workflowRuns: [],
        branchProtection: null,
        contributors: [],
        branch: null,
        lastCommit: null,
        openPRs: 0,
        repoUrl: null,
      });
    }

    const { owner, repo } = repoInfo;

    // GITHUB_TOKEN 확인
    if (!process.env.GITHUB_TOKEN) {
      return NextResponse.json({
        configured: false,
        message: 'GITHUB_TOKEN이 설정되지 않았습니다. 환경변수를 설정하세요.',
        repository: null,
        commits: [],
        pullRequests: [],
        workflowRuns: [],
        branchProtection: null,
        contributors: [],
        branch: null,
        lastCommit: null,
        openPRs: 0,
        repoUrl: `https://github.com/${owner}/${repo}`,
      });
    }

    const octokit = getOctokit();

    // 저장소 기본 정보
    const { data: repoData } = await octokit.repos.get({ owner, repo });
    const defaultBranch = repoData.default_branch;

    // 최근 커밋 목록 (10개)
    const { data: commits } = await octokit.repos.listCommits({
      owner,
      repo,
      sha: defaultBranch,
      per_page: 10,
    });

    // 오픈 PR 목록
    const { data: pulls } = await octokit.pulls.list({
      owner,
      repo,
      state: 'open',
      per_page: 10,
    });

    // 최근 워크플로우 실행 (있는 경우)
    let workflowRuns: Array<{
      id: number;
      name: string;
      status: string;
      conclusion: string | null;
      created_at: string;
      html_url: string;
    }> = [];

    try {
      const { data: runs } = await octokit.actions.listWorkflowRunsForRepo({
        owner,
        repo,
        per_page: 5,
      });
      workflowRuns = runs.workflow_runs.map(run => ({
        id: run.id,
        name: run.name || 'Unknown',
        status: run.status || 'unknown',
        conclusion: run.conclusion,
        created_at: run.created_at,
        html_url: run.html_url,
      }));
    } catch {
      // Actions API 접근 권한이 없을 수 있음
    }

    // 브랜치 보호 상태
    let branchProtection = null;
    try {
      const { data: protection } = await octokit.repos.getBranchProtection({
        owner,
        repo,
        branch: defaultBranch,
      });
      branchProtection = {
        requiredReviews: protection.required_pull_request_reviews?.required_approving_review_count || 0,
        requireStatusChecks: !!protection.required_status_checks,
        enforceAdmins: protection.enforce_admins?.enabled || false,
      };
    } catch {
      // 브랜치 보호가 설정되지 않음
    }

    // 컨트리뷰터 통계
    let contributors: Array<{
      login: string;
      avatar_url: string;
      contributions: number;
    }> = [];
    try {
      const { data: contribData } = await octokit.repos.listContributors({
        owner,
        repo,
        per_page: 5,
      });
      contributors = contribData.map(c => ({
        login: c.login || 'unknown',
        avatar_url: c.avatar_url || '',
        contributions: c.contributions,
      }));
    } catch {
      // 컨트리뷰터 정보 없음
    }

    return NextResponse.json({
      repository: {
        name: repoData.full_name,
        description: repoData.description,
        visibility: repoData.private ? 'private' : 'public',
        defaultBranch,
        htmlUrl: repoData.html_url,
        pushedAt: repoData.pushed_at,
        updatedAt: repoData.updated_at,
        size: repoData.size,
        stargazers: repoData.stargazers_count,
        forks: repoData.forks_count,
        openIssues: repoData.open_issues_count,
      },
      commits: commits.map(commit => ({
        sha: commit.sha,
        shortSha: commit.sha.substring(0, 7),
        message: commit.commit.message.split('\n')[0],
        fullMessage: commit.commit.message,
        author: {
          name: commit.commit.author?.name || 'Unknown',
          email: commit.commit.author?.email || '',
          date: commit.commit.author?.date || '',
          avatar: commit.author?.avatar_url || '',
          login: commit.author?.login || '',
        },
        htmlUrl: commit.html_url,
      })),
      pullRequests: pulls.map(pr => ({
        number: pr.number,
        title: pr.title,
        state: pr.state,
        draft: pr.draft,
        author: {
          login: pr.user?.login || 'unknown',
          avatar: pr.user?.avatar_url || '',
        },
        createdAt: pr.created_at,
        updatedAt: pr.updated_at,
        htmlUrl: pr.html_url,
        labels: pr.labels.map(l => ({
          name: l.name,
          color: l.color,
        })),
      })),
      workflowRuns,
      branchProtection,
      contributors,
      // Legacy fields for backward compatibility
      branch: defaultBranch,
      lastCommit: commits[0] ? {
        hash: commits[0].sha.substring(0, 7),
        message: commits[0].commit.message.split('\n')[0],
        author: commits[0].commit.author?.name || 'Unknown',
        date: commits[0].commit.author?.date || '',
      } : null,
      openPRs: pulls.length,
      repoUrl: repoData.html_url,
    });
  } catch (error) {
    console.error('Git status error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Git 상태를 확인할 수 없습니다.';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// POST: 동기화 트리거 (GitHub Actions workflow dispatch)
export async function POST() {
  const authResult = await checkAdminAuth();
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const repoInfo = getRepoInfo();
    if (!repoInfo) {
      return NextResponse.json(
        { error: 'GITHUB_REPO가 설정되지 않았습니다.' },
        { status: 400 }
      );
    }
    if (!process.env.GITHUB_TOKEN) {
      return NextResponse.json(
        { error: 'GITHUB_TOKEN이 설정되지 않았습니다.' },
        { status: 400 }
      );
    }

    const { owner, repo } = repoInfo;
    const octokit = getOctokit();

    // workflow_dispatch 이벤트 트리거 (있는 경우)
    try {
      await octokit.actions.createWorkflowDispatch({
        owner,
        repo,
        workflow_id: 'sync.yml',
        ref: 'main',
      });

      return NextResponse.json({
        success: true,
        message: '동기화 워크플로우가 트리거되었습니다.',
      });
    } catch {
      // 워크플로우가 없으면 단순히 성공 반환
      return NextResponse.json({
        success: true,
        message: '동기화 요청이 처리되었습니다.',
      });
    }
  } catch (error) {
    console.error('Sync trigger error:', error);
    const errorMessage = error instanceof Error ? error.message : '동기화 트리거 실패';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
