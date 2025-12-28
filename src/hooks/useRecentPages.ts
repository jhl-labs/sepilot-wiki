'use client';

/**
 * 최근 방문 문서 관리 훅
 * localStorage 기반 방문 기록 저장 및 조회
 */

import { useState, useCallback } from 'react';

const STORAGE_KEY = 'wiki-recent-pages';
const MAX_RECENT_PAGES = 10;

export interface RecentPage {
  slug: string;
  title: string;
  visitedAt: string;
}

function getStoredRecentPages(): RecentPage[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

function setStoredRecentPages(pages: RecentPage[]): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pages));
  } catch {
    // localStorage 용량 초과 등 오류 무시
  }
}

export function useRecentPages() {
  // lazy initialization으로 초기 로드
  const [recentPages, setRecentPages] = useState<RecentPage[]>(getStoredRecentPages);

  /**
   * 방문 기록 추가
   */
  const addRecentPage = useCallback((slug: string, title: string) => {
    setRecentPages((prev) => {
      // 동일한 페이지가 있으면 제거
      const filtered = prev.filter((page) => page.slug !== slug);

      // 새 항목을 앞에 추가
      const newPage: RecentPage = {
        slug,
        title,
        visitedAt: new Date().toISOString(),
      };

      // 최대 개수 유지
      const updated = [newPage, ...filtered].slice(0, MAX_RECENT_PAGES);

      // localStorage에 저장
      setStoredRecentPages(updated);

      return updated;
    });
  }, []);

  /**
   * 특정 페이지 제거
   */
  const removeRecentPage = useCallback((slug: string) => {
    setRecentPages((prev) => {
      const updated = prev.filter((page) => page.slug !== slug);
      setStoredRecentPages(updated);
      return updated;
    });
  }, []);

  /**
   * 모든 기록 삭제
   */
  const clearRecentPages = useCallback(() => {
    setRecentPages([]);
    setStoredRecentPages([]);
  }, []);

  return {
    recentPages,
    addRecentPage,
    removeRecentPage,
    clearRecentPages,
  };
}

export default useRecentPages;
