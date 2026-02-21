'use client';

import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Calendar, User, Tag, GitCommit, CalendarPlus } from 'lucide-react';
import { Badge } from '../ui/Badge';
import type { WikiPage } from '../../types';

interface PageMetaProps {
  page: WikiPage;
}

export function PageMeta({ page }: PageMetaProps) {
  const formattedDate = page.lastModified
    ? format(new Date(page.lastModified), 'yyyy년 M월 d일', { locale: ko })
    : null;

  // 생성일: history 배열의 마지막 항목 (가장 오래된 커밋)
  const createdDate =
    page.history && page.history.length > 0
      ? format(new Date(page.history[page.history.length - 1].date), 'yyyy년 M월 d일', { locale: ko })
      : null;

  // 리비전 수
  const revisionCount = page.history?.length || 0;

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
        {revisionCount > 0 && (
          <Badge variant="info">
            <GitCommit size={12} />
            Rev.{revisionCount}
          </Badge>
        )}
      </div>
      <div className="meta-info">
        {createdDate && (
          <span className="meta-item">
            <CalendarPlus size={14} />
            <span>생성: {createdDate}</span>
          </span>
        )}
        {formattedDate && (
          <span className="meta-item">
            <Calendar size={14} />
            <span>수정: {formattedDate}</span>
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
