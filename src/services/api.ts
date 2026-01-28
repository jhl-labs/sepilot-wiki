import type { WikiPage, GitHubIssue, WikiTree, AIHistory, AIHistoryEntry, TagStats, ActionsStatus, ApiError } from '../types';

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

// 빌드 시점에 생성된 정적 wiki 데이터 캐시
let wikiDataCache: { pages: WikiPage[]; tree: WikiTree[] } | null = null;

// 정적 wiki 데이터 로드
async function loadWikiData(): Promise<{ pages: WikiPage[]; tree: WikiTree[] }> {
    if (wikiDataCache) {
        return wikiDataCache;
    }

    try {
        // cache-busting: 브라우저 캐시 우회를 위해 타임스탬프 추가
        const cacheBuster = `?v=${Date.now()}`;
        const baseUrl = getBaseUrl();
        const response = await fetch(`${baseUrl}wiki-data.json${cacheBuster}`);
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
        wikiDataCache = await response.json();
        return wikiDataCache!;
    } catch (error) {
        if (error instanceof ApiServiceError) throw error;
        console.error('Error loading wiki data:', error);
        throw new ApiServiceError(
            '위키 데이터를 불러오는 중 오류가 발생했습니다.',
            'NETWORK_ERROR',
            undefined,
            true
        );
    }
}

// 빌드 시점에 생성된 정적 guide 데이터 캐시
let guideDataCache: { pages: WikiPage[] } | null = null;

// 정적 guide 데이터 로드
async function loadGuideData(): Promise<{ pages: WikiPage[] }> {
    if (guideDataCache) {
        return guideDataCache;
    }

    try {
        const cacheBuster = `?v=${Date.now()}`;
        const baseUrl = getBaseUrl();
        const response = await fetch(`${baseUrl}guide-data.json${cacheBuster}`);
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
        guideDataCache = await response.json();
        return guideDataCache!;
    } catch (error) {
        if (error instanceof ApiServiceError) throw error;
        console.error('Error loading guide data:', error);
        throw new ApiServiceError(
            '가이드 데이터를 불러오는 중 오류가 발생했습니다.',
            'NETWORK_ERROR',
            undefined,
            true
        );
    }
}

// Wiki 페이지 목록 가져오기 (정적 데이터에서)
export async function fetchWikiPages(): Promise<WikiTree[]> {
    const data = await loadWikiData();
    // _guide 폴더는 메인 트리에서 제외 (사이드바 별도 표시 위함)
    // 단, build-wiki-data.js는 _guide를 포함시킬 수 있으므로 필터링 필요
    // slug가 _guide/ 로 시작하거나 path가 _guide인 것 필터링
    // data.tree 구조: WikiTree[]
    // 최상위 레벨에서 _guide 폴더를 찾아 제거하거나 필터링

    // _guide 폴더의 이름이 'Guide' 또는 '_guide'로 되어 있을 것.
    // build-wiki-data.js는 폴더명을 그대로 씀 (slug relative path parts)
    // _guide 폴더는 tree의 최상위 노드로 존재할 가능성 높음.
    // 안전하게 필터링:
    return data.tree.filter(item => {
        // 카테고리인 경우 path 확인
        if (item.isCategory && (item.path === '_guide' || item.name === '_guide')) return false;
        // 페이지인 경우 slug 확인
        if (item.slug && item.slug.startsWith('_guide/')) return false;
        return true;
    });
}

// Wiki 페이지의 모든 태그와 통계 가져오기
export async function fetchWikiTags(): Promise<TagStats[]> {
    const data = await loadWikiData();
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

    // 배열로 변환하고 개수 기준으로 정렬
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

// Wiki 페이지 내용 가져오기 (정적 데이터에서)
export async function fetchWikiPage(slug: string): Promise<WikiPage | null> {
    // wiki-data.json에서 먼저 찾기
    const wikiData = await loadWikiData();
    const wikiPage = wikiData.pages.find((p) => p.slug === slug);
    if (wikiPage) {
        return wikiPage;
    }

    // guide-data.json에서 찾기 (guide/ 접두사 없이 저장되어 있음)
    const guideData = await loadGuideData();
    const guideSlug = slug.startsWith('guide/') ? slug.slice(6) : slug;
    const guidePage = guideData.pages.find((p) => p.slug === guideSlug);
    if (guidePage) {
        // slug에 guide/ 접두사 추가하여 반환
        return { ...guidePage, slug: `guide/${guidePage.slug}` };
    }

    return null;
}

// Issues 데이터 캐시
let issuesDataCache: { issues: GitHubIssue[]; lastUpdated: string } | null = null;

// 정적 Issues 데이터 로드 (JSON 파일에서)
async function loadIssuesData(): Promise<{ issues: GitHubIssue[]; lastUpdated: string }> {
    if (issuesDataCache) {
        return issuesDataCache;
    }

    try {
        // cache-busting: 브라우저 캐시 우회를 위해 타임스탬프 추가
        const cacheBuster = `?v=${Date.now()}`;
        const baseUrl = getBaseUrl();
        const response = await fetch(`${baseUrl}data/issues.json${cacheBuster}`);
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
        issuesDataCache = await response.json();
        return issuesDataCache!;
    } catch (error) {
        if (error instanceof ApiServiceError) throw error;
        console.error('Error loading issues data:', error);
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

    // 라벨 필터링
    return data.issues.filter((issue) =>
        issue.labels.some((l) => {
            const labelName = typeof l === 'string' ? l : l.name;
            return labelName === label;
        })
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

// AI History 데이터 캐시
let aiHistoryCache: AIHistory | null = null;

// AI History 데이터 로드
export async function fetchAIHistory(): Promise<AIHistory> {
    if (aiHistoryCache) {
        return aiHistoryCache;
    }

    try {
        // cache-busting: 브라우저 캐시 우회를 위해 타임스탬프 추가
        const cacheBuster = `?v=${Date.now()}`;
        const baseUrl = getBaseUrl();
        const response = await fetch(`${baseUrl}data/ai-history.json${cacheBuster}`);
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
        aiHistoryCache = await response.json();
        return aiHistoryCache!;
    } catch (error) {
        if (error instanceof ApiServiceError) throw error;
        console.error('Error loading AI history:', error);
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

// Actions Status 데이터 캐시
let actionsStatusCache: ActionsStatus | null = null;

// Actions Status 데이터 로드
export async function fetchActionsStatus(): Promise<ActionsStatus | null> {
    if (actionsStatusCache) {
        return actionsStatusCache;
    }

    try {
        const cacheBuster = `?v=${Date.now()}`;
        const baseUrl = getBaseUrl();
        const response = await fetch(`${baseUrl}actions-status.json${cacheBuster}`);
        if (!response.ok) {
            // Actions 상태는 선택적이므로 404는 null 반환
            if (response.status === 404) {
                return null;
            }
            // 다른 에러는 로깅만 하고 null 반환 (중요하지 않은 데이터)
            console.warn('Actions status fetch failed:', response.status);
            return null;
        }
        actionsStatusCache = await response.json();
        return actionsStatusCache;
    } catch (error) {
        console.warn('Error loading actions status:', error);
        return null;
    }
}
