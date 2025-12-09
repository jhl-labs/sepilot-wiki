'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useWikiTags } from '@/src/hooks/useWiki';
import { Skeleton } from '@/src/components/ui/Skeleton';
import { Tag, FileText, ChevronRight, Hash, TrendingUp, Cloud } from 'lucide-react';
import ReactWordcloud from '@cp949/react-wordcloud';
import clsx from 'clsx';

import 'tippy.js/dist/tippy.css';
import 'tippy.js/animations/scale.css';

// WordCloud 옵션 타입
interface WordCloudWord {
  text: string;
  value: number;
  [key: string]: unknown;
}

// WordCloud 콜백 타입
interface WordCloudCallbacks {
  onWordClick?: (word: WordCloudWord) => void;
  getWordTooltip?: (word: WordCloudWord) => string;
}

export default function TagsPage() {
  const { data: tags, isLoading } = useWikiTags();
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const totalTags = tags?.length || 0;
  const totalDocuments = tags?.reduce((sum, t) => sum + t.count, 0) || 0;
  const maxCount = tags?.[0]?.count || 1;

  const selectedTagData = selectedTag
    ? tags?.find((t) => t.tag === selectedTag)
    : null;

  // WordCloud 데이터 변환
  const wordCloudData: WordCloudWord[] = useMemo(() => {
    if (!tags) return [];
    return tags.map((t) => ({
      text: t.tag,
      value: t.count,
    }));
  }, [tags]);

  // WordCloud 옵션
  const wordCloudOptions = useMemo(
    () => ({
      colors: [
        'var(--color-accent-primary)',
        'var(--color-accent-secondary, #8b5cf6)',
        '#3b82f6',
        '#06b6d4',
        '#10b981',
        '#f59e0b',
        '#ef4444',
        '#ec4899',
      ],
      enableTooltip: true,
      deterministic: true,
      fontFamily: 'var(--font-sans, system-ui, sans-serif)',
      fontSizes: [16, 60] as [number, number],
      fontStyle: 'normal',
      fontWeight: '600',
      padding: 4,
      rotations: 2,
      rotationAngles: [0, 0] as [number, number],
      scale: 'sqrt' as const,
      spiral: 'archimedean' as const,
      transitionDuration: 500,
    }),
    []
  );

  // WordCloud 콜백
  const wordCloudCallbacks: WordCloudCallbacks = useMemo(
    () => ({
      onWordClick: (word: WordCloudWord) => {
        setSelectedTag((prev) => (prev === word.text ? null : word.text));
      },
      getWordTooltip: (word: WordCloudWord) =>
        `${word.text}: ${word.value}개 문서`,
    }),
    []
  );

  return (
    <div className="tags-page">
      <header className="tags-header">
        <div className="header-content">
          <h1>
            <Tag size={28} />
            <span>태그 현황</span>
          </h1>
          <p className="header-description">
            Wiki 문서에 사용된 태그를 한눈에 확인할 수 있습니다.
          </p>
        </div>
      </header>

      {/* 통계 카드 */}
      <div className="tags-stats">
        <div className="stat-card">
          <div className="stat-icon">
            <Hash size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{totalTags}</span>
            <span className="stat-label">전체 태그</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <FileText size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{totalDocuments}</span>
            <span className="stat-label">태그 사용</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <TrendingUp size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{tags?.[0]?.tag || '-'}</span>
            <span className="stat-label">인기 태그</span>
          </div>
        </div>
      </div>

      <div className="tags-content">
        {/* WordCloud 섹션 */}
        <section className="wordcloud-section">
          <h2 className="section-title">
            <Cloud size={20} />
            워드 클라우드
          </h2>
          <div className="wordcloud-container">
            {isLoading ? (
              <div className="wordcloud-loading">
                <Skeleton height={300} style={{ borderRadius: 'var(--radius-xl)' }} />
              </div>
            ) : wordCloudData.length > 0 ? (
              <ReactWordcloud
                words={wordCloudData}
                options={wordCloudOptions}
                callbacks={wordCloudCallbacks}
              />
            ) : (
              <div className="empty-state">
                <Cloud size={48} />
                <h3>태그가 없습니다</h3>
                <p>아직 문서에 태그가 추가되지 않았습니다.</p>
              </div>
            )}
          </div>
        </section>

        {/* 태그 클라우드 (기존 버튼 스타일) */}
        <section className="tags-cloud-section">
          <h2 className="section-title">
            <Tag size={20} />
            태그 목록
          </h2>
          <div className="tags-cloud">
            {isLoading ? (
              <div className="tags-cloud-loading">
                {[80, 100, 70, 110, 90, 75, 95, 85, 105, 65, 115, 88].map((width, i) => (
                  <Skeleton
                    key={i}
                    width={width}
                    height={32}
                    style={{ borderRadius: '9999px' }}
                  />
                ))}
              </div>
            ) : tags && tags.length > 0 ? (
              tags.map((tagData) => {
                const ratio = tagData.count / maxCount;
                const size = Math.max(0.75, 0.75 + ratio * 0.5);
                const isSelected = selectedTag === tagData.tag;

                return (
                  <button
                    key={tagData.tag}
                    className={clsx('tag-cloud-item', isSelected && 'selected')}
                    style={{
                      fontSize: `${size}rem`,
                      '--tag-opacity': 0.4 + ratio * 0.6,
                    } as React.CSSProperties}
                    onClick={() =>
                      setSelectedTag(isSelected ? null : tagData.tag)
                    }
                  >
                    <span className="tag-name">{tagData.tag}</span>
                    <span className="tag-count">{tagData.count}</span>
                  </button>
                );
              })
            ) : (
              <div className="empty-state">
                <Tag size={48} />
                <h3>태그가 없습니다</h3>
                <p>아직 문서에 태그가 추가되지 않았습니다.</p>
              </div>
            )}
          </div>
        </section>

        {/* 태그 상세 - 선택된 태그의 문서 목록 */}
        {selectedTagData && (
          <section className="tag-detail-section">
            <h2 className="section-title">
              <Hash size={20} />
              <span className="tag-label">{selectedTagData.tag}</span>
              <span className="tag-doc-count">
                {selectedTagData.count}개 문서
              </span>
            </h2>
            <div className="tag-documents">
              {selectedTagData.pages.map((page) => (
                <Link
                  key={page.slug}
                  href={`/wiki/${page.slug}`}
                  className="tag-document-item"
                >
                  <FileText size={16} className="doc-icon" />
                  <span className="doc-title">{page.title}</span>
                  <ChevronRight size={16} className="doc-arrow" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 태그 목록 테이블 */}
        <section className="tags-list-section">
          <h2 className="section-title">
            <TrendingUp size={20} />
            태그 순위
          </h2>
          <div className="tags-list">
            {isLoading ? (
              <>
                <Skeleton height={56} />
                <Skeleton height={56} />
                <Skeleton height={56} />
                <Skeleton height={56} />
                <Skeleton height={56} />
              </>
            ) : tags && tags.length > 0 ? (
              tags.map((tagData, index) => {
                const ratio = tagData.count / maxCount;

                return (
                  <div
                    key={tagData.tag}
                    className={clsx(
                      'tag-list-item',
                      selectedTag === tagData.tag && 'selected'
                    )}
                    onClick={() =>
                      setSelectedTag(
                        selectedTag === tagData.tag ? null : tagData.tag
                      )
                    }
                  >
                    <span className="tag-rank">#{index + 1}</span>
                    <div className="tag-info">
                      <span className="tag-name">{tagData.tag}</span>
                      <div className="tag-bar-container">
                        <div
                          className="tag-bar"
                          style={{ width: `${ratio * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="tag-count">{tagData.count}</span>
                  </div>
                );
              })
            ) : (
              <div className="empty-state small">
                <p>태그 데이터가 없습니다.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
