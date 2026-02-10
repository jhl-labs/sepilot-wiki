import type { WikiPage, GitHubIssue, WikiTree, AIHistory, AIHistoryEntry, TagStats, ActionsStatus, DashboardStats, ApiError } from '../types';
import { getLabelName } from '../types';
import { fetchWithRetry } from '../utils/retry';
import { createLogger } from '../utils/logger';
import { getBaseUrl } from '../utils/url';

const logger = createLogger('api');

// TTL 기반 캐시 클래스
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class TTLCache<T> {
  private cache: CacheEntry<T> | null = null;
  private ttl: number;

  constructor(ttlMs: number) {
    this.ttl = ttlMs;
  }

  get(): T | null {
    if (!this.cache) return null;

    const now = Date.now();
    if (now - this.cache.timestamp > this.ttl) {
      // 캐시 만료
      this.cache = null;
      return null;
    }

    return this.cache.data;
  }

  set(data: T): void {
    this.cache = {
      data,
      timestamp: Date.now(),
    };
  }

  invalidate(): void {
    this.cache = null;
  }

  isValid(): boolean {
    if (!this.cache) return false;
    return Date.now() - this.cache.timestamp <= this.ttl;
  }
}

// 캐시 TTL 설정 (밀리초)
const CACHE_TTL = {
  WIKI_DATA: 5 * 60 * 1000,     // 5분 - 정적 데이터
  WIKI_META: 5 * 60 * 1000,     // 5분 - 경량 메타데이터
  WIKI_PAGE: 5 * 60 * 1000,     // 5분 - 개별 페이지
  GUIDE_DATA: 5 * 60 * 1000,    // 5분 - 정적 데이터
  ISSUES: 2 * 60 * 1000,        // 2분 - 자주 변경될 수 있음
  AI_HISTORY: 3 * 60 * 1000,    // 3분
  ACTIONS_STATUS: 1 * 60 * 1000, // 1분 - 실시간성 필요
  DASHBOARD_STATS: 2 * 60 * 1000, // 2분
};

// API 에러 클래스
export class ApiServiceError extends Error {
  code: string;
  statusCode?: number;
  recoverable: boolean;

  constructor(message: string, code: string = 'UNKNOWN', statusCode?: number, recoverable = false) {
    super(message);
    this.name = 'ApiServiceError';
    this.code = code;
    this.statusCode = statusCode;
    this.recoverable = recoverable;
  }

  toApiError(): ApiError {
    return {
      code: this.code as ApiError['code'],
      message: this.message,
      statusCode: this.statusCode,
      recoverable: this.recoverable,
    };
  }
}

// wiki-meta.json의 경량 페이지 타입 (content, history 제외)
interface WikiPageMeta {
  title: string;
  slug: string;
  status?: string;
  tags?: string[];
  lastModified: string;
  author?: string;
  isDraft?: boolean;
  isInvalid?: boolean;
  menu?: string;
}

// TTL 기반 캐시 인스턴스들
const wikiDataCache = new TTLCache<{ pages: WikiPage[]; tree: WikiTree[] }>(CACHE_TTL.WIKI_DATA);
const wikiMetaCache = new TTLCache<{ pages: WikiPageMeta[]; tree: WikiTree[] }>(CACHE_TTL.WIKI_META);
const wikiPageCaches = new Map<string, TTLCache<WikiPage>>();
const guideDataCache = new TTLCache<{ pages: WikiPage[] }>(CACHE_TTL.GUIDE_DATA);
const issuesDataCache = new TTLCache<{ issues: GitHubIssue[]; lastUpdated: string }>(CACHE_TTL.ISSUES);
const aiHistoryCache = new TTLCache<AIHistory>(CACHE_TTL.AI_HISTORY);
const actionsStatusCache = new TTLCache<ActionsStatus>(CACHE_TTL.ACTIONS_STATUS);
const dashboardStatsCache = new TTLCache<DashboardStats>(CACHE_TTL.DASHBOARD_STATS);

/**
 * 캐시 버스팅용 버전 문자열 생성
 * 정적 데이터: 빌드 시간 기반 (배포마다 갱신)
 * 동적 데이터: 시간 기반 (지정된 간격으로 갱신)
 */
function getCacheBuster(type: 'static' | 'dynamic', intervalMs = 60000): string {
  if (type === 'static') {
    // 빌드 시간 사용 - 같은 빌드 내에서는 CDN 캐시 활용 가능
    const buildTime = typeof process !== 'undefined'
      ? process.env.NEXT_PUBLIC_BUILD_TIME
      : undefined;
    return buildTime || new Date().toISOString().slice(0, 10); // fallback: 날짜
  }
  // 동적 데이터는 지정된 간격으로 캐시 키 변경
  return String(Math.floor(Date.now() / intervalMs));
}

// 정적 wiki 데이터 로드
async function loadWikiData(): Promise<{ pages: WikiPage[]; tree: WikiTree[] }> {
    const cached = wikiDataCache.get();
    if (cached) {
        return cached;
    }

    try {
        // cache-busting: 빌드 버전 기반 (CDN 캐시 활용 가능)
        const cacheBuster = `?v=${getCacheBuster('static')}`;
        const baseUrl = getBaseUrl();
        const response = await fetchWithRetry(`${baseUrl}wiki-data.json${cacheBuster}`, undefined, {
            maxRetries: 2,
            initialDelay: 500,
        });
        if (!response.ok) {
            if (response.status === 404) {
                // 데이터 파일이 없는 경우 빈 데이터 반환 (초기 상태)
                return { pages: [], tree: [] };
            }
            throw new ApiServiceError(
                '위키 데이터를 불러오는데 실패했습니다.',
                response.status >= 500 ? 'SERVER_ERROR' : 'NETWORK_ERROR',
                response.status,
                true
            );
        }
        const data = await response.json();
        wikiDataCache.set(data);
        return data;
    } catch (error) {
        if (error instanceof ApiServiceError) throw error;
        logger.error('위키 데이터 로드 실패', error);
        throw new ApiServiceError(
            '위키 데이터를 불러오는 중 오류가 발생했습니다.',
            'NETWORK_ERROR',
            undefined,
            true
        );
    }
}

// 경량 wiki 메타데이터 로드 (목록/트리 전용, content·history 제외)
async function loadWikiMeta(): Promise<{ pages: WikiPageMeta[]; tree: WikiTree[] }> {
    const cached = wikiMetaCache.get();
    if (cached) {
        return cached;
    }

    try {
        const cacheBuster = `?v=${getCacheBuster('static')}`;
        const baseUrl = getBaseUrl();
        const response = await fetchWithRetry(`${baseUrl}wiki-meta.json${cacheBuster}`, undefined, {
            maxRetries: 2,
            initialDelay: 500,
        });
        if (!response.ok) {
            if (response.status === 404) {
                // wiki-meta.json이 없으면 기존 wiki-data.json으로 폴백
                logger.info('wiki-meta.json 없음, wiki-data.json으로 폴백');
                const fullData = await loadWikiData();
                const meta = {
                    pages: fullData.pages.map(({ title, slug, status, tags, lastModified, author, isDraft, isInvalid, menu }) => ({
                        title, slug, status, tags, lastModified, author, isDraft, isInvalid, menu,
                    })),
                    tree: fullData.tree,
                };
                wikiMetaCache.set(meta);
                return meta;
            }
            throw new ApiServiceError(
                '위키 메타데이터를 불러오는데 실패했습니다.',
                response.status >= 500 ? 'SERVER_ERROR' : 'NETWORK_ERROR',
                response.status,
                true
            );
        }
        const data = await response.json();
        wikiMetaCache.set(data);
        return data;
    } catch (error) {
        if (error instanceof ApiServiceError) throw error;
        // 네트워크 실패 시 wiki-data.json으로 폴백
        logger.warn('wiki-meta.json 로드 실패, wiki-data.json으로 폴백', { error });
        try {
            const fullData = await loadWikiData();
            const meta = {
                pages: fullData.pages.map(({ title, slug, status, tags, lastModified, author, isDraft, isInvalid, menu }) => ({
                    title, slug, status, tags, lastModified, author, isDraft, isInvalid, menu,
                })),
                tree: fullData.tree,
            };
            wikiMetaCache.set(meta);
            return meta;
        } catch {
            throw new ApiServiceError(
                '위키 메타데이터를 불러오는 중 오류가 발생했습니다.',
                'NETWORK_ERROR',
                undefined,
                true
            );
        }
    }
}

// 개별 wiki 페이지 로드 (wiki-pages/{slug}.json)
async function loadWikiPage(slug: string): Promise<WikiPage | null> {
    // 개별 페이지 캐시 확인
    const pageCache = wikiPageCaches.get(slug);
    if (pageCache) {
        const cached = pageCache.get();
        if (cached) return cached;
    }

    try {
        const cacheBuster = `?v=${getCacheBuster('static')}`;
        const baseUrl = getBaseUrl();
        const response = await fetchWithRetry(`${baseUrl}wiki-pages/${slug}.json${cacheBuster}`, undefined, {
            maxRetries: 1,
            initialDelay: 300,
        });
        if (!response.ok) {
            return null;
        }
        const page: WikiPage = await response.json();

        // 캐시에 저장
        let cache = wikiPageCaches.get(slug);
        if (!cache) {
            cache = new TTLCache<WikiPage>(CACHE_TTL.WIKI_PAGE);
            wikiPageCaches.set(slug, cache);
        }
        cache.set(page);

        return page;
    } catch {
        return null;
    }
}

// 정적 guide 데이터 로드
async function loadGuideData(): Promise<{ pages: WikiPage[] }> {
    const cached = guideDataCache.get();
    if (cached) {
        return cached;
    }

    try {
        // cache-busting: 빌드 버전 기반 (CDN 캐시 활용 가능)
        const cacheBuster = `?v=${getCacheBuster('static')}`;
        const baseUrl = getBaseUrl();
        const response = await fetchWithRetry(`${baseUrl}guide-data.json${cacheBuster}`, undefined, {
            maxRetries: 2,
            initialDelay: 500,
        });
        if (!response.ok) {
            if (response.status === 404) {
                return { pages: [] };
            }
            throw new ApiServiceError(
                '가이드 데이터를 불러오는데 실패했습니다.',
                response.status >= 500 ? 'SERVER_ERROR' : 'NETWORK_ERROR',
                response.status,
                true
            );
        }
        const data = await response.json();
        guideDataCache.set(data);
        return data;
    } catch (error) {
        if (error instanceof ApiServiceError) throw error;
        logger.error('가이드 데이터 로드 실패', error);
        throw new ApiServiceError(
            '가이드 데이터를 불러오는 중 오류가 발생했습니다.',
            'NETWORK_ERROR',
            undefined,
            true
        );
    }
}

// Wiki 페이지 목록 가져오기 (경량 메타데이터에서)
export async function fetchWikiPages(): Promise<WikiTree[]> {
    const data = await loadWikiMeta();
    return data.tree.filter(item => {
        if (item.isCategory && (item.path === '_guide' || item.name === '_guide')) return false;
        if (item.slug && item.slug.startsWith('_guide/')) return false;
        return true;
    });
}

// Wiki 페이지의 모든 태그와 통계 가져오기 (경량 메타데이터에서)
export async function fetchWikiTags(): Promise<TagStats[]> {
    const data = await loadWikiMeta();
    const tagMap = new Map<string, { count: number; pages: { title: string; slug: string }[] }>();

    for (const page of data.pages) {
        if (page.tags && Array.isArray(page.tags)) {
            for (const tag of page.tags) {
                const existing = tagMap.get(tag);
                if (existing) {
                    existing.count++;
                    existing.pages.push({ title: page.title, slug: page.slug });
                } else {
                    tagMap.set(tag, { count: 1, pages: [{ title: page.title, slug: page.slug }] });
                }
            }
        }
    }

    return Array.from(tagMap.entries())
        .map(([tag, stats]) => ({ tag, ...stats }))
        .sort((a, b) => b.count - a.count);
}

// 가이드 페이지 목록 가져오기 (정적 guide-data.json에서)
export async function fetchGuidePages(): Promise<WikiTree[]> {
    const data = await loadGuideData();
    return data.pages.map(page => ({
        title: page.title,
        slug: page.slug,
        menu: page.menu,
    }));
}

// Wiki 페이지 내용 가져오기 (개별 JSON 우선, 폴백으로 wiki-data.json)
export async function fetchWikiPage(slug: string): Promise<WikiPage | null> {
    // 1단계: 개별 페이지 JSON 시도 (wiki-pages/{slug}.json)
    const individualPage = await loadWikiPage(slug);
    if (individualPage) {
        return individualPage;
    }

    // 2단계: 기존 wiki-data.json에서 폴백
    const wikiData = await loadWikiData();
    const wikiPage = wikiData.pages.find((p) => p.slug === slug);
    if (wikiPage) {
        return wikiPage;
    }

    // 3단계: guide-data.json에서 찾기
    const guideData = await loadGuideData();
    const guideSlug = slug.startsWith('guide/') ? slug.slice(6) : slug;
    const guidePage = guideData.pages.find((p) => p.slug === guideSlug);
    if (guidePage) {
        return { ...guidePage, slug: `guide/${guidePage.slug}` };
    }

    return null;
}

// 정적 Issues 데이터 로드 (JSON 파일에서)
async function loadIssuesData(): Promise<{ issues: GitHubIssue[]; lastUpdated: string }> {
    const cached = issuesDataCache.get();
    if (cached) {
        return cached;
    }

    try {
        // cache-busting: 2분 간격으로 캐시 키 변경 (동적 데이터)
        const cacheBuster = `?v=${getCacheBuster('dynamic', 2 * 60 * 1000)}`;
        const baseUrl = getBaseUrl();
        const response = await fetchWithRetry(`${baseUrl}data/issues.json${cacheBuster}`, undefined, {
            maxRetries: 2,
            initialDelay: 500,
        });
        if (!response.ok) {
            if (response.status === 404) {
                return { issues: [], lastUpdated: new Date().toISOString() };
            }
            throw new ApiServiceError(
                'Issue 데이터를 불러오는데 실패했습니다.',
                response.status >= 500 ? 'SERVER_ERROR' : 'NETWORK_ERROR',
                response.status,
                true
            );
        }
        const data = await response.json();
        issuesDataCache.set(data);
        return data;
    } catch (error) {
        if (error instanceof ApiServiceError) throw error;
        logger.error('이슈 데이터 로드 실패', error);
        throw new ApiServiceError(
            'Issue 데이터를 불러오는 중 오류가 발생했습니다.',
            'NETWORK_ERROR',
            undefined,
            true
        );
    }
}

// GitHub Issues 가져오기 (정적 JSON에서)
export async function fetchIssues(label?: string): Promise<GitHubIssue[]> {
    const data = await loadIssuesData();

    if (!label) {
        return data.issues;
    }

    // 라벨 필터링 (타입 가드 사용)
    return data.issues.filter((issue) =>
        issue.labels.some((l) => getLabelName(l) === label)
    );
}

// 특정 Issue 가져오기 (정적 JSON에서)
export async function fetchIssue(issueNumber: number): Promise<GitHubIssue | null> {
    const data = await loadIssuesData();
    const issue = data.issues.find((issue) => issue.number === issueNumber);
    if (!issue) {
        return null;
    }
    return issue;
}

// AI History 데이터 로드
export async function fetchAIHistory(): Promise<AIHistory> {
    const cached = aiHistoryCache.get();
    if (cached) {
        return cached;
    }

    try {
        // cache-busting: 3분 간격으로 캐시 키 변경 (동적 데이터)
        const cacheBuster = `?v=${getCacheBuster('dynamic', 3 * 60 * 1000)}`;
        const baseUrl = getBaseUrl();
        const response = await fetchWithRetry(`${baseUrl}data/ai-history.json${cacheBuster}`, undefined, {
            maxRetries: 2,
            initialDelay: 500,
        });
        if (!response.ok) {
            if (response.status === 404) {
                return { entries: [], lastUpdated: new Date().toISOString() };
            }
            throw new ApiServiceError(
                'AI 히스토리 데이터를 불러오는데 실패했습니다.',
                response.status >= 500 ? 'SERVER_ERROR' : 'NETWORK_ERROR',
                response.status,
                true
            );
        }
        const data = await response.json();
        aiHistoryCache.set(data);
        return data;
    } catch (error) {
        if (error instanceof ApiServiceError) throw error;
        logger.error('AI 히스토리 로드 실패', error);
        throw new ApiServiceError(
            'AI 히스토리 데이터를 불러오는 중 오류가 발생했습니다.',
            'NETWORK_ERROR',
            undefined,
            true
        );
    }
}

// 특정 문서의 AI History 조회
export async function fetchDocumentAIHistory(slug: string): Promise<AIHistoryEntry[]> {
    const history = await fetchAIHistory();
    return history.entries.filter(entry => entry.documentSlug === slug);
}

// Actions Status 데이터 로드
export async function fetchActionsStatus(): Promise<ActionsStatus | null> {
    const cached = actionsStatusCache.get();
    if (cached) {
        return cached;
    }

    try {
        // cache-busting: 1분 간격으로 캐시 키 변경 (실시간성 필요)
        const cacheBuster = `?v=${getCacheBuster('dynamic', 1 * 60 * 1000)}`;
        const baseUrl = getBaseUrl();
        const response = await fetch(`${baseUrl}actions-status.json${cacheBuster}`);
        if (!response.ok) {
            // Actions 상태는 선택적이므로 404는 null 반환
            if (response.status === 404) {
                return null;
            }
            // 다른 에러는 로깅만 하고 null 반환 (중요하지 않은 데이터)
            logger.warn('Actions 상태 가져오기 실패', { status: response.status });
            return null;
        }
        const data = await response.json();
        actionsStatusCache.set(data);
        return data;
    } catch (error) {
        logger.warn('Actions 상태 로드 실패', { error });
        return null;
    }
}

// Dashboard Stats 데이터 로드
export async function fetchDashboardStats(): Promise<DashboardStats | null> {
    const cached = dashboardStatsCache.get();
    if (cached) {
        return cached;
    }

    try {
        const cacheBuster = `?v=${getCacheBuster('dynamic', 2 * 60 * 1000)}`;
        const baseUrl = getBaseUrl();
        const response = await fetch(`${baseUrl}data/dashboard-stats.json${cacheBuster}`);
        if (!response.ok) {
            if (response.status === 404) {
                return null;
            }
            logger.warn('대시보드 통계 가져오기 실패', { status: response.status });
            return null;
        }
        const data = await response.json();
        dashboardStatsCache.set(data);
        return data;
    } catch (error) {
        logger.warn('대시보드 통계 로드 실패', { error });
        return null;
    }
}
