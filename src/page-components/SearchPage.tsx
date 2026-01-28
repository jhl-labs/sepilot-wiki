import { useSearchParams, Link } from 'react-router-dom';
import { Search, FileText, ArrowRight, RefreshCw, AlertCircle, Tag, TrendingUp } from 'lucide-react';
import { useSearch, useWikiTags, useWikiPages } from '../hooks/useWiki';
import { useDebounce } from '../hooks/useDebounce';
import { escapeRegExp } from '../utils';
import { Skeleton } from '../components/ui/Skeleton';
import { Input } from '../components/ui/Input';
import { useState, useMemo, useCallback } from 'react';

// 검색어 하이라이팅 컴포넌트
function HighlightText({ text, query }: { text: string; query: string }) {
  const parts = useMemo(() => {
    if (!query || query.length < 2) return [{ text, highlight: false }];

    const escapedQuery = escapeRegExp(query);
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    const splitParts = text.split(regex);

    return splitParts.map((part, index) => ({
      text: part,
      highlight: index % 2 === 1, // 매치된 부분은 홀수 인덱스
    }));
  }, [text, query]);

  return (
    <>
      {parts.map((part, index) =>
        part.highlight ? (
          <mark key={index} className="search-highlight">
            {part.text}
          </mark>
        ) : (
          <span key={index}>{part.text}</span>
        )
      )}
    </>
  );
}

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') || '';
  const [inputValue, setInputValue] = useState(searchQuery);

  // 검색 요청 debounce (300ms) - 매 글자마다 요청 방지
  const debouncedQuery = useDebounce(searchQuery, 300);
  const { data: results, isLoading, error, refetch } = useSearch(debouncedQuery);
  const { data: tags } = useWikiTags();
  const { data: pages } = useWikiPages();

  // 인기 태그 (상위 8개)
  const popularTags = useMemo(() => tags?.slice(0, 8) || [], [tags]);

  // 추천 문서 (최근 5개, 카테고리 제외)
  const recentPages = useMemo(() => {
    if (!pages) return [];
    const flatPages: { title: string; slug: string }[] = [];
    const traverse = (items: typeof pages) => {
      for (const item of items) {
        if (!item.isCategory && item.slug) {
          flatPages.push({ title: item.title || item.slug, slug: item.slug });
        }
        if (item.children) traverse(item.children);
      }
    };
    traverse(pages);
    return flatPages.slice(0, 5);
  }, [pages]);

  // 검색 결과에서 검색어 주변 텍스트 추출
  const getExcerptWithContext = useCallback((content: string, query: string, maxLength = 150) => {
    if (!content || !query || query.length < 2) {
      return content?.slice(0, maxLength) || '';
    }

    const lowerContent = content.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const matchIndex = lowerContent.indexOf(lowerQuery);

    if (matchIndex === -1) {
      return content.slice(0, maxLength);
    }

    // 검색어 주변 텍스트 추출
    const contextStart = Math.max(0, matchIndex - 40);
    const contextEnd = Math.min(content.length, matchIndex + query.length + 100);

    let excerpt = content.slice(contextStart, contextEnd);

    // 시작/끝에 ... 추가
    if (contextStart > 0) excerpt = '...' + excerpt;
    if (contextEnd < content.length) excerpt = excerpt + '...';

    return excerpt;
  }, []);

  // URL 쿼리가 변경되면 input도 업데이트 (key prop 사용으로 리렌더링)
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      setSearchParams({ q: inputValue.trim() });
    }
  };

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
        </form>
      </header>

      <div className="search-results">
        {/* 에러 상태 */}
        {error ? (
          <div className="error-state">
            <AlertCircle size={48} />
            <h2>검색 중 오류가 발생했습니다</h2>
            <p>잠시 후 다시 시도해주세요.</p>
            <div className="error-actions">
              <button onClick={() => refetch()} className="btn btn-primary">
                <RefreshCw size={16} />
                <span>다시 시도</span>
              </button>
            </div>
          </div>
        ) : isLoading ? (
          <div className="results-loading">
            <Skeleton height={80} />
            <Skeleton height={80} />
            <Skeleton height={80} />
          </div>
        ) : searchQuery && results ? (
          results.length > 0 ? (
            <>
              <p className="results-count">
                "<HighlightText text={searchQuery} query={searchQuery} />"에 대한 검색 결과 {results.length}건
              </p>
              <div className="results-list">
                {results.map((result) => (
                  <Link
                    key={result.slug}
                    to={`/wiki/${result.slug}`}
                    className="result-item"
                  >
                    <FileText size={20} className="result-icon" />
                    <div className="result-content">
                      <h3 className="result-title">
                        <HighlightText text={result.title} query={searchQuery} />
                      </h3>
                      <p className="result-excerpt">
                        {result.content ? (
                          <HighlightText
                            text={getExcerptWithContext(result.content, searchQuery)}
                            query={searchQuery}
                          />
                        ) : (
                          '문서를 클릭하여 내용을 확인하세요'
                        )}
                      </p>
                      {result.tags && result.tags.length > 0 && (
                        <div className="result-tags">
                          {result.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="result-tag">
                              <HighlightText text={tag} query={searchQuery} />
                            </span>
                          ))}
                        </div>
                      )}
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

              {/* 인기 태그 추천 */}
              {popularTags.length > 0 && (
                <div className="search-suggestions-section">
                  <h3>
                    <TrendingUp size={16} />
                    <span>인기 태그로 검색</span>
                  </h3>
                  <div className="search-tags">
                    {popularTags.map((tag) => (
                      <button
                        key={tag.tag}
                        className="search-tag-btn"
                        onClick={() => {
                          setInputValue(tag.tag);
                          setSearchParams({ q: tag.tag });
                        }}
                      >
                        <Tag size={12} />
                        {tag.tag}
                        <span className="tag-count">{tag.count}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 추천 문서 */}
              {recentPages.length > 0 && (
                <div className="search-suggestions-section">
                  <h3>
                    <FileText size={16} />
                    <span>문서 둘러보기</span>
                  </h3>
                  <div className="search-recommended-pages">
                    {recentPages.map((page) => (
                      <Link
                        key={page.slug}
                        to={`/wiki/${page.slug}`}
                        className="search-page-link"
                      >
                        {page.title}
                        <ArrowRight size={14} />
                      </Link>
                    ))}
                  </div>
                </div>
              )}
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
