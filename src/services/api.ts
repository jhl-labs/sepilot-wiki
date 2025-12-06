import type { WikiPage, GitHubIssue, WikiTree, AIHistory, AIHistoryEntry, TagStats, ActionsStatus } from '../types';

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
        const response = await fetch(`${import.meta.env.BASE_URL}wiki-data.json${cacheBuster}`);
        if (!response.ok) {
            return { pages: [], tree: [] };
        }
        wikiDataCache = await response.json();
        return wikiDataCache!;
    } catch (error) {
        console.error('Error loading wiki data:', error);
        return { pages: [], tree: [] };
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

// 기본 가이드 페이지 목록 (정적)
export function getGuidePages(): WikiTree[] {
    return [
        { title: '시작하기', slug: '_guide/getting-started' },
        { title: '테마 커스터마이징', slug: '_guide/customization' },
        { title: 'LLM 워크플로우', slug: '_guide/llm-workflow' },
        { title: '설정 파일 가이드', slug: '_guide/configuration' },
        { title: 'FAQ', slug: '_guide/faq' },
    ];
}

// Wiki 페이지 내용 가져오기 (정적 데이터에서)
export async function fetchWikiPage(slug: string): Promise<WikiPage | null> {
    // 정적 데이터에서 페이지 찾기
    // 이제 가이드 페이지도 wiki-data.json에 포함되므로 별도 로직 불필요
    const data = await loadWikiData();
    const page = data.pages.find((p) => p.slug === slug);
    return page || null;
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
        const response = await fetch(`${import.meta.env.BASE_URL}data/issues.json${cacheBuster}`);
        if (!response.ok) {
            return { issues: [], lastUpdated: new Date().toISOString() };
        }
        issuesDataCache = await response.json();
        return issuesDataCache!;
    } catch (error) {
        console.error('Error loading issues data:', error);
        return { issues: [], lastUpdated: new Date().toISOString() };
    }
}

// GitHub Issues 가져오기 (정적 JSON에서)
export async function fetchIssues(label?: string): Promise<GitHubIssue[]> {
    try {
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
    } catch (error) {
        console.error('Error fetching issues:', error);
        return [];
    }
}

// 특정 Issue 가져오기 (정적 JSON에서)
export async function fetchIssue(issueNumber: number): Promise<GitHubIssue | null> {
    try {
        const data = await loadIssuesData();
        return data.issues.find((issue) => issue.number === issueNumber) || null;
    } catch (error) {
        console.error('Error fetching issue:', error);
        return null;
    }
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
        const response = await fetch(`${import.meta.env.BASE_URL}data/ai-history.json${cacheBuster}`);
        if (!response.ok) {
            return { entries: [], lastUpdated: new Date().toISOString() };
        }
        aiHistoryCache = await response.json();
        return aiHistoryCache!;
    } catch (error) {
        console.error('Error loading AI history:', error);
        return { entries: [], lastUpdated: new Date().toISOString() };
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
        const response = await fetch(`${import.meta.env.BASE_URL}actions-status.json${cacheBuster}`);
        if (!response.ok) {
            return null;
        }
        actionsStatusCache = await response.json();
        return actionsStatusCache;
    } catch (error) {
        console.error('Error loading actions status:', error);
        return null;
    }
}
