import { useQuery } from '@tanstack/react-query';
import { fetchWikiPages, fetchWikiPage, fetchIssues, fetchGuidePages, fetchAIHistory, fetchDocumentAIHistory, fetchWikiTags, fetchActionsStatus, fetchDashboardStats, fetchAgentMetrics, fetchHealthStatus } from '../services/github';
import { searchWiki, getAvailableTags, type SearchFilter } from '../services/search';

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

// 필터 지원 검색 훅
export function useSearchWithFilter(query: string, filter?: SearchFilter) {
  const hasFilter = filter && (
    (filter.tags && filter.tags.length > 0) ||
    filter.dateFrom ||
    filter.dateTo ||
    filter.author
  );

  return useQuery({
    queryKey: ['search', query, filter],
    queryFn: () => searchWiki(query, filter),
    // 검색어가 있거나 필터가 있으면 활성화
    enabled: query.length >= 2 || !!hasFilter,
    staleTime: 1 * 60 * 1000,
  });
}

// 사용 가능한 태그 목록 훅
export function useAvailableTags() {
  return useQuery({
    queryKey: ['available-tags'],
    queryFn: getAvailableTags,
    staleTime: 5 * 60 * 1000,
  });
}

// 가이드 페이지 hook (guide-data.json에서 로드)
export function useGuidePages() {
  return useQuery({
    queryKey: ['guide-pages'],
    queryFn: fetchGuidePages,
    staleTime: 5 * 60 * 1000, // 5분
  });
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

// Dashboard Stats 조회
export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardStats,
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}

// Agent Metrics 조회
export function useAgentMetrics() {
  return useQuery({
    queryKey: ['agent-metrics'],
    queryFn: fetchAgentMetrics,
    staleTime: 5 * 60 * 1000,
  });
}

// Health Status 조회
export function useHealthStatus() {
  return useQuery({
    queryKey: ['health-status'],
    queryFn: fetchHealthStatus,
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}
