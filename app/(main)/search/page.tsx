'use client';

import { Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, FileText, ArrowRight, Filter, X, Tag, Calendar } from 'lucide-react';
import { useSearchWithFilter, useAvailableTags } from '@/src/hooks/useWiki';
import { Skeleton } from '@/src/components/ui/Skeleton';
import { Input } from '@/src/components/ui/Input';
import { useState, useEffect, useCallback } from 'react';
import type { SearchFilter } from '@/src/services/search';

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const searchQuery = searchParams.get('q') || '';
  const [inputValue, setInputValue] = useState(searchQuery);
  const [showFilters, setShowFilters] = useState(false);

  // 필터 상태
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // 사용 가능한 태그 목록
  const { data: availableTags = [] } = useAvailableTags();

  // 현재 필터 객체
  const filter: SearchFilter = useMemo(() => ({
    tags: selectedTags.length > 0 ? selectedTags : undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  }), [selectedTags, dateFrom, dateTo]);

  // 필터가 적용되었는지 확인
  const hasActiveFilters = selectedTags.length > 0 || dateFrom || dateTo;

  // 필터 지원 검색
  const { data: results, isLoading } = useSearchWithFilter(searchQuery, filter);

  // URL 쿼리가 변경되면 input도 업데이트
  useEffect(() => {
    setInputValue(searchQuery);
  }, [searchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() || hasActiveFilters) {
      router.push(`/search?q=${encodeURIComponent(inputValue.trim())}`);
    }
  };

  // 태그 토글
  const toggleTag = useCallback((tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  }, []);

  // 필터 초기화
  const clearFilters = useCallback(() => {
    setSelectedTags([]);
    setDateFrom('');
    setDateTo('');
  }, []);

  return (
    <div className="search-page">
      <header className="search-header">
        <h1>검색</h1>
        <form onSubmit={handleSearch} className="search-form-large">
          <Input
            type="search"
            placeholder="검색어를 입력하세요..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            icon={<Search size={20} />}
            className="search-input-large"
          />
          <button type="submit" className="btn btn-primary">
            검색
          </button>
          <button
            type="button"
            className={`btn btn-filter ${showFilters ? 'active' : ''} ${hasActiveFilters ? 'has-filters' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
            aria-label="필터 토글"
          >
            <Filter size={18} />
            {hasActiveFilters && <span className="filter-badge">{selectedTags.length + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0)}</span>}
          </button>
        </form>

        {/* 필터 패널 */}
        {showFilters && (
          <div className="search-filters">
            <div className="filter-header">
              <h3>필터</h3>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="clear-filters-btn">
                  <X size={14} />
                  초기화
                </button>
              )}
            </div>

            {/* 태그 필터 */}
            <div className="filter-section">
              <label className="filter-label">
                <Tag size={14} />
                태그
              </label>
              <div className="tag-filter-list">
                {availableTags.slice(0, 20).map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className={`tag-filter-item ${selectedTags.includes(tag) ? 'selected' : ''}`}
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* 날짜 필터 */}
            <div className="filter-section">
              <label className="filter-label">
                <Calendar size={14} />
                수정일
              </label>
              <div className="date-filter-row">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="date-input"
                  placeholder="시작일"
                />
                <span className="date-separator">~</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="date-input"
                  placeholder="종료일"
                />
              </div>
            </div>
          </div>
        )}

        {/* 활성 필터 표시 */}
        {hasActiveFilters && (
          <div className="active-filters">
            {selectedTags.map((tag) => (
              <span key={tag} className="active-filter-tag">
                {tag}
                <button onClick={() => toggleTag(tag)} aria-label={`${tag} 필터 제거`}>
                  <X size={12} />
                </button>
              </span>
            ))}
            {dateFrom && (
              <span className="active-filter-tag">
                시작: {dateFrom}
                <button onClick={() => setDateFrom('')} aria-label="시작일 필터 제거">
                  <X size={12} />
                </button>
              </span>
            )}
            {dateTo && (
              <span className="active-filter-tag">
                종료: {dateTo}
                <button onClick={() => setDateTo('')} aria-label="종료일 필터 제거">
                  <X size={12} />
                </button>
              </span>
            )}
          </div>
        )}
      </header>

      <div className="search-results">
        {isLoading ? (
          <div className="results-loading">
            <Skeleton height={80} />
            <Skeleton height={80} />
            <Skeleton height={80} />
          </div>
        ) : searchQuery && results ? (
          results.length > 0 ? (
            <>
              <p className="results-count">
                "{searchQuery}"에 대한 검색 결과 {results.length}건
              </p>
              <div className="results-list">
                {results.map((result) => (
                  <Link
                    key={result.slug}
                    href={`/wiki/${result.slug}`}
                    className="result-item"
                  >
                    <FileText size={20} className="result-icon" />
                    <div className="result-content">
                      <h3 className="result-title">{result.title}</h3>
                      <p className="result-excerpt">
                        {result.content || '문서를 클릭하여 내용을 확인하세요'}
                      </p>
                    </div>
                    <ArrowRight size={18} className="result-arrow" />
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <div className="no-results">
              <Search size={48} />
              <h2>검색 결과가 없습니다</h2>
              <p>"{searchQuery}"에 대한 문서를 찾을 수 없습니다.</p>
              <div className="suggestions">
                <p>다음을 시도해 보세요:</p>
                <ul>
                  <li>다른 키워드로 검색</li>
                  <li>더 일반적인 용어 사용</li>
                  <li>맞춤법 확인</li>
                </ul>
              </div>
            </div>
          )
        ) : (
          <div className="search-empty">
            <Search size={48} />
            <h2>무엇을 찾고 계신가요?</h2>
            <p>검색어를 입력하여 문서를 찾아보세요.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function SearchLoading() {
  return (
    <div className="search-page">
      <header className="search-header">
        <Skeleton width={100} height={32} />
        <Skeleton width="100%" height={48} />
      </header>
      <div className="search-results">
        <div className="results-loading">
          <Skeleton height={80} />
          <Skeleton height={80} />
          <Skeleton height={80} />
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchLoading />}>
      <SearchContent />
    </Suspense>
  );
}
