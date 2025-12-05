// Wiki 관련 타입
export interface WikiPage {
  title: string;
  slug: string;
  content: string;
  lastModified: string;
  author?: string;
  isDraft?: boolean;
  isInvalid?: boolean;
  tags?: string[];
  history?: WikiRevision[];
}

// Wiki 문서 버전(리비전) 타입
export interface WikiRevision {
  sha: string;
  message: string;
  author: string;
  authorEmail?: string;
  date: string;
  additions?: number;
  deletions?: number;
}

export interface WikiTree {
  title: string;
  slug: string;
  children?: WikiTree[];
}

// GitHub Issue 관련 타입
export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  labels: GitHubLabel[];
  user: GitHubUser;
  created_at: string;
  updated_at: string;
  comments: number;
  html_url: string;
}

export interface GitHubLabel {
  id: number;
  name: string;
  color: string;
  description?: string;
}

export interface GitHubUser {
  login: string;
  avatar_url: string;
  html_url: string;
}

export interface GitHubComment {
  id: number;
  body: string;
  user: GitHubUser;
  created_at: string;
  updated_at: string;
}

// 검색 관련 타입
export interface SearchResult {
  type: 'wiki' | 'issue';
  title: string;
  slug?: string;
  excerpt: string;
  url?: string;
  lastModified?: string;
}

// 테마 관련 타입
export type Theme = 'light' | 'dark' | 'system';

// 사이드바 관련 타입
export interface SidebarItem {
  title: string;
  slug: string;
  icon?: string;
  children?: SidebarItem[];
  isExpanded?: boolean;
}

// 브레드크럼 관련 타입
export interface Breadcrumb {
  title: string;
  slug?: string;
}

// API 응답 타입
export interface ApiResponse<T> {
  data: T;
  error?: string;
  loading: boolean;
}

// 설정 타입
export interface WikiConfig {
  owner: string;
  repo: string;
  wikiRepo?: string;
  title: string;
  description: string;
  baseUrl: string;
}
