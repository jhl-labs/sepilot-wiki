import { useQuery } from '@tanstack/react-query';
import { fetchWikiPages, fetchWikiPage, fetchIssues, searchWiki, getGuidePages, fetchAIHistory, fetchDocumentAIHistory, fetchWikiTags, fetchActionsStatus } from '../services/github';

export function useWikiPages() {
  return useQuery({
    queryKey: ['wiki-pages'],
    queryFn: fetchWikiPages,
    staleTime: 5 * 60 * 1000, // 5분
  });
}

export function useWikiPage(slug: string) {
  return useQuery({
    queryKey: ['wiki-page', slug],
    queryFn: () => fetchWikiPage(slug),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });
}

export function useIssues(label?: string) {
  return useQuery({
    queryKey: ['issues', label],
    queryFn: () => fetchIssues(label),
    staleTime: 2 * 60 * 1000, // 2분
  });
}

export function useSearch(query: string) {
  return useQuery({
    queryKey: ['search', query],
    queryFn: () => searchWiki(query),
    enabled: query.length >= 2,
    staleTime: 1 * 60 * 1000, // 1분
  });
}

// 정적 가이드 페이지 hook
export function useGuidePages() {
  return {
    data: getGuidePages(),
    isLoading: false,
  };
}

// AI History 전체 조회
export function useAIHistory() {
  return useQuery({
    queryKey: ['ai-history'],
    queryFn: fetchAIHistory,
    staleTime: 5 * 60 * 1000,
  });
}

// 특정 문서의 AI History 조회
export function useDocumentAIHistory(slug: string) {
  return useQuery({
    queryKey: ['ai-history', 'document', slug],
    queryFn: () => fetchDocumentAIHistory(slug),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });
}

// Wiki 태그 통계 조회
export function useWikiTags() {
  return useQuery({
    queryKey: ['wiki-tags'],
    queryFn: fetchWikiTags,
    staleTime: 5 * 60 * 1000,
  });
}
// Actions Status 조회
export function useActionsStatus() {
  return useQuery({
    queryKey: ['actions-status'],
    queryFn: fetchActionsStatus,
    staleTime: 30 * 1000, // 30초 (갱신 주기 짧게)
    refetchInterval: 30 * 1000, // 30초마다 자동 갱신
  });
}
