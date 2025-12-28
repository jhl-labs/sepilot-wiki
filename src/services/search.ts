import Fuse from 'fuse.js';
import type { WikiPage } from '../types';

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

// 검색 필터 타입
export interface SearchFilter {
    tags?: string[];
    dateFrom?: string;
    dateTo?: string;
    author?: string;
}

// 검색 인덱스 타입
interface SearchIndexItem {
    title: string;
    slug: string;
    content: string;
    excerpt: string;
    tags: string[];
    lastModified: string;
    author?: string;
}

// 검색 인덱스 캐시
let searchIndexCache: SearchIndexItem[] | null = null;
let fuseInstance: Fuse<SearchIndexItem> | null = null;

// 정적 검색 인덱스 로드
async function loadSearchIndex(): Promise<{ items: SearchIndexItem[]; fuse: Fuse<SearchIndexItem> }> {
    if (searchIndexCache && fuseInstance) {
        return { items: searchIndexCache, fuse: fuseInstance };
    }

    try {
        // cache-busting: 브라우저 캐시 우회를 위해 타임스탬프 추가
        const cacheBuster = `?v=${Date.now()}`;
        const baseUrl = getBaseUrl();
        const response = await fetch(`${baseUrl}search-index.json${cacheBuster}`);
        if (!response.ok) {
            throw new Error('Failed to load search index');
        }

        searchIndexCache = await response.json();

        // Fuse 인스턴스 초기화
        fuseInstance = new Fuse(searchIndexCache!, {
            includeScore: true,
            threshold: 0.4,
            keys: [
                { name: 'title', weight: 1.0 },
                { name: 'tags', weight: 0.8 },
                { name: 'excerpt', weight: 0.5 },
                { name: 'content', weight: 0.3 }
            ]
        });

        return { items: searchIndexCache!, fuse: fuseInstance };
    } catch (error) {
        console.error('Error loading search index:', error);
        return { items: [], fuse: new Fuse([], {}) };
    }
}

// 필터 적용 함수
function applyFilters(items: SearchIndexItem[], filter: SearchFilter): SearchIndexItem[] {
    return items.filter(item => {
        // 태그 필터
        if (filter.tags && filter.tags.length > 0) {
            const hasMatchingTag = filter.tags.some(tag =>
                item.tags?.includes(tag)
            );
            if (!hasMatchingTag) return false;
        }

        // 날짜 범위 필터
        if (filter.dateFrom) {
            const itemDate = new Date(item.lastModified);
            const fromDate = new Date(filter.dateFrom);
            if (itemDate < fromDate) return false;
        }

        if (filter.dateTo) {
            const itemDate = new Date(item.lastModified);
            const toDate = new Date(filter.dateTo);
            toDate.setHours(23, 59, 59, 999); // 해당 날짜 끝까지 포함
            if (itemDate > toDate) return false;
        }

        // 저자 필터
        if (filter.author) {
            if (!item.author?.toLowerCase().includes(filter.author.toLowerCase())) {
                return false;
            }
        }

        return true;
    });
}

// 검색 기능 (Fuse.js 기반 + 필터)
export async function searchWiki(query: string, filter?: SearchFilter): Promise<WikiPage[]> {
    try {
        const { items, fuse } = await loadSearchIndex();

        let results: SearchIndexItem[];

        // 검색어가 있으면 Fuse.js로 검색
        if (query.trim()) {
            const searchResults = fuse.search(query);
            results = searchResults.map(({ item }) => item);
        } else {
            // 검색어 없으면 전체 아이템
            results = [...items];
        }

        // 필터 적용
        if (filter) {
            results = applyFilters(results, filter);
        }

        return results.map((item) => ({
            title: item.title,
            slug: item.slug,
            content: item.excerpt, // 검색 결과에는 요약본 표시
            lastModified: item.lastModified,
            author: item.author,
            tags: item.tags,
        }));
    } catch (error) {
        console.error('Error searching wiki:', error);
        return [];
    }
}

// 사용 가능한 모든 태그 목록 조회
export async function getAvailableTags(): Promise<string[]> {
    try {
        const { items } = await loadSearchIndex();
        const tagSet = new Set<string>();

        items.forEach(item => {
            item.tags?.forEach(tag => tagSet.add(tag));
        });

        return Array.from(tagSet).sort();
    } catch (error) {
        console.error('Error getting tags:', error);
        return [];
    }
}
