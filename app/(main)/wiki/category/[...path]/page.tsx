'use client';

import { use, useState, useMemo } from 'react';
import Link from 'next/link';
import { useWikiPages } from '@/src/hooks/useWiki';
import { Breadcrumb } from '@/src/components/wiki';
import { Skeleton } from '@/src/components/ui/Skeleton';
import { Search, FileText, Folder, ChevronRight } from 'lucide-react';
import type { WikiTree } from '@/src/types';

interface CategoryPageProps {
  params: Promise<{ path: string[] }>;
}

interface FlatPage {
  title: string;
  slug: string;
  menu?: string;
  path: string[];
  depth: number;
}

// 현재 카테고리 찾기 (컴포넌트 외부에 정의하여 재귀 호출 가능)
function findCategory(pages: WikiTree[], targetPath: string): WikiTree | null {
  for (const page of pages) {
    if (page.isCategory && page.path === targetPath) {
      return page;
    }
    if (page.children) {
      const found = findCategory(page.children, targetPath);
      if (found) return found;
    }
  }
  return null;
}

// 카테고리 내 모든 페이지를 flat하게 추출 (depth 무관)
function flattenPages(
  items: WikiTree[],
  currentPath: string[] = [],
  depth = 0
): FlatPage[] {
  const result: FlatPage[] = [];

  for (const item of items) {
    if (item.isCategory) {
      // 카테고리인 경우 하위 항목만 추가
      if (item.children) {
        const newPath = [...currentPath, item.name || item.path || ''];
        result.push(...flattenPages(item.children, newPath, depth + 1));
      }
    } else if (item.slug) {
      // 페이지인 경우
      result.push({
        title: item.title || item.slug,
        slug: item.slug,
        menu: item.menu,
        path: currentPath,
        depth,
      });
    }
  }

  return result;
}

export default function CategoryPage({ params }: CategoryPageProps) {
  const resolvedParams = use(params);
  const categoryPath = resolvedParams.path?.join('/') || '';
  const { data: wikiPages, isLoading } = useWikiPages();
  const [searchQuery, setSearchQuery] = useState('');

  const category = useMemo(() => {
    if (!wikiPages) return null;
    return findCategory(wikiPages, categoryPath);
  }, [wikiPages, categoryPath]);

  const allPages = useMemo(() => {
    if (!category?.children) return [];
    return flattenPages(category.children);
  }, [category]);

  // 검색 필터링
  const filteredPages = useMemo(() => {
    if (!searchQuery.trim()) return allPages;

    const query = searchQuery.toLowerCase();
    return allPages.filter(
      (page) =>
        page.title.toLowerCase().includes(query) ||
        page.slug.toLowerCase().includes(query) ||
        (page.menu && page.menu.toLowerCase().includes(query)) ||
        page.path.some((p) => p.toLowerCase().includes(query))
    );
  }, [allPages, searchQuery]);

  // 카테고리 이름 파싱 (경로에서 마지막 부분)
  const categoryName = category?.name || categoryPath.split('/').pop() || categoryPath;

  // 브레드크럼 생성
  const breadcrumbItems = useMemo(() => {
    const pathParts = categoryPath.split('/').filter(Boolean);
    const items = [{ title: '문서', slug: undefined }];

    let accumulatedPath = '';
    for (const part of pathParts) {
      accumulatedPath = accumulatedPath ? `${accumulatedPath}/${part}` : part;
      items.push({ title: part, slug: `/wiki/category/${accumulatedPath}` });
    }

    return items;
  }, [categoryPath]);

  if (isLoading) {
    return (
      <div className="category-page">
        <div className="category-content">
          <Skeleton className="breadcrumb-skeleton" width={200} height={20} />
          <Skeleton className="title-skeleton" width="40%" height={40} />
          <Skeleton className="search-skeleton" width="100%" height={48} />
          <div className="table-skeleton">
            <Skeleton height={48} />
            <Skeleton height={48} />
            <Skeleton height={48} />
            <Skeleton height={48} />
            <Skeleton height={48} />
          </div>
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="category-page">
        <div className="error-state">
          <Folder size={48} />
          <h2>카테고리를 찾을 수 없습니다</h2>
          <p>요청하신 카테고리가 존재하지 않습니다.</p>
          <Link href="/" className="btn btn-primary">
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="category-page">
      <div className="category-content">
        <Breadcrumb items={breadcrumbItems} />

        <header className="category-header">
          <div className="category-title-row">
            <Folder size={32} className="category-icon" />
            <h1 className="category-title">{categoryName}</h1>
          </div>
          <p className="category-description">
            이 카테고리에는 {allPages.length}개의 문서가 있습니다.
          </p>
        </header>

        <div className="category-search">
          <div className="search-input-wrapper">
            <Search size={20} className="search-icon" />
            <input
              type="text"
              placeholder="문서 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
              aria-label="카테고리 내 문서 검색"
            />
            {searchQuery && (
              <button
                className="search-clear"
                onClick={() => setSearchQuery('')}
                aria-label="검색어 지우기"
              >
                &times;
              </button>
            )}
          </div>
          {searchQuery && (
            <p className="search-result-count">
              {filteredPages.length}개의 문서를 찾았습니다
            </p>
          )}
        </div>

        <div className="category-table-wrapper">
          <table className="category-table">
            <thead>
              <tr>
                <th className="col-title">문서 제목</th>
                <th className="col-path">경로</th>
              </tr>
            </thead>
            <tbody>
              {filteredPages.length === 0 ? (
                <tr>
                  <td colSpan={2} className="empty-message">
                    {searchQuery
                      ? '검색 결과가 없습니다.'
                      : '이 카테고리에 문서가 없습니다.'}
                  </td>
                </tr>
              ) : (
                filteredPages.map((page) => (
                  <tr key={page.slug}>
                    <td className="col-title">
                      <Link
                        href={`/wiki/${page.slug}`}
                        className="page-link"
                      >
                        <FileText size={16} className="page-icon" />
                        <span className="page-title">
                          {page.menu || page.title}
                        </span>
                      </Link>
                    </td>
                    <td className="col-path">
                      <div className="path-breadcrumb">
                        {page.path.length > 0 ? (
                          page.path.map((part, idx) => (
                            <span key={idx} className="path-part">
                              {idx > 0 && (
                                <ChevronRight size={12} className="path-separator" />
                              )}
                              <span>{part}</span>
                            </span>
                          ))
                        ) : (
                          <span className="path-root">루트</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filteredPages.length > 0 && (
          <div className="category-footer">
            <span className="page-count">
              총 {filteredPages.length}개 문서
              {searchQuery && ` (전체 ${allPages.length}개 중)`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
