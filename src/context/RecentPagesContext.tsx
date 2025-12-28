'use client';

/**
 * 최근 방문 문서 Context
 * 전역에서 최근 방문 기록 접근
 */

import {
  createContext,
  useContext,
  type ReactNode,
} from 'react';
import { useRecentPages, type RecentPage } from '@/src/hooks/useRecentPages';

interface RecentPagesContextType {
  recentPages: RecentPage[];
  addRecentPage: (slug: string, title: string) => void;
  removeRecentPage: (slug: string) => void;
  clearRecentPages: () => void;
}

const RecentPagesContext = createContext<RecentPagesContextType | undefined>(undefined);

interface RecentPagesProviderProps {
  children: ReactNode;
}

export function RecentPagesProvider({ children }: RecentPagesProviderProps) {
  const recentPagesHook = useRecentPages();

  return (
    <RecentPagesContext.Provider value={recentPagesHook}>
      {children}
    </RecentPagesContext.Provider>
  );
}

export function useRecentPagesContext() {
  const context = useContext(RecentPagesContext);
  if (context === undefined) {
    throw new Error('useRecentPagesContext must be used within a RecentPagesProvider');
  }
  return context;
}
