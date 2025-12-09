'use client';

import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { siteConfig } from '../../site.config';
import { themeConfig } from '../../theme.config';
import { navigationConfig } from '../../navigation.config';
import type {
  SiteConfig,
  ThemeConfig,
  NavigationConfig,
  ColorScheme,
} from '../types';
import { useTheme } from './ThemeContext';

interface ConfigContextType {
  site: SiteConfig;
  theme: ThemeConfig;
  navigation: NavigationConfig;
}

const ConfigContext = createContext<ConfigContextType | null>(null);

// 색상 스키마를 CSS 변수로 변환
function applyColorScheme(scheme: ColorScheme, isDark: boolean) {
  const root = document.documentElement;
  const prefix = isDark ? '' : '';

  // 색상 매핑
  const colorMap: Record<string, string> = {
    '--color-primary': scheme.primary,
    '--color-primary-hover': scheme.primaryHover || scheme.primary,
    '--color-bg-primary': scheme.background,
    '--color-bg-secondary': scheme.backgroundSecondary || scheme.background,
    '--color-bg-tertiary': scheme.backgroundTertiary || scheme.background,
    '--color-text-primary': scheme.text,
    '--color-text-secondary': scheme.textSecondary || scheme.text,
    '--color-text-muted': scheme.textMuted || scheme.text,
    '--color-border': scheme.border || scheme.text,
    '--color-accent': scheme.accent || scheme.primary,
    '--color-success': scheme.success || '#10b981',
    '--color-warning': scheme.warning || '#f59e0b',
    '--color-error': scheme.error || '#ef4444',
    '--color-info': scheme.info || '#3b82f6',
  };

  Object.entries(colorMap).forEach(([key, value]) => {
    if (value) {
      root.style.setProperty(prefix + key, value);
    }
  });
}

// 폰트 설정을 CSS 변수로 적용
function applyFonts(fonts: ThemeConfig['fonts']) {
  if (!fonts) return;

  const root = document.documentElement;

  if (fonts.sans) {
    root.style.setProperty('--font-sans', fonts.sans);
  }
  if (fonts.mono) {
    root.style.setProperty('--font-mono', fonts.mono);
  }
  if (fonts.heading) {
    root.style.setProperty('--font-heading', fonts.heading);
  }
}

// 레이아웃 설정을 CSS 변수로 적용
function applyLayout(layout: ThemeConfig['layout']) {
  if (!layout) return;

  const root = document.documentElement;

  if (layout.headerHeight) {
    root.style.setProperty('--header-height', layout.headerHeight);
  }
  if (layout.sidebarWidth) {
    root.style.setProperty('--sidebar-width', layout.sidebarWidth);
  }
  if (layout.contentMaxWidth) {
    root.style.setProperty('--content-max-width', layout.contentMaxWidth);
  }
  if (layout.tocWidth) {
    root.style.setProperty('--toc-width', layout.tocWidth);
  }
}

// 테두리 반경 설정을 CSS 변수로 적용
function applyBorderRadius(borderRadius: ThemeConfig['borderRadius']) {
  if (!borderRadius) return;

  const root = document.documentElement;

  if (borderRadius.sm) {
    root.style.setProperty('--radius-sm', borderRadius.sm);
  }
  if (borderRadius.md) {
    root.style.setProperty('--radius-md', borderRadius.md);
  }
  if (borderRadius.lg) {
    root.style.setProperty('--radius-lg', borderRadius.lg);
  }
  if (borderRadius.xl) {
    root.style.setProperty('--radius-xl', borderRadius.xl);
  }
}

// 파비콘 설정
function applyFavicon(favicon?: string) {
  if (!favicon) return;

  let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = favicon;
}

// 문서 제목 설정
function applyTitle(title: string) {
  document.title = title;
}

interface ConfigProviderProps {
  children: ReactNode;
}

export function ConfigProvider({ children }: ConfigProviderProps) {
  const { actualTheme } = useTheme();

  const config = useMemo<ConfigContextType>(
    () => ({
      site: siteConfig,
      theme: themeConfig,
      navigation: navigationConfig,
    }),
    []
  );

  // 테마 색상 적용
  useEffect(() => {
    const colorScheme =
      actualTheme === 'dark' ? themeConfig.colors.dark : themeConfig.colors.light;
    applyColorScheme(colorScheme, actualTheme === 'dark');
  }, [actualTheme]);

  // 폰트, 레이아웃, 테두리 반경 적용 (최초 1회)
  useEffect(() => {
    applyFonts(themeConfig.fonts);
    applyLayout(themeConfig.layout);
    applyBorderRadius(themeConfig.borderRadius);
  }, []);

  // 사이트 설정 적용 (파비콘, 제목)
  useEffect(() => {
    applyFavicon(siteConfig.favicon);
    applyTitle(siteConfig.title);
  }, []);

  return (
    <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useConfig() {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSiteConfig() {
  return useConfig().site;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useThemeConfig() {
  return useConfig().theme;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNavigationConfig() {
  return useConfig().navigation;
}
