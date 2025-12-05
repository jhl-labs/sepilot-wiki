import { NavLink, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  Home,
  FileText,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  MessageSquare,
  Tag,
  Tags,
  X,
  BookOpen,
  ExternalLink,
} from 'lucide-react';
import { useWikiPages, useIssues, useGuidePages } from '../../hooks/useWiki';
import { useSidebar } from '../../context/SidebarContext';
import { useNavigationConfig } from '../../context/ConfigContext';
import { Skeleton } from '../ui/Skeleton';
import { LABELS, urls } from '../../config';
import { DynamicIcon } from '../../utils/icons';
import clsx from 'clsx';
import type { SidebarSection, SidebarNavItem, WikiTree } from '../../types';

export function Sidebar() {
  const { isOpen, close } = useSidebar();
  const location = useLocation();
  const navigationConfig = useNavigationConfig();
  const { data: wikiPages, isLoading: pagesLoading } = useWikiPages();
  const { data: guidePages } = useGuidePages();
  const { data: requestIssues } = useIssues(LABELS.REQUEST);

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

    return (
      <NavLink
        key={item.href}
        to={item.href}
        className={({ isActive }) =>
          clsx('nav-item nav-item-child', isActive && 'active')
        }
        style={{ paddingLeft }}
        onClick={handleLinkClick}
      >
        {item.icon && <DynamicIcon name={item.icon} size={14} />}
        <span>{item.label}</span>
        {item.badge && <span className="nav-badge-text">{item.badge}</span>}
      </NavLink>
    );
  };

  // Wiki 트리 아이템 렌더링 (최대 depth 2까지)
  const renderWikiTreeItem = (item: WikiTree, depth = 1): React.ReactNode => {
    const hasChildren = item.children && item.children.length > 0;
    const paddingLeft = depth > 1 ? `${1 + (depth - 1) * 0.75}rem` : undefined;
    // menu 필드가 있으면 menu 사용, 없으면 title 사용
    const displayName = item.menu || item.title;

    return (
      <div key={item.slug}>
        <NavLink
          to={`/wiki/${item.slug}`}
          className={({ isActive }) =>
            clsx('nav-item nav-item-child', isActive && 'active')
          }
          style={{ paddingLeft }}
          onClick={handleLinkClick}
        >
          <span>{displayName}</span>
        </NavLink>
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
        className={clsx('sidebar-overlay', isOpen && 'visible')}
        onClick={close}
      />
      <aside className={clsx('sidebar', isOpen && 'open')}>
        <div className="sidebar-header">
          <span className="sidebar-title">탐색</span>
          <button className="sidebar-close" onClick={close}>
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {/* 홈 링크 - wiki/home.md가 있으면 해당 페이지로, 없으면 기본 홈으로 */}
          <NavLink
            to={hasWikiHome ? '/wiki/home' : '/'}
            className={({ isActive }) =>
              clsx('nav-item nav-item-home', isActive && 'active')
            }
            onClick={handleLinkClick}
          >
            <Home size={18} />
            <span>홈</span>
          </NavLink>

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
                {pagesLoading ? (
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

          {/* 가이드 섹션 - 정적 가이드 페이지 */}
          <div className="nav-section">
            <button
              className="nav-section-header"
              onClick={() => toggleSection('guide')}
            >
              <BookOpen size={18} />
              <span>가이드</span>
              {expandedSections.has('guide') ? (
                <ChevronDown size={16} className="chevron" />
              ) : (
                <ChevronRight size={16} className="chevron" />
              )}
            </button>
            {expandedSections.has('guide') && (
              <div className="nav-section-content">
                {guidePages?.map((page) => (
                  <NavLink
                    key={page.slug}
                    to={`/wiki/${page.slug}`}
                    className={({ isActive }) =>
                      clsx('nav-item nav-item-child', isActive && 'active')
                    }
                    onClick={handleLinkClick}
                  >
                    <span>{page.title}</span>
                  </NavLink>
                ))}
              </div>
            )}
          </div>

          {/* Issues 섹션 */}
          <div className="nav-section">
            <button
              className="nav-section-header"
              onClick={() => toggleSection('issues')}
            >
              <MessageSquare size={18} />
              <span>요청</span>
              {openIssuesCount > 0 && (
                <span className="nav-badge">{openIssuesCount}</span>
              )}
              {expandedSections.has('issues') ? (
                <ChevronDown size={16} className="chevron" />
              ) : (
                <ChevronRight size={16} className="chevron" />
              )}
            </button>
            {expandedSections.has('issues') && (
              <div className="nav-section-content">
                <NavLink
                  to="/issues"
                  className={({ isActive }) =>
                    clsx('nav-item nav-item-child', isActive && location.pathname === '/issues' && 'active')
                  }
                  onClick={handleLinkClick}
                >
                  <Tag size={14} />
                  <span>모든 요청</span>
                </NavLink>
                <NavLink
                  to="/issues?label=request&state=open"
                  className={() =>
                    clsx('nav-item nav-item-child', location.search.includes('state=open') && 'active')
                  }
                  onClick={handleLinkClick}
                >
                  <AlertCircle size={14} />
                  <span>진행 중</span>
                  {openIssuesCount > 0 && (
                    <span className="nav-count">{openIssuesCount}</span>
                  )}
                </NavLink>
                <NavLink
                  to="/tags"
                  className={({ isActive }) =>
                    clsx('nav-item nav-item-child', isActive && 'active')
                  }
                  onClick={handleLinkClick}
                >
                  <Tags size={14} />
                  <span>전체 태그</span>
                </NavLink>
              </div>
            )}
          </div>
        </nav>

        <div className="sidebar-footer">
          <a
            href={urls.newIssue({ labels: LABELS.REQUEST })}
            target="_blank"
            rel="noopener noreferrer"
            className="request-btn"
          >
            <MessageSquare size={16} />
            <span>문서 요청</span>
          </a>
        </div>
      </aside>
    </>
  );
}
