import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useWikiPages, useWikiPage, useIssues, useSearch, useGuidePages, useAIHistory, useWikiTags } from './useWiki';
import * as githubService from '../services/github';
import * as searchService from '../services/search';
import type { WikiPage, GitHubIssue, AIHistory, TagStats, WikiTree } from '../types';

// Mock the github service
vi.mock('../services/github', () => ({
  fetchWikiPages: vi.fn(),
  fetchWikiPage: vi.fn(),
  fetchIssues: vi.fn(),
  fetchGuidePages: vi.fn(),
  fetchAIHistory: vi.fn(),
  fetchDocumentAIHistory: vi.fn(),
  fetchWikiTags: vi.fn(),
  fetchActionsStatus: vi.fn(),
}));

// Mock the search service
vi.mock('../services/search', () => ({
  searchWiki: vi.fn(),
  getAvailableTags: vi.fn(),
}));

// 테스트용 mock 데이터 생성 헬퍼
function createMockWikiPage(overrides: Partial<WikiPage> = {}): WikiPage {
  return {
    slug: 'test-page',
    title: '테스트 페이지',
    content: '# 테스트\n\n본문입니다.',
    lastModified: '2025-12-06T00:00:00Z',
    ...overrides,
  };
}

function createMockGitHubIssue(overrides: Partial<GitHubIssue> = {}): GitHubIssue {
  return {
    id: 1,
    number: 1,
    title: '테스트 이슈',
    body: '이슈 본문',
    state: 'open',
    labels: [],
    user: {
      login: 'test-user',
      avatar_url: 'https://example.com/avatar.png',
      html_url: 'https://github.com/test-user',
    },
    created_at: '2025-12-06T00:00:00Z',
    updated_at: '2025-12-06T00:00:00Z',
    comments: 0,
    html_url: 'https://github.com/test/repo/issues/1',
    ...overrides,
  };
}

// 테스트용 QueryClient wrapper
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useWikiPages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('위키 페이지 목록을 가져온다', async () => {
    const mockPages = [
      { slug: 'page1', title: '페이지 1', path: 'page1.md' },
      { slug: 'page2', title: '페이지 2', path: 'page2.md' },
    ];
    vi.mocked(githubService.fetchWikiPages).mockResolvedValue(mockPages);

    const { result } = renderHook(() => useWikiPages(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockPages);
    expect(githubService.fetchWikiPages).toHaveBeenCalledTimes(1);
  });

  it('에러 발생 시 에러 상태를 반환한다', async () => {
    vi.mocked(githubService.fetchWikiPages).mockRejectedValue(new Error('API 오류'));

    const { result } = renderHook(() => useWikiPages(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });
});

describe('useWikiPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('특정 위키 페이지를 가져온다', async () => {
    const mockPage = createMockWikiPage({
      slug: 'getting-started',
      title: '시작하기',
      content: '# 시작하기\n\n본문입니다.',
    });
    vi.mocked(githubService.fetchWikiPage).mockResolvedValue(mockPage);

    const { result } = renderHook(() => useWikiPage('getting-started'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockPage);
    expect(githubService.fetchWikiPage).toHaveBeenCalledWith('getting-started');
  });

  it('slug가 빈 문자열이면 쿼리를 실행하지 않는다', () => {
    const { result } = renderHook(() => useWikiPage(''), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(githubService.fetchWikiPage).not.toHaveBeenCalled();
  });
});

describe('useIssues', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('이슈 목록을 가져온다', async () => {
    const mockIssues: GitHubIssue[] = [
      createMockGitHubIssue({ id: 1, number: 1, title: '이슈 1', state: 'open' }),
      createMockGitHubIssue({ id: 2, number: 2, title: '이슈 2', state: 'closed' }),
    ];
    vi.mocked(githubService.fetchIssues).mockResolvedValue(mockIssues);

    const { result } = renderHook(() => useIssues(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockIssues);
    expect(githubService.fetchIssues).toHaveBeenCalledWith(undefined);
  });

  it('라벨로 필터링하여 이슈를 가져온다', async () => {
    const mockIssues: GitHubIssue[] = [
      createMockGitHubIssue({ number: 1, title: '요청 이슈', state: 'open' }),
    ];
    vi.mocked(githubService.fetchIssues).mockResolvedValue(mockIssues);

    const { result } = renderHook(() => useIssues('request'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(githubService.fetchIssues).toHaveBeenCalledWith('request');
  });
});

describe('useSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('검색 쿼리가 2자 이상일 때 검색을 수행한다', async () => {
    const mockResults: WikiPage[] = [
      createMockWikiPage({ slug: 'page1', title: '검색 결과', content: '...' }),
    ];
    vi.mocked(searchService.searchWiki).mockResolvedValue(mockResults);

    const { result } = renderHook(() => useSearch('테스트'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockResults);
    expect(searchService.searchWiki).toHaveBeenCalledWith('테스트');
  });

  it('검색 쿼리가 2자 미만이면 검색을 수행하지 않는다', () => {
    const { result } = renderHook(() => useSearch('테'), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(searchService.searchWiki).not.toHaveBeenCalled();
  });

  it('빈 쿼리는 검색을 수행하지 않는다', () => {
    const { result } = renderHook(() => useSearch(''), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(searchService.searchWiki).not.toHaveBeenCalled();
  });
});

describe('useGuidePages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('가이드 페이지 목록을 가져온다', async () => {
    const mockGuides: WikiTree[] = [
      { slug: 'getting-started', title: '시작하기' },
      { slug: 'configuration', title: '설정' },
    ];
    vi.mocked(githubService.fetchGuidePages).mockResolvedValue(mockGuides);

    const { result } = renderHook(() => useGuidePages(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockGuides);
  });
});

describe('useAIHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AI 히스토리를 가져온다', async () => {
    const mockHistory: AIHistory = {
      entries: [
        {
          id: '1',
          actionType: 'generate',
          documentSlug: 'new-doc',
          documentTitle: '새 문서',
          issueNumber: 1,
          issueTitle: '문서 요청',
          summary: '새 문서 생성',
          trigger: 'request_label',
          timestamp: '2025-12-06T00:00:00Z',
        },
      ],
      lastUpdated: '2025-12-06T00:00:00Z',
    };
    vi.mocked(githubService.fetchAIHistory).mockResolvedValue(mockHistory);

    const { result } = renderHook(() => useAIHistory(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockHistory);
  });
});

describe('useWikiTags', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('태그 통계를 가져온다', async () => {
    const mockTags: TagStats[] = [
      { tag: 'react', count: 5, pages: [{ title: 'React 가이드', slug: 'react-guide' }] },
      { tag: 'typescript', count: 3, pages: [{ title: 'TS 시작하기', slug: 'ts-start' }] },
    ];
    vi.mocked(githubService.fetchWikiTags).mockResolvedValue(mockTags);

    const { result } = renderHook(() => useWikiTags(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockTags);
  });
});
