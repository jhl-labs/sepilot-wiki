'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import {
  Menu,
  Search,
  Moon,
  Sun,
  Monitor,
  Github,
  BookOpen,
  X,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useSidebar } from '../../context/SidebarContext';
import { useSiteConfig } from '../../context/ConfigContext';
import { urls } from '../../config';
import { Input } from '../ui/Input';
import { DynamicIcon } from '../../utils/icons';

export function Header() {
  const { theme, setTheme } = useTheme();
  const { toggle } = useSidebar();
  const siteConfig = useSiteConfig();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target as Node)) {
        setShowThemeMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setShowSearch(false);
      setSearchQuery('');
    }
  };

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  // 로고 렌더링
  const renderLogo = () => {
    const logo = siteConfig.logo;

    if (!logo) {
      // 기본 로고 (아이콘 + 텍스트)
      return (
        <>
          <BookOpen size={24} className="logo-icon" />
          <span className="logo-text">{siteConfig.title}</span>
        </>
      );
    }

    switch (logo.type) {
      case 'image':
        return (
          <>
            <img
              src={logo.value}
              alt={logo.alt || siteConfig.title}
              className="logo-image"
            />
            <span className="logo-text">{siteConfig.title}</span>
          </>
        );
      case 'icon':
        return (
          <>
            <DynamicIcon name={logo.value} size={24} className="logo-icon" />
            <span className="logo-text">{siteConfig.title}</span>
          </>
        );
      case 'text':
      default:
        return <span className="logo-text logo-text-only">{logo.value}</span>;
    }
  };

  // GitHub URL 결정
  const githubUrl = siteConfig.social?.github || urls.repo();

  return (
    <header className="header" role="banner">
      <div className="header-left">
        <button
          className="header-btn sidebar-toggle"
          onClick={toggle}
          aria-label="사이드바 열기/닫기"
          aria-expanded="false"
        >
          <Menu size={20} aria-hidden="true" />
        </button>
        <Link href="/" className="header-logo" aria-label={`${siteConfig.title} 홈으로 이동`}>
          {renderLogo()}
        </Link>
      </div>

      <div className="header-center">
        <form onSubmit={handleSearch} className="search-form desktop-search" role="search" aria-label="문서 검색">
          <Input
            type="search"
            placeholder="문서 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search size={18} aria-hidden="true" />}
            className="search-input"
            aria-label="검색어 입력"
          />
        </form>
      </div>

      <div className="header-right">
        <button
          className="header-btn mobile-search-btn"
          onClick={() => setShowSearch(!showSearch)}
          aria-label="검색 열기"
          aria-expanded={showSearch}
        >
          <Search size={20} aria-hidden="true" />
        </button>

        <div className="theme-menu-wrapper" ref={themeMenuRef}>
          <button
            className="header-btn theme-btn"
            onClick={() => setShowThemeMenu(!showThemeMenu)}
            aria-label="테마 변경 메뉴"
            aria-expanded={showThemeMenu}
            aria-haspopup="menu"
          >
            <ThemeIcon size={20} aria-hidden="true" />
          </button>
          {showThemeMenu && (
            <div className="theme-menu" role="menu" aria-label="테마 선택">
              <button
                className={`theme-option ${theme === 'light' ? 'active' : ''}`}
                onClick={() => { setTheme('light'); setShowThemeMenu(false); }}
                role="menuitem"
                aria-pressed={theme === 'light'}
              >
                <Sun size={16} aria-hidden="true" />
                <span>라이트</span>
              </button>
              <button
                className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => { setTheme('dark'); setShowThemeMenu(false); }}
                role="menuitem"
                aria-pressed={theme === 'dark'}
              >
                <Moon size={16} aria-hidden="true" />
                <span>다크</span>
              </button>
              <button
                className={`theme-option ${theme === 'system' ? 'active' : ''}`}
                onClick={() => { setTheme('system'); setShowThemeMenu(false); }}
                role="menuitem"
                aria-pressed={theme === 'system'}
              >
                <Monitor size={16} aria-hidden="true" />
                <span>시스템</span>
              </button>
            </div>
          )}
        </div>

        <a
          href={githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="header-btn github-link"
          aria-label="GitHub 저장소 (새 창에서 열림)"
        >
          <Github size={20} aria-hidden="true" />
        </a>
      </div>

      {showSearch && (
        <div className="mobile-search-overlay" role="dialog" aria-label="검색">
          <form onSubmit={handleSearch} className="mobile-search-form" role="search">
            <Input
              ref={searchInputRef}
              type="search"
              placeholder="문서 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search size={18} aria-hidden="true" />}
              className="search-input"
              aria-label="검색어 입력"
            />
            <button
              type="button"
              className="close-search-btn"
              onClick={() => setShowSearch(false)}
              aria-label="검색 닫기"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </form>
        </div>
      )}
    </header>
  );
}
