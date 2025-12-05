import { useQuery } from '@tanstack/react-query';
import { fetchWikiPages, fetchWikiPage, fetchIssues, searchWiki } from '../services/github';

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
