'use client';

/**
 * 커맨드 팔레트 컴포넌트
 * 검색 + 빠른 액션 통합
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  FileText,
  Tag,
  ArrowRight,
  Home,
  X,
} from 'lucide-react';
import { useFocusTrap } from '@/src/hooks/useFocusTrap';
import { useShortcuts } from '@/src/context/ShortcutsContext';
import { formatShortcut } from '@/src/hooks/useKeyboardShortcuts';
import { useWikiPages } from '@/src/hooks/useWiki';

interface CommandItem {
  id: string;
  type: 'page' | 'action' | 'recent';
  title: string;
  subtitle?: string;
  icon: typeof Search;
  action: () => void;
  shortcut?: string;
}

export function CommandPalette() {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { isCommandPaletteOpen, closeCommandPalette } = useShortcuts();
  const router = useRouter();
  const { data: wikiPages = [] } = useWikiPages();

  const containerRef = useFocusTrap<HTMLDivElement>({
    enabled: isCommandPaletteOpen,
    autoFocus: false,
    onEscape: closeCommandPalette,
  });

  // 기본 액션 목록
  const defaultActions: CommandItem[] = useMemo(
    () => [
      {
        id: 'home',
        type: 'action',
        title: '홈으로 이동',
        icon: Home,
        action: () => router.push('/'),
        shortcut: 'G',
      },
      {
        id: 'search',
        type: 'action',
        title: '문서 검색',
        icon: Search,
        action: () => router.push('/search'),
      },
      {
        id: 'tags',
        type: 'action',
        title: '태그 보기',
        icon: Tag,
        action: () => router.push('/tags'),
      },
      {
        id: 'issues',
        type: 'action',
        title: 'Issues 보기',
        icon: FileText,
        action: () => router.push('/issues'),
      },
    ],
    [router]
  );

  // 검색 결과 필터링
  const filteredItems = useMemo(() => {
    const items: CommandItem[] = [];

    if (query.length === 0) {
      // 검색어 없으면 기본 액션만
      return defaultActions;
    }

    const lowerQuery = query.toLowerCase();

    // 위키 페이지 검색 (WikiTree 타입 - title, slug만 사용)
    const matchedPages = wikiPages
      .filter(
        (page): page is typeof page & { slug: string } =>
          !page.isCategory &&
          !!page.slug && (
            page.title?.toLowerCase().includes(lowerQuery) ||
            page.slug.toLowerCase().includes(lowerQuery)
          )
      )
      .slice(0, 5)
      .map((page) => ({
        id: `page-${page.slug}`,
        type: 'page' as const,
        title: page.title || page.slug,
        subtitle: page.slug,
        icon: FileText,
        action: () => router.push(`/wiki/${page.slug}`),
      }));

    items.push(...matchedPages);

    // 액션 검색
    const matchedActions = defaultActions.filter((action) =>
      action.title.toLowerCase().includes(lowerQuery)
    );
    items.push(...matchedActions);

    return items;
  }, [query, wikiPages, defaultActions, router]);

  // 검색어 변경 핸들러 (선택 인덱스도 리셋)
  const handleQueryChange = useCallback((newQuery: string) => {
    setQuery(newQuery);
    setSelectedIndex(0);
  }, []);

  // 닫힐 때 상태 초기화 (다른 핸들러보다 먼저 선언)
  const handleClose = useCallback(() => {
    closeCommandPalette();
    // 애니메이션 후 상태 초기화
    setTimeout(() => {
      setQuery('');
      setSelectedIndex(0);
    }, 200);
  }, [closeCommandPalette]);

  // 키보드 네비게이션
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredItems.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          event.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredItems.length - 1
          );
          break;
        case 'Enter':
          event.preventDefault();
          if (filteredItems[selectedIndex]) {
            filteredItems[selectedIndex].action();
            handleClose();
          }
          break;
      }
    },
    [filteredItems, selectedIndex, handleClose]
  );

  // 아이템 클릭
  const handleItemClick = useCallback(
    (item: CommandItem) => {
      item.action();
      handleClose();
    },
    [handleClose]
  );

  // 열릴 때 입력 필드에 포커스
  useEffect(() => {
    if (isCommandPaletteOpen) {
      const input = document.getElementById('command-palette-input');
      if (input) {
        requestAnimationFrame(() => {
          input.focus();
        });
      }
    }
  }, [isCommandPaletteOpen]);

  if (!isCommandPaletteOpen) {
    return null;
  }

  return (
    <div className="command-palette-overlay" onClick={handleClose}>
      <div
        ref={containerRef}
        className="command-palette"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="커맨드 팔레트"
      >
        {/* 검색 입력 */}
        <div className="command-palette-header">
          <Search className="command-palette-search-icon" size={20} />
          <input
            id="command-palette-input"
            type="text"
            className="command-palette-input"
            placeholder="검색하거나 명령 입력..."
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
          />
          <button
            className="command-palette-close"
            onClick={handleClose}
            aria-label="닫기"
          >
            <X size={16} />
          </button>
        </div>

        {/* 결과 목록 */}
        <div className="command-palette-results" role="listbox">
          {filteredItems.length === 0 ? (
            <div className="command-palette-empty">
              <p>검색 결과가 없습니다</p>
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const Icon = item.icon;
              const isSelected = index === selectedIndex;

              return (
                <div
                  key={item.id}
                  className={`command-palette-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleItemClick(item)}
                  role="option"
                  aria-selected={isSelected}
                >
                  <Icon className="command-palette-item-icon" size={18} />
                  <div className="command-palette-item-content">
                    <span className="command-palette-item-title">{item.title}</span>
                    {item.subtitle && (
                      <span className="command-palette-item-subtitle">
                        {item.subtitle}
                      </span>
                    )}
                  </div>
                  {item.shortcut && (
                    <kbd className="command-palette-item-shortcut">
                      {formatShortcut(item.shortcut)}
                    </kbd>
                  )}
                  <ArrowRight
                    className="command-palette-item-arrow"
                    size={14}
                  />
                </div>
              );
            })
          )}
        </div>

        {/* 하단 힌트 */}
        <div className="command-palette-footer">
          <span>
            <kbd>↑</kbd> <kbd>↓</kbd> 이동
          </span>
          <span>
            <kbd>↵</kbd> 선택
          </span>
          <span>
            <kbd>esc</kbd> 닫기
          </span>
        </div>

        <style jsx>{`
          .command-palette-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: flex-start;
            justify-content: center;
            padding-top: 15vh;
            z-index: 9999;
            animation: overlay-fade-in 0.15s ease-out;
          }

          @keyframes overlay-fade-in {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }

          .command-palette {
            width: 100%;
            max-width: 600px;
            margin: 0 1rem;
            background: var(--color-background);
            border: 1px solid var(--color-border);
            border-radius: 12px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            overflow: hidden;
            animation: palette-slide-in 0.15s ease-out;
          }

          @keyframes palette-slide-in {
            from {
              opacity: 0;
              transform: translateY(-10px) scale(0.98);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }

          .command-palette-header {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.875rem 1rem;
            border-bottom: 1px solid var(--color-border);
          }

          .command-palette-search-icon {
            color: var(--color-text-muted);
            flex-shrink: 0;
          }

          .command-palette-input {
            flex: 1;
            background: transparent;
            border: none;
            outline: none;
            font-size: 1rem;
            color: var(--color-text);
          }

          .command-palette-input::placeholder {
            color: var(--color-text-muted);
          }

          .command-palette-close {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 28px;
            height: 28px;
            border: none;
            background: transparent;
            color: var(--color-text-muted);
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.15s;
          }

          .command-palette-close:hover {
            background: var(--color-background-secondary);
            color: var(--color-text);
          }

          .command-palette-results {
            max-height: 400px;
            overflow-y: auto;
            padding: 0.5rem;
          }

          .command-palette-empty {
            padding: 2rem;
            text-align: center;
            color: var(--color-text-muted);
          }

          .command-palette-item {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.625rem 0.75rem;
            border-radius: 8px;
            cursor: pointer;
            transition: background 0.1s;
          }

          .command-palette-item:hover,
          .command-palette-item.selected {
            background: var(--color-background-secondary);
          }

          .command-palette-item-icon {
            color: var(--color-text-secondary);
            flex-shrink: 0;
          }

          .command-palette-item-content {
            flex: 1;
            min-width: 0;
            display: flex;
            flex-direction: column;
          }

          .command-palette-item-title {
            font-size: 0.875rem;
            font-weight: 500;
            color: var(--color-text);
          }

          .command-palette-item-subtitle {
            font-size: 0.75rem;
            color: var(--color-text-muted);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .command-palette-item-shortcut {
            font-family: var(--font-mono);
            font-size: 0.75rem;
            padding: 0.125rem 0.375rem;
            background: var(--color-background-tertiary);
            border: 1px solid var(--color-border);
            border-radius: 4px;
            color: var(--color-text-secondary);
          }

          .command-palette-item-arrow {
            color: var(--color-text-muted);
            opacity: 0;
            transition: opacity 0.1s;
          }

          .command-palette-item:hover .command-palette-item-arrow,
          .command-palette-item.selected .command-palette-item-arrow {
            opacity: 1;
          }

          .command-palette-footer {
            display: flex;
            justify-content: center;
            gap: 1.5rem;
            padding: 0.625rem 1rem;
            border-top: 1px solid var(--color-border);
            background: var(--color-background-secondary);
            font-size: 0.75rem;
            color: var(--color-text-muted);
          }

          .command-palette-footer kbd {
            font-family: var(--font-mono);
            font-size: 0.625rem;
            padding: 0.125rem 0.25rem;
            background: var(--color-background);
            border: 1px solid var(--color-border);
            border-radius: 3px;
            margin-right: 0.25rem;
          }
        `}</style>
      </div>
    </div>
  );
}

export default CommandPalette;
