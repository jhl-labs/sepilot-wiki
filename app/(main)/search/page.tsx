'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, FileText, ArrowRight } from 'lucide-react';
import { useSearch } from '@/src/hooks/useWiki';
import { Skeleton } from '@/src/components/ui/Skeleton';
import { Input } from '@/src/components/ui/Input';
import { useState, useEffect } from 'react';

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const searchQuery = searchParams.get('q') || '';
  const [inputValue, setInputValue] = useState(searchQuery);
  const { data: results, isLoading } = useSearch(searchQuery);

  // URL 쿼리가 변경되면 input도 업데이트
  useEffect(() => {
    setInputValue(searchQuery);
  }, [searchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      router.push(`/search?q=${encodeURIComponent(inputValue.trim())}`);
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
