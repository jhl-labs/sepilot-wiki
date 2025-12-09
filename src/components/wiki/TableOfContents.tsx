import { useState, useEffect } from 'react';
import { List } from 'lucide-react';
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
 *
 * @example
 * <TableOfContents content={markdownContent} />
 */
export function TableOfContents({ content, className }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const headings = extractHeadings(content);

  useEffect(() => {
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
    <nav className={clsx('toc', className, isCollapsed && 'collapsed')}>
      <button
        className="toc-header"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <List size={16} />
        <span>목차</span>
      </button>
      {!isCollapsed && (
        <ul className="toc-list">
          {headings.map((heading) => (
            <li
              key={heading.id}
              className={clsx(
                'toc-item',
                `toc-level-${heading.level}`,
                activeId === heading.id && 'active'
              )}
            >
              <a
                href={`#${heading.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  const element = document.getElementById(heading.id);
                  element?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                {heading.text}
              </a>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}

function extractHeadings(content: string): TocItem[] {
  const headingRegex = /^(#{1,4})\s+(.+)$/gm;
  const headings: TocItem[] = [];
  let match;

  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    const id = text
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

    headings.push({ id, text, level });
  }

  return headings;
}
