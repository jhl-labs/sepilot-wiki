'use client';

import { useState, useEffect, useMemo, useId, useCallback } from 'react';
import { List, ChevronDown, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

/**
 * 목차 항목 타입
 */
interface TocItem {
  /** 헤딩 요소의 ID (앵커 링크용) */
  id: string;
  /** 헤딩 텍스트 */
  text: string;
  /** 헤딩 레벨 (1-4) */
  level: number;
}

/**
 * TableOfContents 컴포넌트 Props
 */
interface TableOfContentsProps {
  /** 마크다운 콘텐츠 (헤딩 추출용) */
  content: string;
  /** 추가 CSS 클래스 */
  className?: string;
}

/**
 * 마크다운 콘텐츠에서 목차(Table of Contents)를 생성하는 컴포넌트
 *
 * 기능:
 * - 마크다운에서 h1-h4 헤딩 자동 추출
 * - IntersectionObserver로 현재 읽고 있는 섹션 강조
 * - 부드러운 스크롤 네비게이션
 * - 접기/펼치기 토글
 * - 접근성 지원 (aria-current, aria-expanded)
 *
 * @example
 * <TableOfContents content={markdownContent} />
 */
export function TableOfContents({ content, className }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const tocId = useId();
  const listId = `${tocId}-list`;

  // 성능 최적화: content가 변경될 때만 헤딩 추출
  const headings = useMemo(() => extractHeadings(content), [content]);

  // 스크롤 이벤트 핸들러 메모이제이션
  const handleHeadingClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>, headingId: string) => {
    e.preventDefault();
    const element = document.getElementById(headingId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      // 포커스 이동 (접근성)
      element.focus({ preventScroll: true });
    }
  }, []);

  useEffect(() => {
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: '-100px 0px -66%' }
    );

    headings.forEach((heading) => {
      const element = document.getElementById(heading.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length < 2) return null;

  return (
    <nav
      className={clsx('toc', className, isCollapsed && 'collapsed')}
      aria-label="목차"
    >
      <button
        className="toc-header"
        onClick={() => setIsCollapsed(!isCollapsed)}
        aria-expanded={!isCollapsed}
        aria-controls={listId}
      >
        {isCollapsed ? (
          <ChevronRight size={16} aria-hidden="true" />
        ) : (
          <ChevronDown size={16} aria-hidden="true" />
        )}
        <List size={16} aria-hidden="true" />
        <span>목차</span>
        <span className="toc-count">({headings.length})</span>
      </button>
      {!isCollapsed && (
        <ul id={listId} className="toc-list" role="list">
          {headings.map((heading) => {
            const isActive = activeId === heading.id;
            return (
              <li
                key={heading.id}
                className={clsx(
                  'toc-item',
                  `toc-level-${heading.level}`,
                  isActive && 'active'
                )}
              >
                <a
                  href={`#${heading.id}`}
                  onClick={(e) => handleHeadingClick(e, heading.id)}
                  aria-current={isActive ? 'location' : undefined}
                >
                  {heading.text}
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </nav>
  );
}

// ID 중복 방지를 위한 카운터
let tocHeadingCounter = 0;

function extractHeadings(content: string): TocItem[] {
  const headingRegex = /^(#{1,4})\s+(.+)$/gm;
  const headings: TocItem[] = [];
  const usedIds = new Set<string>();
  let match;

  // H1은 페이지 제목으로 사용되므로 목차에서 제외
  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length;
    if (level === 1) continue; // H1 제외

    const text = match[2].trim();
    let id = text
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

    // 빈 ID 방지
    if (!id) {
      tocHeadingCounter++;
      id = `heading-${tocHeadingCounter}`;
    }

    // ID 중복 방지
    if (usedIds.has(id)) {
      let suffix = 1;
      while (usedIds.has(`${id}-${suffix}`)) {
        suffix++;
      }
      id = `${id}-${suffix}`;
    }
    usedIds.add(id);

    headings.push({ id, text, level });
  }

  return headings;
}
