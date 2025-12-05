/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, type ReactNode } from 'react';

interface SidebarContextType {
  isOpen: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

// 모바일(1024px 미만)에서는 기본적으로 사이드바 닫힘
const getInitialSidebarState = () => {
  if (typeof window === 'undefined') return true;
  return window.innerWidth >= 1024;
};

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(getInitialSidebarState);

  const toggle = () => setIsOpen((prev) => !prev);
  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  return (
    <SidebarContext.Provider value={{ isOpen, toggle, open, close }}>
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
