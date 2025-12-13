'use client';

/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Theme } from '../types';

interface ThemeContextType {
  theme: Theme;
  actualTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// localStorage에서 초기 테마 값 가져오기 (SSR 호환)
function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'system';
  const stored = localStorage.getItem('theme');
  return (stored as Theme) || 'system';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);
  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('light');

  // 테마 설정 함수 (localStorage에도 저장)
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', newTheme);
    }
  };

  useEffect(() => {
    const updateActualTheme = () => {
      if (theme === 'system') {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setActualTheme(isDark ? 'dark' : 'light');
      } else {
        setActualTheme(theme);
      }
    };

    updateActualTheme();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', updateActualTheme);

    return () => mediaQuery.removeEventListener('change', updateActualTheme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', actualTheme);
    // 테마 설정값도 속성으로 추가 (Header 아이콘 표시용)
    document.documentElement.setAttribute('data-theme-setting', theme);
  }, [actualTheme, theme]);

  return (
    <ThemeContext.Provider value={{ theme, actualTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
