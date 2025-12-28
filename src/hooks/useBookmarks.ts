'use client';

/**
 * 북마크 관리 훅
 * localStorage 기반 즐겨찾기 저장 및 조회
 */

import { useState, useCallback } from 'react';

const STORAGE_KEY = 'wiki-bookmarks';

export interface Bookmark {
  slug: string;
  title: string;
  addedAt: string;
}

function getStoredBookmarks(): Bookmark[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

function setStoredBookmarks(bookmarks: Bookmark[]): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
  } catch {
    // localStorage 용량 초과 등 오류 무시
  }
}

export function useBookmarks() {
  // lazy initialization으로 초기 로드
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(getStoredBookmarks);

  /**
   * 북마크 추가
   */
  const addBookmark = useCallback((slug: string, title: string) => {
    setBookmarks((prev) => {
      // 이미 있으면 추가하지 않음
      if (prev.some((b) => b.slug === slug)) {
        return prev;
      }

      const newBookmark: Bookmark = {
        slug,
        title,
        addedAt: new Date().toISOString(),
      };

      const updated = [...prev, newBookmark];
      setStoredBookmarks(updated);
      return updated;
    });
  }, []);

  /**
   * 북마크 제거
   */
  const removeBookmark = useCallback((slug: string) => {
    setBookmarks((prev) => {
      const updated = prev.filter((b) => b.slug !== slug);
      setStoredBookmarks(updated);
      return updated;
    });
  }, []);

  /**
   * 북마크 토글
   */
  const toggleBookmark = useCallback((slug: string, title: string) => {
    setBookmarks((prev) => {
      const exists = prev.some((b) => b.slug === slug);
      let updated: Bookmark[];

      if (exists) {
        updated = prev.filter((b) => b.slug !== slug);
      } else {
        updated = [
          ...prev,
          { slug, title, addedAt: new Date().toISOString() },
        ];
      }

      setStoredBookmarks(updated);
      return updated;
    });
  }, []);

  /**
   * 북마크 여부 확인
   */
  const isBookmarked = useCallback(
    (slug: string) => bookmarks.some((b) => b.slug === slug),
    [bookmarks]
  );

  /**
   * 모든 북마크 삭제
   */
  const clearBookmarks = useCallback(() => {
    setBookmarks([]);
    setStoredBookmarks([]);
  }, []);

  return {
    bookmarks,
    addBookmark,
    removeBookmark,
    toggleBookmark,
    isBookmarked,
    clearBookmarks,
  };
}

export default useBookmarks;
