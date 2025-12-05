import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Calendar, User, Tag } from 'lucide-react';
import { Badge } from '../ui/Badge';
import type { WikiPage } from '../../types';

interface PageMetaProps {
  page: WikiPage;
}

export function PageMeta({ page }: PageMetaProps) {
  const formattedDate = page.lastModified
    ? format(new Date(page.lastModified), 'yyyy년 M월 d일', { locale: ko })
    : null;

  return (
    <div className="page-meta">
      <div className="meta-badges">
        {page.isDraft && (
          <Badge variant="draft">
            초안
          </Badge>
        )}
        {page.isInvalid && (
          <Badge variant="invalid">
            수정 필요
          </Badge>
        )}
      </div>
      <div className="meta-info">
        {formattedDate && (
          <span className="meta-item">
            <Calendar size={14} />
            <span>{formattedDate}</span>
          </span>
        )}
        {page.author && (
          <span className="meta-item">
            <User size={14} />
            <span>{page.author}</span>
          </span>
        )}
      </div>
      {page.tags && page.tags.length > 0 && (
        <div className="meta-tags">
          <Tag size={14} />
          {page.tags.map((tag) => (
            <span key={tag} className="meta-tag">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
