'use client';

/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

const SIDEBAR_WIDTH_KEY = 'sidebar-width';
const DEFAULT_SIDEBAR_WIDTH = 280;
const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH_PERCENT = 50;

interface SidebarContextType {
  isOpen: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
  width: number;
  setWidth: (width: number) => void;
  isResizing: boolean;
  setIsResizing: (isResizing: boolean) => void;
  minWidth: number;
  maxWidth: number;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

// 모바일(1024px 미만)에서는 기본적으로 사이드바 닫힘
const getInitialSidebarState = () => {
  if (typeof window === 'undefined') return true;
  return window.innerWidth >= 1024;
};

// LocalStorage에서 저장된 너비 불러오기
const getInitialWidth = () => {
  if (typeof window === 'undefined') return DEFAULT_SIDEBAR_WIDTH;
  const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
  if (saved) {
    const parsed = parseInt(saved, 10);
    if (!isNaN(parsed) && parsed >= MIN_SIDEBAR_WIDTH) {
      return parsed;
    }
  }
  return DEFAULT_SIDEBAR_WIDTH;
};

// 최대 너비 계산 (화면의 50%)
const getMaxWidth = () => {
  if (typeof window === 'undefined') return 500;
  return Math.floor(window.innerWidth * (MAX_SIDEBAR_WIDTH_PERCENT / 100));
};

// 클라이언트에서 초기값 가져오기 위한 lazy initializer
const getInitialWidthLazy = () => {
  if (typeof window === 'undefined') return DEFAULT_SIDEBAR_WIDTH;
  return getInitialWidth();
};

const getInitialMaxWidthLazy = () => {
  if (typeof window === 'undefined') return 500;
  return getMaxWidth();
};

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(getInitialSidebarState);
  const [width, setWidthState] = useState(getInitialWidthLazy);
  const [isResizing, setIsResizing] = useState(false);
  const [maxWidth, setMaxWidth] = useState(getInitialMaxWidthLazy);

  // 윈도우 리사이즈 시 최대 너비 업데이트
  useEffect(() => {
    const handleResize = () => {
      const newMaxWidth = getMaxWidth();
      setMaxWidth(newMaxWidth);
      // 현재 너비가 새 최대 너비를 초과하면 조정
      setWidthState((prev) => Math.min(prev, newMaxWidth));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const setWidth = useCallback((newWidth: number) => {
    const clampedWidth = Math.max(MIN_SIDEBAR_WIDTH, Math.min(newWidth, getMaxWidth()));
    setWidthState(clampedWidth);
    localStorage.setItem(SIDEBAR_WIDTH_KEY, String(clampedWidth));
  }, []);

  const toggle = () => setIsOpen((prev) => !prev);
  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  return (
    <SidebarContext.Provider
      value={{
        isOpen,
        toggle,
        open,
        close,
        width,
        setWidth,
        isResizing,
        setIsResizing,
        minWidth: MIN_SIDEBAR_WIDTH,
        maxWidth,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}
