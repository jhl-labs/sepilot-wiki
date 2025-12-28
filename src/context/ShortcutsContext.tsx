'use client';

/**
 * 키보드 단축키 Context
 * 전역 단축키 관리 및 커맨드 팔레트 상태
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { useKeyboardShortcuts, type Shortcut } from '@/src/hooks/useKeyboardShortcuts';
import { useSidebar } from '@/src/context/SidebarContext';
import { useRouter } from 'next/navigation';

interface ShortcutsContextType {
  // 커맨드 팔레트 열림 상태
  isCommandPaletteOpen: boolean;
  // 커맨드 팔레트 열기
  openCommandPalette: () => void;
  // 커맨드 팔레트 닫기
  closeCommandPalette: () => void;
  // 커맨드 팔레트 토글
  toggleCommandPalette: () => void;
  // 등록된 단축키 목록
  shortcuts: Shortcut[];
}

const ShortcutsContext = createContext<ShortcutsContextType | undefined>(undefined);

interface ShortcutsProviderProps {
  children: ReactNode;
}

export function ShortcutsProvider({ children }: ShortcutsProviderProps) {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const { toggle: toggleSidebar } = useSidebar();
  const router = useRouter();

  // 커맨드 팔레트 제어
  const openCommandPalette = useCallback(() => {
    setIsCommandPaletteOpen(true);
  }, []);

  const closeCommandPalette = useCallback(() => {
    setIsCommandPaletteOpen(false);
  }, []);

  const toggleCommandPalette = useCallback(() => {
    setIsCommandPaletteOpen((prev) => !prev);
  }, []);

  // 기본 단축키 정의
  const shortcuts: Shortcut[] = [
    {
      key: 'mod+k',
      handler: () => toggleCommandPalette(),
      description: '검색 / 커맨드 팔레트 열기',
    },
    {
      key: 'mod+/',
      handler: () => toggleSidebar(),
      description: '사이드바 토글',
    },
    {
      key: 'escape',
      handler: () => {
        if (isCommandPaletteOpen) {
          closeCommandPalette();
        }
      },
      enableInInput: true,
      description: '닫기',
    },
    {
      key: 'mod+shift+e',
      handler: () => {
        // 현재 위키 페이지 편집
        const path = window.location.pathname;
        if (path.startsWith('/wiki/')) {
          const slug = path.replace('/wiki/', '');
          router.push(`/edit/${slug}`);
        }
      },
      description: '현재 문서 편집',
    },
    {
      key: 'g',
      handler: () => router.push('/'),
      description: '홈으로 이동',
    },
    {
      key: 'mod+shift+?',
      handler: () => {
        // 단축키 도움말 (TODO: 구현)
        console.log('단축키 도움말');
      },
      description: '단축키 도움말',
    },
  ];

  // 단축키 활성화
  useKeyboardShortcuts({
    enabled: true,
    shortcuts,
  });

  const value: ShortcutsContextType = {
    isCommandPaletteOpen,
    openCommandPalette,
    closeCommandPalette,
    toggleCommandPalette,
    shortcuts,
  };

  return (
    <ShortcutsContext.Provider value={value}>
      {children}
    </ShortcutsContext.Provider>
  );
}

export function useShortcuts() {
  const context = useContext(ShortcutsContext);
  if (context === undefined) {
    throw new Error('useShortcuts must be used within a ShortcutsProvider');
  }
  return context;
}
