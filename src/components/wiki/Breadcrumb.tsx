import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import type { Breadcrumb as BreadcrumbType } from '../../types';

/**
 * Breadcrumb 컴포넌트 Props
 */
interface BreadcrumbProps {
  /** 브레드크럼 경로 항목 배열 */
  items: BreadcrumbType[];
}

/**
 * 현재 페이지의 계층적 위치를 보여주는 브레드크럼 네비게이션
 *
 * 홈 > 카테고리 > 현재 페이지 형태로 경로를 표시합니다.
 * 마지막 항목은 링크가 아닌 현재 위치로 표시됩니다.
 *
 * @example
 * const items = [
 *   { title: 'Documentation', slug: 'docs' },
 *   { title: 'Getting Started' } // 마지막 항목은 slug 없음
 * ];
 * <Breadcrumb items={items} />
 */
export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      <ol className="breadcrumb-list">
        <li className="breadcrumb-item">
          <Link to="/" className="breadcrumb-link">
            <Home size={14} />
            <span>홈</span>
          </Link>
        </li>
        {items.map((item, index) => (
          <li key={index} className="breadcrumb-item">
            <ChevronRight size={14} className="breadcrumb-separator" />
            {item.slug ? (
              <Link to={`/wiki/${item.slug}`} className="breadcrumb-link">
                {item.title}
              </Link>
            ) : (
              <span className="breadcrumb-current">{item.title}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
