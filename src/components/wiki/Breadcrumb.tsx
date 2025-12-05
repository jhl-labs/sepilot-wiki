import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import type { Breadcrumb as BreadcrumbType } from '../../types';

interface BreadcrumbProps {
  items: BreadcrumbType[];
}

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
