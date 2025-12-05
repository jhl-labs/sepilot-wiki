import { useSearchParams, Link } from 'react-router-dom';
import { Search, FileText, ArrowRight } from 'lucide-react';
import { useSearch } from '../hooks/useWiki';
import { Skeleton } from '../components/ui/Skeleton';
import { Input } from '../components/ui/Input';
import { useState, useEffect } from 'react';

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const { data: results, isLoading } = useSearch(initialQuery);

  useEffect(() => {
    const q = searchParams.get('q') || '';
    setQuery(q);
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setSearchParams({ q: query.trim() });
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
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            icon={<Search size={20} />}
            className="search-input-large"
          />
          <button type="submit" className="btn btn-primary">
            검색
          </button>
        </form>
      </header>

      <div className="search-results">
        {isLoading ? (
          <div className="results-loading">
            <Skeleton height={80} />
            <Skeleton height={80} />
            <Skeleton height={80} />
          </div>
        ) : initialQuery && results ? (
          results.length > 0 ? (
            <>
              <p className="results-count">
                "{initialQuery}"에 대한 검색 결과 {results.length}건
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
              <p>"{initialQuery}"에 대한 문서를 찾을 수 없습니다.</p>
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
