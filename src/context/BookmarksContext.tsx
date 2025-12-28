'use client';

/**
 * 북마크 Context
 * 전역에서 북마크 접근
 */

import {
  createContext,
  useContext,
  type ReactNode,
} from 'react';
import { useBookmarks, type Bookmark } from '@/src/hooks/useBookmarks';

interface BookmarksContextType {
  bookmarks: Bookmark[];
  addBookmark: (slug: string, title: string) => void;
  removeBookmark: (slug: string) => void;
  toggleBookmark: (slug: string, title: string) => void;
  isBookmarked: (slug: string) => boolean;
  clearBookmarks: () => void;
}

const BookmarksContext = createContext<BookmarksContextType | undefined>(undefined);

interface BookmarksProviderProps {
  children: ReactNode;
}

export function BookmarksProvider({ children }: BookmarksProviderProps) {
  const bookmarksHook = useBookmarks();

  return (
    <BookmarksContext.Provider value={bookmarksHook}>
      {children}
    </BookmarksContext.Provider>
  );
}

export function useBookmarksContext() {
  const context = useContext(BookmarksContext);
  if (context === undefined) {
    throw new Error('useBookmarksContext must be used within a BookmarksProvider');
  }
  return context;
}
