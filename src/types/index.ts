// Wiki 관련 타입
export type WikiStatus = 'draft' | 'published' | 'needs_review' | 'deleted';

export interface WikiPage {
  title: string;
  slug: string;
  content: string;
  lastModified: string;
  author?: string;
  status?: WikiStatus;
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
  // 페이지인 경우
  title?: string;
  slug?: string;
  menu?: string;
  // 카테고리(폴더)인 경우
  name?: string;
  path?: string;
  isCategory?: boolean;
  // 공통
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
  documentSlug?: string | null;
  documentPath?: string | null;
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

// 사이트 설정 타입
export interface SiteConfig {
  title: string;
  description: string;
  logo?: LogoConfig;
  favicon?: string;
  owner: string;
  repo: string;
  wikiPath: string;
  social?: SocialLinks;
  footer?: FooterConfig;
  // GitHub Enterprise Server (GHES) 지원
  github?: GitHubConfig;
}

// GitHub 설정 (GHES 지원)
export interface GitHubConfig {
  // GitHub Enterprise Server URL (예: 'https://github.mycompany.com')
  // 기본값: 'https://github.com' (GitHub.com)
  baseUrl?: string;
  // GitHub API URL (예: 'https://github.mycompany.com/api/v3')
  // 기본값: 'https://api.github.com'
  apiUrl?: string;
  // Raw content URL (예: 'https://raw.github.mycompany.com')
  // 기본값: 'https://raw.githubusercontent.com'
  rawUrl?: string;
}

export interface LogoConfig {
  type: 'text' | 'image' | 'icon';
  value: string;
  alt?: string;
}

export interface SocialLinks {
  github?: string;
  twitter?: string;
  discord?: string;
  website?: string;
}

export interface FooterConfig {
  enabled?: boolean;
  copyright?: {
    enabled?: boolean;
    text?: string;
    startYear?: number;
  };
  links?: { label: string; url: string }[];
  showPoweredBy?: boolean;
}

// 테마 설정 타입
export interface ThemeConfig {
  colors: ThemeColors;
  fonts?: ThemeFonts;
  layout?: ThemeLayout;
  borderRadius?: ThemeBorderRadius;
}

export interface ThemeColors {
  light: ColorScheme;
  dark: ColorScheme;
}

export interface ColorScheme {
  primary: string;
  primaryHover?: string;
  background: string;
  backgroundSecondary?: string;
  backgroundTertiary?: string;
  text: string;
  textSecondary?: string;
  textMuted?: string;
  border?: string;
  accent?: string;
  success?: string;
  warning?: string;
  error?: string;
  info?: string;
}

export interface ThemeFonts {
  sans?: string;
  mono?: string;
  heading?: string;
}

export interface ThemeLayout {
  headerHeight?: string;
  sidebarWidth?: string;
  contentMaxWidth?: string;
  tocWidth?: string;
}

export interface ThemeBorderRadius {
  sm?: string;
  md?: string;
  lg?: string;
  xl?: string;
}

// 네비게이션 설정 타입
export interface NavigationConfig {
  main?: NavSection[];
  sidebar?: SidebarSection[];
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export interface NavItem {
  label: string;
  href: string;
  icon?: string;
  external?: boolean;
  badge?: string;
}

export interface SidebarSection {
  title: string;
  icon?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  items: SidebarNavItem[];
}

export interface SidebarNavItem {
  label: string;
  href: string;
  icon?: string;
  external?: boolean;
  badge?: string;
  children?: SidebarNavItem[];
}

// AI History 관련 타입
export type AIActionType = 'generate' | 'modify' | 'publish' | 'invalid' | 'delete' | 'recover';

export interface AIHistoryEntry {
  id: string;
  timestamp: string;
  actionType: AIActionType;
  issueNumber: number;
  issueTitle: string;
  documentSlug: string;
  documentTitle: string;
  summary: string;
  trigger: 'request_label' | 'invalid_label' | 'maintainer_comment' | 'issue_close' | 'issue_reopen';
  triggerUser?: string;
  model?: string;
  changes?: {
    additions?: number;
    deletions?: number;
  };
}

export interface AIHistory {
  entries: AIHistoryEntry[];
  lastUpdated: string;
}

export interface DocumentAIHistory {
  slug: string;
  title: string;
  entries: AIHistoryEntry[];
}

// 태그 통계 타입
export interface TagStats {
  tag: string;
  count: number;
  pages: { title: string; slug: string }[];
}

// GitHub Actions Status 타입을 추가합니다.
export interface WorkflowRun {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  branch: string;
  event: string;
  createdAt: string;
  updatedAt?: string;
  url: string;
  actor: string;
}

export interface WorkflowStatus {
  id: number;
  name: string;
  path: string;
  state: string;
  overallStatus: string;
  badgeUrl: string;
  url: string;
  recentRuns: WorkflowRun[];
}

export interface ActionsStatus {
  collectedAt: string;
  repository: string;
  summary: {
    totalWorkflows: number;
    inProgressCount: number;
    recentFailuresCount: number;
  };
  workflows: WorkflowStatus[];
  inProgress: WorkflowRun[];
  recentFailures: WorkflowRun[];
}
