import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';
import { useSidebar } from '../../context/SidebarContext';
import clsx from 'clsx';

/**
 * 앱 전체 레이아웃 컴포넌트
 *
 * 구조:
 * - Skip link (접근성)
 * - Header (role="banner")
 * - Sidebar (role="complementary")
 * - Main content (role="main")
 * - Footer (role="contentinfo")
 */
export function Layout() {
  const { isOpen, width, isResizing } = useSidebar();

  return (
    <div
      className={clsx('app-layout', isOpen && 'sidebar-open', isResizing && 'sidebar-resizing')}
      style={{ '--sidebar-dynamic-width': `${width}px` } as React.CSSProperties}
    >
      {/* 접근성: 본문으로 바로 가기 링크 */}
      <a href="#main-content" className="skip-link">
        본문으로 바로 가기
      </a>
      <Header />
      <div className="app-container">
        <Sidebar />
        <main id="main-content" className="main-content" role="main" aria-label="주요 콘텐츠">
          <Outlet />
        </main>
      </div>
      <Footer />
    </div>
  );
}
