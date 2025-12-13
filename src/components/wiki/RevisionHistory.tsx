'use client';

import { useState } from 'react';
import { History, ChevronDown, ChevronUp, GitCommit, Plus, Minus, User, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { WikiRevision } from '../../types';
import { urls } from '../../config';
import clsx from 'clsx';

interface RevisionHistoryProps {
  history: WikiRevision[];
  slug: string;
}

export function RevisionHistory({ history, slug }: RevisionHistoryProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAll, setShowAll] = useState(false);

  if (!history || history.length === 0) {
    return null;
  }

  const displayHistory = showAll ? history : history.slice(0, 5);
  const hasMore = history.length > 5;

  return (
    <div className="revision-history">
      <button
        className="revision-history-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <History size={16} />
        <span>버전 히스토리</span>
        <span className="revision-count">{history.length}개 리비전</span>
        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {isExpanded && (
        <div className="revision-list">
          {displayHistory.map((revision, index) => (
            <div key={revision.sha} className={clsx('revision-item', index === 0 && 'latest')}>
              <div className="revision-header">
                <div className="revision-sha">
                  <GitCommit size={14} />
                  <a
                    href={urls.commit(revision.sha)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="sha-link"
                  >
                    {revision.sha}
                  </a>
                  {index === 0 && <span className="latest-badge">최신</span>}
                </div>
                <div className="revision-stats">
                  {revision.additions !== undefined && revision.additions > 0 && (
                    <span className="stat additions">
                      <Plus size={12} />
                      {revision.additions}
                    </span>
                  )}
                  {revision.deletions !== undefined && revision.deletions > 0 && (
                    <span className="stat deletions">
                      <Minus size={12} />
                      {revision.deletions}
                    </span>
                  )}
                </div>
              </div>

              <div className="revision-message">{revision.message}</div>

              <div className="revision-meta">
                <span className="revision-author">
                  <User size={12} />
                  {revision.author}
                </span>
                <span className="revision-date">
                  <Calendar size={12} />
                  {formatDistanceToNow(new Date(revision.date), {
                    addSuffix: true,
                    locale: ko,
                  })}
                </span>
              </div>
            </div>
          ))}

          {hasMore && (
            <button
              className="show-more-btn"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? '접기' : `${history.length - 5}개 더 보기`}
            </button>
          )}

          <a
            href={urls.fileHistory(`wiki/${slug}.md`)}
            target="_blank"
            rel="noopener noreferrer"
            className="view-all-link"
          >
            GitHub에서 전체 히스토리 보기
          </a>
        </div>
      )}
    </div>
  );
}
