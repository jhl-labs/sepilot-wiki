'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Search,
  LayoutGrid,
  List,
  Calendar,
} from 'lucide-react';
import { format } from 'date-fns';
import { useWikiPages } from '@/src/hooks/useWiki';
import { Skeleton } from '@/src/components/ui/Skeleton';
import { Input } from '@/src/components/ui/Input';
import clsx from 'clsx';
import type { WikiTree } from '@/src/types';

// 트리 구조에서 모든 페이지 추출 (재귀)
function flattenPages(tree: WikiTree[]): WikiTree[] {
  const result: WikiTree[] = [];
  for (const item of tree) {
    if (item.slug) {
      result.push(item);
    }
    if (item.children && item.children.length > 0) {
      result.push(...flattenPages(item.children));
    }
  }
  return result;
}

// 트리 아이템 컴포넌트
function TreeItem({
  item,
  depth = 0,
  searchQuery,
}: {
  item: WikiTree;
  depth?: number;
  searchQuery: string;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = item.children && item.children.length > 0;
  const paddingLeft = depth > 0 ? `${depth * 1.5}rem` : undefined;

  // 검색어가 있으면 매칭되는 항목만 표시
  if (searchQuery) {
    const matchesSearch = (node: WikiTree): boolean => {
      const titleMatch = node.title?.toLowerCase().includes(searchQuery.toLowerCase());
      const nameMatch = node.name?.toLowerCase().includes(searchQuery.toLowerCase());
      if (titleMatch || nameMatch) return true;
      if (node.children) {
        return node.children.some(matchesSearch);
      }
      return false;
    };
    if (!matchesSearch(item)) return null;
  }

  // 카테고리(폴더)인 경우
  if (item.isCategory) {
    return (
      <div className="wiki-tree-category">
        <button
          className="wiki-tree-category-header"
          style={{ paddingLeft }}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <FolderOpen size={16} />
          <span>{item.name}</span>
          {hasChildren && (
            <span className="wiki-tree-count">{item.children!.length}</span>
          )}
        </button>
        {isExpanded && hasChildren && (
          <div className="wiki-tree-children">
            {item.children!.map((child) => (
              <TreeItem
                key={child.slug || child.path}
                item={child}
                depth={depth + 1}
                searchQuery={searchQuery}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // 페이지인 경우
  return (
    <Link
      href={`/wiki/${item.slug}`}
      className="wiki-tree-page"
      style={{ paddingLeft }}
    >
      <FileText size={16} />
      <span>{item.menu || item.title || item.slug}</span>
      {item.lastModified && (
        <span className="wiki-tree-date">
          {format(new Date(item.lastModified), 'yyyy.MM.dd')}
        </span>
      )}
    </Link>
  );
}

export default function WikiIndexPage() {
  const { data: pages, isLoading } = useWikiPages();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('tree');

  const allPages = pages ? flattenPages(pages) : [];
  const filteredPages = searchQuery
    ? allPages.filter(
        (page) =>
          page.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          page.slug?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allPages;

  return (
    <div className="wiki-index-page">
      <header className="wiki-index-header">
        <div className="header-content">
          <h1>
            <FileText size={28} />
            <span>전체 문서</span>
          </h1>
          <p className="header-description">
            {allPages.length}개의 문서가 있습니다
          </p>
        </div>
        <div className="header-controls">
          <Input
            type="search"
            placeholder="문서 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search size={18} />}
            className="wiki-search-input"
          />
          <div className="view-toggle">
            <button
              className={clsx('view-toggle-btn', viewMode === 'tree' && 'active')}
              onClick={() => setViewMode('tree')}
              title="트리 보기"
            >
              <LayoutGrid size={18} />
            </button>
            <button
              className={clsx('view-toggle-btn', viewMode === 'list' && 'active')}
              onClick={() => setViewMode('list')}
              title="목록 보기"
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </header>

      <div className="wiki-index-content">
        {isLoading ? (
          <div className="wiki-loading">
            <Skeleton height={48} />
            <Skeleton height={48} />
            <Skeleton height={48} />
            <Skeleton height={48} />
            <Skeleton height={48} />
          </div>
        ) : viewMode === 'tree' ? (
          <div className="wiki-tree-view">
            {pages && pages.length > 0 ? (
              pages.map((item) => (
                <TreeItem
                  key={item.slug || item.path}
                  item={item}
                  searchQuery={searchQuery}
                />
              ))
            ) : (
              <div className="wiki-empty">
                <FileText size={48} />
                <h3>문서가 없습니다</h3>
                <p>아직 작성된 문서가 없습니다.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="wiki-list-view">
            {filteredPages.length > 0 ? (
              filteredPages.map((page) => (
                <Link
                  key={page.slug}
                  href={`/wiki/${page.slug}`}
                  className="wiki-list-item"
                >
                  <FileText size={18} />
                  <div className="wiki-list-item-content">
                    <span className="wiki-list-title">{page.title}</span>
                    <span className="wiki-list-slug">{page.slug}</span>
                  </div>
                  {page.lastModified && (
                    <span className="wiki-list-date">
                      <Calendar size={14} />
                      {format(new Date(page.lastModified), 'yyyy.MM.dd')}
                    </span>
                  )}
                  <ChevronRight size={18} />
                </Link>
              ))
            ) : (
              <div className="wiki-empty">
                <Search size={48} />
                <h3>검색 결과가 없습니다</h3>
                <p>"{searchQuery}"에 대한 문서를 찾을 수 없습니다.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
