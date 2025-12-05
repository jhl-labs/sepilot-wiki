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
