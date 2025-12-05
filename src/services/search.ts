import Fuse from 'fuse.js';
import type { WikiPage } from '../types';

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
        const response = await fetch(`${import.meta.env.BASE_URL}search-index.json${cacheBuster}`);
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

// 검색 기능 (Fuse.js 기반)
export async function searchWiki(query: string): Promise<WikiPage[]> {
    try {
        const { fuse } = await loadSearchIndex();
        const results = fuse.search(query);

        return results.map(({ item }) => ({
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
