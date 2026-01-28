import { siteConfig } from '../site.config';
import type { WikiConfig } from './types';

// Base URL 결정 (Next.js / Vite 호환)
function getBaseUrl(): string {
  // Next.js 환경
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_BASE_PATH) {
    return process.env.NEXT_PUBLIC_BASE_PATH;
  }
  // Vite 환경
  if (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) {
    return import.meta.env.BASE_URL;
  }
  return '/';
}

// site.config.ts에서 설정을 가져와 WikiConfig 생성
export const config: WikiConfig = {
  owner: siteConfig.owner,
  repo: siteConfig.repo,
  wikiRepo: `${siteConfig.repo}.wiki`,
  title: siteConfig.title,
  description: siteConfig.description,
  baseUrl: getBaseUrl(),
};

// GitHub URL 설정 (GHES 지원)
const githubConfig = siteConfig.github || {};
export const GITHUB_BASE_URL = githubConfig.baseUrl || 'https://github.com';
export const GITHUB_API_URL = githubConfig.apiUrl || 'https://api.github.com';
export const GITHUB_RAW_URL = githubConfig.rawUrl || 'https://raw.githubusercontent.com';

// 라벨 정의
export const LABELS = {
  REQUEST: 'request',
  INVALID: 'invalid',
  DRAFT: 'draft',
  AI_GENERATED: 'ai-generated',
  WIKI_MAINTENANCE: 'wiki-maintenance',
  PUBLISHED: 'published',
} as const;

/**
 * 애플리케이션 설정 상수
 * 하드코딩된 값들을 중앙에서 관리
 */
export const APP_CONFIG = {
  // 자동 저장 설정
  autoSave: {
    /** 자동 저장 지연 시간 (ms) */
    delay: 2000,
    /** 드래프트 키 접두사 */
    draftKeyPrefix: 'wiki-draft-',
  },

  // 토스트/알림 설정
  toast: {
    /** 최대 토스트 표시 개수 */
    maxToasts: 5,
    /** 기본 토스트 표시 시간 (ms) */
    defaultDuration: 5000,
  },

  // 사이드바 설정
  sidebar: {
    /** 폴더 확장 상태 저장 키 */
    expandedFoldersKey: 'sepilot-wiki-expanded-folders',
    /** localStorage 저장 디바운스 (ms) */
    saveDebounce: 300,
  },

  // 검색 설정
  search: {
    /** 검색 디바운스 (ms) */
    debounce: 300,
    /** 최소 검색어 길이 */
    minQueryLength: 2,
  },

  // API 설정
  api: {
    /** 기본 재시도 횟수 */
    maxRetries: 2,
    /** 재시도 초기 지연 (ms) */
    retryInitialDelay: 500,
  },

  // 캐시 TTL 설정 (ms)
  cache: {
    /** Wiki 데이터 TTL (5분) */
    wikiData: 5 * 60 * 1000,
    /** 가이드 데이터 TTL (5분) */
    guideData: 5 * 60 * 1000,
    /** Issues TTL (2분) */
    issues: 2 * 60 * 1000,
    /** AI 히스토리 TTL (3분) */
    aiHistory: 3 * 60 * 1000,
    /** Actions 상태 TTL (1분) */
    actionsStatus: 1 * 60 * 1000,
  },

  // 콘텐츠 검증 설정
  validation: {
    /** 최소 콘텐츠 길이 */
    minContentLength: 10,
    /** 최대 콘텐츠 크기 (KB) */
    maxContentSizeKB: 100,
    /** 최소 제목 길이 */
    minTitleLength: 2,
    /** 최대 제목 길이 */
    maxTitleLength: 100,
  },
} as const;

// GitHub URL 헬퍼 함수들
export const urls = {
  // 저장소 URL
  repo: () => `${GITHUB_BASE_URL}/${config.owner}/${config.repo}`,

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

  // 특정 Issue URL
  issue: (number: number) => `${urls.repo()}/issues/${number}`,

  // 커밋 URL
  commit: (sha: string) => `${urls.repo()}/commit/${sha}`,

  // 파일 히스토리 URL
  fileHistory: (path: string, branch = 'main') =>
    `${urls.repo()}/commits/${branch}/${path}`,

  // GitHub Pages URL (GHES의 경우 다를 수 있음)
  pages: () => {
    // GHES인 경우 baseUrl에서 Pages URL 생성
    if (githubConfig.baseUrl) {
      // https://github.mycompany.com -> https://pages.github.mycompany.com/owner/repo
      // 또는 GHES 설정에 따라 다를 수 있음
      const url = new URL(githubConfig.baseUrl);
      return `${url.protocol}//pages.${url.host}/${config.owner}/${config.repo}`;
    }
    // GitHub.com
    return `https://${config.owner}.github.io/${config.repo}`;
  },
};
