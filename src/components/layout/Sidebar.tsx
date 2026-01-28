'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Home,
  FileText,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  MessageSquare,
  Tags,
  X,
  BookOpen,
  ExternalLink,
  GripVertical,
} from 'lucide-react';
import { useWikiPages, useIssues } from '../../hooks/useWiki';
import { useSidebar } from '../../context/SidebarContext';
import { useNavigationConfig } from '../../context/ConfigContext';
import { Skeleton } from '../ui/Skeleton';
import { LABELS, urls } from '../../config';
import { DynamicIcon } from '../../utils/icons';
import clsx from 'clsx';
import type { SidebarSection, SidebarNavItem, WikiTree } from '../../types';

// localStorage 키 상수
const EXPANDED_FOLDERS_KEY = 'sepilot-wiki-expanded-folders';

// localStorage에서 확장된 폴더 목록 가져오기
const getInitialExpandedFolders = (): Set<string> => {
  if (typeof window === 'undefined') return new Set();
  try {
    const saved = localStorage.getItem(EXPANDED_FOLDERS_KEY);
    if (saved) {
      return new Set(JSON.parse(saved));
    }
  } catch {
    // localStorage 접근 실패 시 빈 Set 반환
  }
  return new Set();
};

export function Sidebar() {
  const { isOpen, close, width, setWidth, isResizing, setIsResizing, minWidth, maxWidth } =
    useSidebar();
  const pathname = usePathname();
  const navigationConfig = useNavigationConfig();
  const sidebarRef = useRef<HTMLElement>(null);
  const { data: wikiPages, isLoading: pagesLoading, error: pagesError } = useWikiPages();
  const { data: requestIssues } = useIssues(LABELS.REQUEST);

  // 클라이언트 마운트 상태 (Hydration 에러 방지)
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 확장된 폴더 상태 (localStorage에 저장)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(getInitialExpandedFolders);

  // expandedFolders 변경 시 localStorage에 저장
  useEffect(() => {
    if (!isMounted) return;
    try {
      localStorage.setItem(EXPANDED_FOLDERS_KEY, JSON.stringify([...expandedFolders]));
    } catch {
      // localStorage 저장 실패 시 무시
    }
  }, [expandedFolders, isMounted]);

  // 폴더 토글 함수
  const toggleFolder = (folderPath: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderPath)) {
        next.delete(folderPath);
      } else {
        next.add(folderPath);
      }
      return next;
    });
  };

  // 기본 열린 섹션과 커스텀 섹션의 defaultOpen 상태를 합침
  const getInitialExpandedSections = () => {
    const sections = new Set(['wiki']);
    navigationConfig.sidebar?.forEach((section, index) => {
      if (section.defaultOpen !== false) {
        sections.add(`custom-${index}`);
      }
    });
    return sections;
  };

  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    getInitialExpandedSections
  );

  // 커스텀 섹션 설정이 변경되면 상태 업데이트
  const sidebarJson = JSON.stringify(navigationConfig.sidebar);
  useEffect(() => {
    const sections = new Set(['wiki']);
    navigationConfig.sidebar?.forEach((section, index) => {
      if (section.defaultOpen !== false) {
        sections.add(`custom-${index}`);
      }
    });
    setExpandedSections(sections);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sidebarJson]);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const openIssuesCount = requestIssues?.filter((i) => i.state === 'open').length || 0;

  // wiki/home.md 페이지 존재 여부 확인 (재귀적으로 트리 탐색)
  const findHomeInTree = (pages: WikiTree[]): boolean => {
    for (const page of pages) {
      if (page.slug === 'home') return true;
      if (page.children && findHomeInTree(page.children)) return true;
    }
    return false;
  };
  const hasWikiHome = wikiPages ? findHomeInTree(wikiPages) : false;

  const handleLinkClick = () => {
    if (window.innerWidth < 1024) {
      close();
    }
  };

  // 리사이즈 핸들 드래그 시작
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
    },
    [setIsResizing]
  );

  // 리사이즈 드래그 중 (throttle 적용 - 60fps)
  useEffect(() => {
    if (!isResizing) return;

    let lastUpdateTime = 0;
    let rafId: number | null = null;

    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      // 약 60fps (16ms 간격)로 업데이트 제한
      if (now - lastUpdateTime < 16) return;
      lastUpdateTime = now;

      // requestAnimationFrame으로 부드러운 업데이트
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const newWidth = e.clientX;
        if (newWidth >= minWidth && newWidth <= maxWidth) {
          setWidth(newWidth);
        }
      });
    };

    const handleMouseUp = () => {
      if (rafId) cancelAnimationFrame(rafId);
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, setWidth, setIsResizing, minWidth, maxWidth]);

  // 커스텀 네비게이션 아이템 렌더링
  const renderNavItem = (item: SidebarNavItem, depth = 0) => {
    const isExternal = item.external || item.href.startsWith('http');
    const paddingLeft = depth > 0 ? `${1 + depth * 0.75}rem` : undefined;

    if (isExternal) {
      return (
        <a
          key={item.href}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          className="nav-item nav-item-child nav-item-external"
          style={{ paddingLeft }}
        >
          {item.icon && <DynamicIcon name={item.icon} size={14} />}
          <span>{item.label}</span>
          <ExternalLink size={12} className="external-icon" />
          {item.badge && <span className="nav-badge-text">{item.badge}</span>}
        </a>
      );
    }

    const isActive = pathname === item.href;
    return (
      <Link
        key={item.href}
        href={item.href}
        className={clsx('nav-item nav-item-child', isActive && 'active')}
        style={{ paddingLeft }}
        onClick={handleLinkClick}
      >
        {item.icon && <DynamicIcon name={item.icon} size={14} />}
        <span>{item.label}</span>
        {item.badge && <span className="nav-badge-text">{item.badge}</span>}
      </Link>
    );
  };

  // Wiki 트리 아이템 렌더링 (최대 depth 2까지)
  const renderWikiTreeItem = (item: WikiTree, depth = 1): React.ReactNode => {
    const hasChildren = item.children && item.children.length > 0;
    const paddingLeft = depth > 1 ? `${1 + (depth - 1) * 0.75}rem` : undefined;

    // 카테고리(폴더)인 경우 - 토글 버튼 + 클릭 시 카테고리 페이지로 이동
    if (item.isCategory) {
      const categoryName = item.name || item.path || '';
      const categoryPath = item.path || '';
      const isActive = pathname === `/wiki/category/${categoryPath}`;
      const isExpanded = expandedFolders.has(categoryPath);

      return (
        <div key={item.path}>
          <div className="nav-folder-row" style={{ paddingLeft }}>
            {hasChildren && (
              <button
                className="nav-folder-toggle"
                onClick={() => toggleFolder(categoryPath)}
                aria-label={isExpanded ? '폴더 접기' : '폴더 펼치기'}
                aria-expanded={isExpanded}
              >
                {isExpanded ? (
                  <ChevronDown size={14} />
                ) : (
                  <ChevronRight size={14} />
                )}
              </button>
            )}
            <Link
              href={`/wiki/category/${categoryPath}`}
              className={clsx('nav-folder-link', isActive && 'active')}
              onClick={handleLinkClick}
            >
              <span>{categoryName}</span>
            </Link>
          </div>
          {/* depth 2까지만 children 렌더링, 폴더가 확장된 경우에만 */}
          {hasChildren && isExpanded && depth < 2 && (
            <>
              {item.children!.map((child) => renderWikiTreeItem(child, depth + 1))}
            </>
          )}
        </div>
      );
    }

    // 페이지인 경우 - menu 필드가 있으면 menu 사용, 없으면 title 사용
    const displayName = item.menu || item.title || item.slug;
    const isActive = pathname === `/wiki/${item.slug}`;

    return (
      <div key={item.slug}>
        <Link
          href={`/wiki/${item.slug}`}
          className={clsx('nav-item nav-item-child', isActive && 'active')}
          style={{ paddingLeft }}
          onClick={handleLinkClick}
        >
          <span>{displayName}</span>
        </Link>
        {/* depth 2까지만 children 렌더링 */}
        {hasChildren && depth < 2 && (
          <>
            {item.children!.map((child) => renderWikiTreeItem(child, depth + 1))}
          </>
        )}
      </div>
    );
  };

  // 커스텀 섹션 렌더링
  const renderCustomSection = (section: SidebarSection, index: number) => {
    const sectionKey = `custom-${index}`;
    const isCollapsible = section.collapsible !== false;
    const isExpanded = expandedSections.has(sectionKey);

    return (
      <div key={sectionKey} className="nav-section">
        {isCollapsible ? (
          <button
            className="nav-section-header"
            onClick={() => toggleSection(sectionKey)}
          >
            {section.icon && <DynamicIcon name={section.icon} size={18} />}
            <span>{section.title}</span>
            {isExpanded ? (
              <ChevronDown size={16} className="chevron" />
            ) : (
              <ChevronRight size={16} className="chevron" />
            )}
          </button>
        ) : (
          <div className="nav-section-header nav-section-header-static">
            {section.icon && <DynamicIcon name={section.icon} size={18} />}
            <span>{section.title}</span>
          </div>
        )}
        {(!isCollapsible || isExpanded) && (
          <div className="nav-section-content">
            {section.items.map((item) => (
              <div key={item.href}>
                {renderNavItem(item)}
                {item.children?.map((child) => renderNavItem(child, 1))}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div
        className={clsx('sidebar-overlay', isOpen && 'visible', isResizing && 'resizing')}
        onClick={close}
        aria-hidden="true"
      />
      <aside
        ref={sidebarRef}
        className={clsx('sidebar', isOpen && 'open', isResizing && 'resizing')}
        role="complementary"
        aria-label="사이드바 네비게이션"
        style={{ '--sidebar-dynamic-width': `${width}px` } as React.CSSProperties}
      >
        <div className="sidebar-header">
          <span className="sidebar-title" id="sidebar-title">탐색</span>
          <button
            className="sidebar-close"
            onClick={close}
            aria-label="사이드바 닫기"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <nav className="sidebar-nav" aria-labelledby="sidebar-title">
          {/* 홈 링크 - wiki/home.md가 있으면 해당 페이지로, 없으면 기본 홈으로 */}
          <Link
            href={hasWikiHome ? '/wiki/home' : '/'}
            className={clsx('nav-item nav-item-home', (pathname === '/' || pathname === '/wiki/home') && 'active')}
            onClick={handleLinkClick}
          >
            <Home size={18} />
            <span>홈</span>
          </Link>

          {/* 커스텀 섹션 (navigation.config.ts에서 정의) */}
          {navigationConfig.sidebar?.map((section, index) =>
            renderCustomSection(section, index)
          )}

          {/* Wiki 섹션 - 실제 GitHub Wiki 페이지 */}
          <div className="nav-section">
            <button
              className="nav-section-header"
              onClick={() => toggleSection('wiki')}
            >
              <FileText size={18} />
              <span>문서</span>
              {expandedSections.has('wiki') ? (
                <ChevronDown size={16} className="chevron" />
              ) : (
                <ChevronRight size={16} className="chevron" />
              )}
            </button>
            {expandedSections.has('wiki') && (
              <div className="nav-section-content">
                {pagesError ? (
                  <span className="nav-error">
                    <AlertCircle size={14} />
                    문서를 불러올 수 없습니다
                  </span>
                ) : !isMounted || pagesLoading ? (
                  <>
                    <Skeleton className="nav-skeleton" />
                    <Skeleton className="nav-skeleton" />
                    <Skeleton className="nav-skeleton" />
                  </>
                ) : wikiPages && wikiPages.length > 0 ? (
                  wikiPages.map((page) => renderWikiTreeItem(page, 1))
                ) : (
                  <span className="nav-empty">
                    아직 작성된 문서가 없습니다
                  </span>
                )}
              </div>
            )}
          </div>

          {/* 전체 태그 링크 */}
          <Link
            href="/tags"
            className={clsx('nav-item nav-item-home', pathname === '/tags' && 'active')}
            onClick={handleLinkClick}
          >
            <Tags size={18} />
            <span>전체 태그</span>
          </Link>
        </nav>

        <div className="sidebar-footer">
          <a
            href={urls.newIssue({ labels: LABELS.REQUEST })}
            target="_blank"
            rel="noopener noreferrer"
            className="request-btn"
            aria-label="새 문서 요청하기 (새 창에서 열림)"
          >
            <MessageSquare size={16} aria-hidden="true" />
            <span>문서 요청</span>
          </a>
          <div className="sidebar-footer-icons">
            <Link
              href="/wiki/guide/intro"
              className={clsx('footer-icon-btn', pathname.startsWith('/wiki/guide') && 'active')}
              onClick={handleLinkClick}
              aria-label="가이드"
              title="가이드"
            >
              <BookOpen size={18} />
            </Link>
            <Link
              href="/issues"
              className={clsx('footer-icon-btn', pathname === '/issues' && 'active')}
              onClick={handleLinkClick}
              aria-label="요청 목록"
              title="요청 목록"
            >
              <AlertCircle size={18} />
              {isMounted && openIssuesCount > 0 && (
                <span className="footer-icon-badge">{openIssuesCount}</span>
              )}
            </Link>
          </div>
        </div>

        {/* 리사이즈 핸들 - 데스크톱에서만 표시 */}
        <div
          className="sidebar-resize-handle"
          onMouseDown={handleResizeStart}
          role="separator"
          aria-orientation="vertical"
          aria-label="사이드바 너비 조절"
          tabIndex={0}
        >
          <GripVertical size={12} className="resize-handle-icon" />
        </div>
      </aside>
    </>
  );
}
