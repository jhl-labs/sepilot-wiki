/**
 * GitHub Issue 동기화 작업
 * 10분마다 실행
 */
import { writeFile, mkdir, readFile } from 'fs/promises';
import { join } from 'path';
import { BaseJob } from './base-job';
import { JobResult } from '../types';

interface GitHubIssue {
  number: number;
  title: string;
  body: string | null;
  state: string;
  labels: Array<{ name: string }>;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  html_url: string;
  user: { login: string } | null;
}

interface SyncedIssue {
  number: number;
  title: string;
  body: string | null;
  state: string;
  labels: string[];
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  url: string;
  author: string | null;
}

export class SyncIssuesJob extends BaseJob {
  readonly name = 'sync-issues';
  readonly description = 'GitHub Issue 동기화';
  readonly schedule = '*/10 * * * *'; // 10분마다

  private readonly dataDir = join(process.cwd(), 'data');
  private readonly issuesFile = join(this.dataDir, 'issues.json');

  async isEnabled(): Promise<boolean> {
    const repo = process.env.GITHUB_REPO || process.env.GITHUB_REPOSITORY;
    return !!repo;
  }

  protected async execute(): Promise<JobResult> {
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
      // 기존 데이터 로드
      let existingIssues: SyncedIssue[] = [];
      try {
        const data = await readFile(this.issuesFile, 'utf-8');
        const parsed = JSON.parse(data);
        existingIssues = parsed.issues || [];
      } catch {
        // 파일이 없거나 파싱 실패시 빈 배열
      }

      // GitHub에서 Issue 가져오기
      const issues = await this.fetchAllIssues(apiUrl, repo, token);

      // 변환
      const syncedIssues: SyncedIssue[] = issues.map((issue) => ({
        number: issue.number,
        title: issue.title,
        body: issue.body,
        state: issue.state,
        labels: issue.labels.map((l) => l.name),
        createdAt: issue.created_at,
        updatedAt: issue.updated_at,
        closedAt: issue.closed_at,
        url: issue.html_url,
        author: issue.user?.login || null,
      }));

      // 변경 사항 확인
      const newCount = syncedIssues.length - existingIssues.length;
      const updatedCount = this.countUpdated(existingIssues, syncedIssues);

      // 저장
      await mkdir(this.dataDir, { recursive: true });
      await writeFile(
        this.issuesFile,
        JSON.stringify(
          {
            syncedAt: new Date().toISOString(),
            repository: repo,
            totalCount: syncedIssues.length,
            issues: syncedIssues,
          },
          null,
          2
        )
      );

      return {
        success: true,
        message: `${syncedIssues.length}개 Issue 동기화 (신규: ${Math.max(0, newCount)}, 업데이트: ${updatedCount})`,
        data: {
          totalCount: syncedIssues.length,
          newCount: Math.max(0, newCount),
          updatedCount,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: 'Issue 동기화 실패',
        error: errorMessage,
      };
    }
  }

  private async fetchAllIssues(
    apiUrl: string,
    repo: string,
    token?: string
  ): Promise<GitHubIssue[]> {
    const allIssues: GitHubIssue[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const url = `${apiUrl}/repos/${repo}/issues?state=all&per_page=${perPage}&page=${page}`;

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

      const issues = (await response.json()) as GitHubIssue[];

      // PR은 제외 (pull_request 필드가 있으면 PR)
      const filteredIssues = issues.filter(
        (issue) => !(issue as unknown as { pull_request?: unknown }).pull_request
      );

      allIssues.push(...filteredIssues);

      // 더 이상 가져올 데이터가 없으면 종료
      if (issues.length < perPage) {
        break;
      }

      page++;

      // 너무 많은 요청 방지
      if (page > 10) {
        this.warn('페이지 제한 도달 (1000개 Issue)');
        break;
      }
    }

    return allIssues;
  }

  private countUpdated(
    existing: SyncedIssue[],
    current: SyncedIssue[]
  ): number {
    const existingMap = new Map(existing.map((i) => [i.number, i.updatedAt]));
    let updated = 0;

    for (const issue of current) {
      const existingUpdatedAt = existingMap.get(issue.number);
      if (existingUpdatedAt && existingUpdatedAt !== issue.updatedAt) {
        updated++;
      }
    }

    return updated;
  }
}
