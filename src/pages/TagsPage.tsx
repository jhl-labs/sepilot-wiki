import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useWikiTags } from '../hooks/useWiki';
import { Skeleton } from '../components/ui/Skeleton';
import { Tag, FileText, ChevronRight, Hash, TrendingUp } from 'lucide-react';
import clsx from 'clsx';

export function TagsPage() {
  const { data: tags, isLoading } = useWikiTags();
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const totalTags = tags?.length || 0;
  const totalDocuments = tags?.reduce((sum, t) => sum + t.count, 0) || 0;
  const maxCount = tags?.[0]?.count || 1;

  const selectedTagData = selectedTag
    ? tags?.find((t) => t.tag === selectedTag)
    : null;

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
        {/* 태그 클라우드 */}
        <section className="tags-cloud-section">
          <h2 className="section-title">
            <Tag size={20} />
            태그 클라우드
          </h2>
          <div className="tags-cloud">
            {isLoading ? (
              <div className="tags-cloud-loading">
                {Array.from({ length: 12 }).map((_, i) => (
                  <Skeleton
                    key={i}
                    width={60 + Math.random() * 60}
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
                  to={`/wiki/${page.slug}`}
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
