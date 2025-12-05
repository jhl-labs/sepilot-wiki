import { NavLink, useLocation } from 'react-router-dom';
import { useState } from 'react';
import {
  Home,
  FileText,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  MessageSquare,
  Tag,
  X,
} from 'lucide-react';
import { useWikiPages, useIssues } from '../../hooks/useWiki';
import { useSidebar } from '../../context/SidebarContext';
import { Skeleton } from '../ui/Skeleton';
import { LABELS } from '../../config';
import clsx from 'clsx';

export function Sidebar() {
  const { isOpen, close } = useSidebar();
  const location = useLocation();
  const { data: pages, isLoading: pagesLoading } = useWikiPages();
  const { data: requestIssues } = useIssues(LABELS.REQUEST);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['wiki', 'issues'])
  );

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
          {/* 홈 링크 */}
          <NavLink
            to="/"
            className={({ isActive }) =>
              clsx('nav-item nav-item-home', isActive && 'active')
            }
            onClick={() => window.innerWidth < 1024 && close()}
          >
            <Home size={18} />
            <span>홈</span>
          </NavLink>

          {/* Wiki 섹션 */}
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
                ) : (
                  pages?.map((page) => (
                    <NavLink
                      key={page.slug}
                      to={`/wiki/${page.slug}`}
                      className={({ isActive }) =>
                        clsx('nav-item nav-item-child', isActive && 'active')
                      }
                      onClick={() => window.innerWidth < 1024 && close()}
                    >
                      <span>{page.title}</span>
                    </NavLink>
                  ))
                )}
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
                  onClick={() => window.innerWidth < 1024 && close()}
                >
                  <Tag size={14} />
                  <span>모든 요청</span>
                </NavLink>
                <NavLink
                  to="/issues?label=request&state=open"
                  className={({ isActive }) =>
                    clsx('nav-item nav-item-child', location.search.includes('state=open') && 'active')
                  }
                  onClick={() => window.innerWidth < 1024 && close()}
                >
                  <AlertCircle size={14} />
                  <span>진행 중</span>
                  {openIssuesCount > 0 && (
                    <span className="nav-count">{openIssuesCount}</span>
                  )}
                </NavLink>
              </div>
            )}
          </div>
        </nav>

        <div className="sidebar-footer">
          <a
            href="https://github.com/jhl-labs/sepilot-wiki/issues/new"
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
