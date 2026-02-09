'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useDocumentAIHistory } from '@/src/hooks/useWiki';
import { Skeleton } from '@/src/components/ui/Skeleton';
import {
  Bot,
  FileText,
  FilePlus,
  FileEdit,
  FileCheck,
  FileWarning,
  Trash2,
  RotateCcw,
  ExternalLink,
  ChevronLeft,
  Filter,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { AIActionType, AIHistoryEntry } from '@/src/types';
import { urls } from '@/src/config';
import clsx from 'clsx';

// 액션 타입별 아이콘과 라벨
const actionConfig: Record<AIActionType, { icon: typeof FileText; label: string; color: string }> = {
  generate: { icon: FilePlus, label: '문서 생성', color: 'var(--color-success)' },
  modify: { icon: FileEdit, label: '문서 수정', color: 'var(--color-info)' },
  publish: { icon: FileCheck, label: '문서 발행', color: 'var(--color-accent-primary)' },
  invalid: { icon: FileWarning, label: '오류 수정', color: 'var(--color-warning)' },
  delete: { icon: Trash2, label: '문서 삭제', color: 'var(--color-error)' },
  recover: { icon: RotateCcw, label: '문서 복구', color: 'var(--color-success)' },
};

// 트리거 라벨
const triggerLabels: Record<string, string> = {
  request_label: 'request 라벨',
  invalid_label: 'invalid 라벨',
  maintainer_comment: 'Maintainer 피드백',
  issue_close: 'Issue 종료',
  issue_reopen: 'Issue 재오픈',
};

function AIHistoryTimeline({ entries }: { entries: AIHistoryEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="empty-state">
        <Bot size={48} />
        <h2>AI 작업 기록이 없습니다</h2>
        <p>아직 AI를 통한 문서 작업이 수행되지 않았습니다.</p>
      </div>
    );
  }

  return (
    <div className="ai-history-timeline">
      {entries.map((entry) => {
        const config = actionConfig[entry.actionType];
        const Icon = config.icon;

        return (
          <div key={entry.id} className="ai-history-item">
            <div className="ai-history-icon" style={{ backgroundColor: config.color }}>
              <Icon size={16} />
            </div>
            <div className="ai-history-content">
              <div className="ai-history-header">
                <span className="ai-history-action" style={{ color: config.color }}>
                  {config.label}
                </span>
                <span className="ai-history-time">
                  {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true, locale: ko })}
                </span>
              </div>

              <Link href={`/wiki/${entry.documentSlug}`} className="ai-history-document">
                <FileText size={14} />
                <span>{entry.documentTitle}</span>
              </Link>

              <p className="ai-history-summary">{entry.summary}</p>

              <div className="ai-history-meta">
                <a
                  href={urls.issue(entry.issueNumber)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ai-history-issue"
                >
                  <ExternalLink size={12} />
                  Issue #{entry.issueNumber}
                </a>
                <span className="ai-history-trigger">{triggerLabels[entry.trigger]}</span>
                {entry.model && <span className="ai-history-model">{entry.model}</span>}
              </div>

              <div className="ai-history-timestamp">
                {format(new Date(entry.timestamp), 'yyyy년 M월 d일 HH:mm', { locale: ko })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface AIHistoryPageClientProps {
  params: Promise<{ slug: string[] }>;
}

export default function AIHistoryPageClient({ params }: AIHistoryPageClientProps) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug?.join('/') || '';
  const [filter, setFilter] = useState<AIActionType | 'all'>('all');
  const { data: docHistory, isLoading } = useDocumentAIHistory(slug);

  // 필터링
  const filteredEntries =
    filter === 'all' ? docHistory : docHistory?.filter((e) => e.actionType === filter);

  if (isLoading) {
    return (
      <div className="ai-history-page">
        <div className="ai-history-header-section">
          <Skeleton width={300} height={32} />
          <Skeleton width={200} height={20} />
        </div>
        <div className="ai-history-content-section">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} height={120} className="ai-history-skeleton" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="ai-history-page">
      <div className="ai-history-header-section">
        <Link href="/ai-history" className="ai-history-back">
          <ChevronLeft size={16} />
          전체 AI 히스토리
        </Link>

        <h1>
          <Bot size={28} />
          문서 AI 작업 히스토리
        </h1>

        {slug && (
          <p className="ai-history-doc-info">
            <FileText size={16} />
            <Link href={`/wiki/${slug}`}>{slug}</Link> 문서의 AI 작업 기록
          </p>
        )}

        <p className="ai-history-description">
          AI가 수행한 모든 문서 작업의 타임라인입니다. 문서 생성, 수정, 발행 등의 이력을 확인할 수
          있습니다.
        </p>
      </div>

      <div className="ai-history-filter">
        <Filter size={16} />
        <span>필터:</span>
        <div className="ai-history-filter-buttons">
          <button
            className={clsx('filter-btn', filter === 'all' && 'active')}
            onClick={() => setFilter('all')}
          >
            전체
          </button>
          {Object.entries(actionConfig).map(([key, config]) => (
            <button
              key={key}
              className={clsx('filter-btn', filter === key && 'active')}
              onClick={() => setFilter(key as AIActionType)}
              style={{ '--filter-color': config.color } as React.CSSProperties}
            >
              <config.icon size={14} />
              {config.label}
            </button>
          ))}
        </div>
      </div>

      <div className="ai-history-content-section">
        <AIHistoryTimeline entries={filteredEntries || []} />
      </div>
    </div>
  );
}
