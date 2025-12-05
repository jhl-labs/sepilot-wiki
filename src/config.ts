import type { WikiConfig } from './types';

export const config: WikiConfig = {
  owner: 'jhl-labs',
  repo: 'sepilot-wiki',
  wikiRepo: 'sepilot-wiki.wiki',
  title: 'SEPilot Wiki',
  description: 'AI 에이전트 기반 자동화 위키 시스템',
  baseUrl: import.meta.env.BASE_URL || '/',
};

// GitHub API 기본 URL
export const GITHUB_API_URL = 'https://api.github.com';
export const GITHUB_RAW_URL = 'https://raw.githubusercontent.com';

// 라벨 정의
export const LABELS = {
  REQUEST: 'request',
  INVALID: 'invalid',
  DRAFT: 'draft',
  AI_GENERATED: 'ai-generated',
} as const;

// GitHub URL 헬퍼 함수들
export const urls = {
  // 저장소 URL
  repo: () => `https://github.com/${config.owner}/${config.repo}`,

  // Issues URL
  issues: () => `${urls.repo()}/issues`,

  // 새 Issue 생성 URL
  newIssue: (options?: { title?: string; labels?: string; body?: string }) => {
    const base = `${urls.repo()}/issues/new`;
    const params = new URLSearchParams();
    if (options?.title) params.set('title', options.title);
    if (options?.labels) params.set('labels', options.labels);
    if (options?.body) params.set('body', options.body);
    const queryString = params.toString();
    return queryString ? `${base}?${queryString}` : base;
  },

  // 커밋 URL
  commit: (sha: string) => `${urls.repo()}/commit/${sha}`,

  // 파일 히스토리 URL
  fileHistory: (path: string, branch = 'main') =>
    `${urls.repo()}/commits/${branch}/${path}`,

  // GitHub Pages URL
  pages: () => `https://${config.owner}.github.io/${config.repo}`,
};
