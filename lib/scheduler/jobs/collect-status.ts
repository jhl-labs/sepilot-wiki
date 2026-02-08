/**
 * GitHub Actions 상태 수집 작업
 * 6시간마다 실행
 */
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { BaseJob } from './base-job';
import { JobResult, JobRunOptions } from '../types';

interface WorkflowRun {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  branch: string;
  event: string;
  createdAt: string;
  updatedAt: string;
  url: string;
  actor: string | null;
}

interface WorkflowStatus {
  id: number;
  name: string;
  path: string;
  state: string;
  overallStatus: string;
  badgeUrl: string;
  url: string;
  recentRuns: WorkflowRun[];
}

export class CollectStatusJob extends BaseJob {
  readonly name = 'collect-status';
  readonly description = 'GitHub Actions 워크플로우 상태 수집';
  readonly schedule = '0 */6 * * *'; // 6시간마다

  private readonly outputDir = join(process.cwd(), 'public');
  private readonly outputFile = join(this.outputDir, 'actions-status.json');

  async isEnabled(): Promise<boolean> {
    const repo = process.env.GITHUB_REPO || process.env.GITHUB_REPOSITORY;
    return !!repo;
  }

  protected async execute(_options?: JobRunOptions): Promise<JobResult> {
    const repo = process.env.GITHUB_REPO || process.env.GITHUB_REPOSITORY;
    const token = process.env.GITHUB_TOKEN;
    const apiUrl = process.env.GITHUB_API_URL || 'https://api.github.com';

    if (!repo) {
      return {
        success: false,
        message: 'GITHUB_REPO 환경변수가 설정되지 않음',
      };
    }

    this.log(`저장소: ${repo}`);

    try {
      const [workflows, inProgress, failed] = await Promise.all([
        this.collectWorkflowRuns(apiUrl, repo, token),
        this.collectInProgressRuns(apiUrl, repo, token),
        this.collectFailedRuns(apiUrl, repo, token),
      ]);

      const status = {
        collectedAt: new Date().toISOString(),
        repository: repo,
        summary: {
          totalWorkflows: workflows.length,
          inProgressCount: inProgress.length,
          recentFailuresCount: failed.length,
        },
        workflows,
        inProgress,
        recentFailures: failed,
      };

      // 출력 폴더 생성
      await mkdir(this.outputDir, { recursive: true });

      // JSON 파일로 저장
      await writeFile(this.outputFile, JSON.stringify(status, null, 2));

      return {
        success: true,
        message: `워크플로우 ${workflows.length}개, 진행 중 ${inProgress.length}개, 실패 ${failed.length}개 수집`,
        data: status.summary,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: '상태 수집 실패',
        error: errorMessage,
      };
    }
  }

  private async fetchGitHubAPI(
    apiUrl: string,
    repo: string,
    endpoint: string,
    token?: string
  ): Promise<unknown> {
    const url = `${apiUrl}/repos/${repo}${endpoint}`;

    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'sepilot-wiki-scheduler',
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  private async collectWorkflowRuns(
    apiUrl: string,
    repo: string,
    token?: string
  ): Promise<WorkflowStatus[]> {
    try {
      const workflows = (await this.fetchGitHubAPI(
        apiUrl,
        repo,
        '/actions/workflows',
        token
      )) as { workflows: Array<Record<string, unknown>> };

      const workflowStatuses: WorkflowStatus[] = [];

      for (const workflow of workflows.workflows || []) {
        const runs = (await this.fetchGitHubAPI(
          apiUrl,
          repo,
          `/actions/workflows/${workflow.id}/runs?per_page=5`,
          token
        )) as { workflow_runs: Array<Record<string, unknown>> };

        const recentRuns: WorkflowRun[] = (runs.workflow_runs || []).map(
          (run: Record<string, unknown>) => ({
            id: run.id as number,
            name: run.name as string,
            status: run.status as string,
            conclusion: run.conclusion as string | null,
            branch: run.head_branch as string,
            event: run.event as string,
            createdAt: run.created_at as string,
            updatedAt: run.updated_at as string,
            url: run.html_url as string,
            actor: (run.actor as { login?: string })?.login || null,
          })
        );

        const latestRun = recentRuns[0];
        let overallStatus = 'unknown';

        if (latestRun) {
          if (latestRun.status === 'completed') {
            overallStatus = latestRun.conclusion || 'unknown';
          } else {
            overallStatus = latestRun.status;
          }
        }

        workflowStatuses.push({
          id: workflow.id as number,
          name: workflow.name as string,
          path: workflow.path as string,
          state: workflow.state as string,
          overallStatus,
          badgeUrl: workflow.badge_url as string,
          url: workflow.html_url as string,
          recentRuns,
        });
      }

      return workflowStatuses;
    } catch (error) {
      this.error('워크플로우 상태 수집 실패', error);
      return [];
    }
  }

  private async collectInProgressRuns(
    apiUrl: string,
    repo: string,
    token?: string
  ): Promise<WorkflowRun[]> {
    try {
      const runs = (await this.fetchGitHubAPI(
        apiUrl,
        repo,
        '/actions/runs?status=in_progress&per_page=10',
        token
      )) as { workflow_runs: Array<Record<string, unknown>> };

      return (runs.workflow_runs || []).map((run: Record<string, unknown>) => ({
        id: run.id as number,
        name: run.name as string,
        status: run.status as string,
        conclusion: run.conclusion as string | null,
        branch: run.head_branch as string,
        event: run.event as string,
        createdAt: run.created_at as string,
        updatedAt: run.updated_at as string,
        url: run.html_url as string,
        actor: (run.actor as { login?: string })?.login || null,
      }));
    } catch (error) {
      this.warn('진행 중 실행 수집 실패', error);
      return [];
    }
  }

  private async collectFailedRuns(
    apiUrl: string,
    repo: string,
    token?: string
  ): Promise<WorkflowRun[]> {
    try {
      const runs = (await this.fetchGitHubAPI(
        apiUrl,
        repo,
        '/actions/runs?status=failure&per_page=10',
        token
      )) as { workflow_runs: Array<Record<string, unknown>> };

      return (runs.workflow_runs || []).map((run: Record<string, unknown>) => ({
        id: run.id as number,
        name: run.name as string,
        status: run.status as string,
        conclusion: run.conclusion as string | null,
        branch: run.head_branch as string,
        event: run.event as string,
        createdAt: run.created_at as string,
        updatedAt: run.updated_at as string,
        url: run.html_url as string,
        actor: (run.actor as { login?: string })?.login || null,
      }));
    } catch (error) {
      this.warn('실패 실행 수집 실패', error);
      return [];
    }
  }
}
