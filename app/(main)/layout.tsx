'use client';

import { Suspense } from 'react';
import { Header } from '@/src/components/layout/Header';
import { Sidebar } from '@/src/components/layout/Sidebar';
import { Footer } from '@/src/components/layout/Footer';
import { useSidebar } from '@/src/context/SidebarContext';
import clsx from 'clsx';

/**
 * 메인 레이아웃 컴포넌트 (Next.js App Router용)
 *
 * 구조:
 * - Skip link (접근성)
 * - Header (role="banner")
 * - Sidebar (role="complementary")
 * - Main content (role="main")
 * - Footer (role="contentinfo")
 */
export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { isOpen, width, isResizing } = useSidebar();

  return (
    // suppressHydrationWarning: width는 localStorage에서 로드되어 SSR/CSR 값이 다를 수 있음
    <div
      className={clsx('app-layout', isOpen && 'sidebar-open', isResizing && 'sidebar-resizing')}
      style={{ '--sidebar-dynamic-width': `${width}px` } as React.CSSProperties}
      suppressHydrationWarning
    >
      {/* 접근성: 본문으로 바로 가기 링크 */}
      <a href="#main-content" className="skip-link">
        본문으로 바로 가기
      </a>
      <Suspense fallback={null}>
        <Header />
      </Suspense>
      <div className="app-container">
        <Suspense fallback={<div className="sidebar" />}>
          <Sidebar />
        </Suspense>
        <main id="main-content" className="main-content" role="main" aria-label="주요 콘텐츠">
          {children}
        </main>
      </div>
      <Footer />
    </div>
  );
}
