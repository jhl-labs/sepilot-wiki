'use client';

/**
 * Virtual Scrolling 리스트 컴포넌트
 * 대량의 아이템을 효율적으로 렌더링
 */

import { useRef, type ReactNode } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

interface VirtualListProps<T> {
  // 아이템 목록
  items: T[];
  // 예상 아이템 높이 (px)
  estimateSize: number;
  // 아이템 렌더링 함수
  renderItem: (item: T, index: number) => ReactNode;
  // 컨테이너 높이 (기본: 400px)
  height?: number | string;
  // 오버스캔 (뷰포트 밖에 미리 렌더링할 아이템 수)
  overscan?: number;
  // 빈 목록 메시지
  emptyMessage?: ReactNode;
  // 컨테이너 클래스
  className?: string;
  // 아이템 클래스
  itemClassName?: string;
  // 아이템 키 추출 함수
  getItemKey?: (item: T, index: number) => string | number;
}

export function VirtualList<T>({
  items,
  estimateSize,
  renderItem,
  height = 400,
  overscan = 5,
  emptyMessage = '항목이 없습니다',
  className = '',
  itemClassName = '',
  getItemKey,
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
    getItemKey: getItemKey
      ? (index) => getItemKey(items[index], index)
      : undefined,
  });

  const virtualItems = virtualizer.getVirtualItems();

  if (items.length === 0) {
    return (
      <div className={`virtual-list-empty ${className}`}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className={`virtual-list-container ${className}`}
      style={{
        height: typeof height === 'number' ? `${height}px` : height,
        overflow: 'auto',
      }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualItem) => {
          const item = items[virtualItem.index];
          return (
            <div
              key={virtualItem.key}
              className={`virtual-list-item ${itemClassName}`}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
              data-index={virtualItem.index}
            >
              {renderItem(item, virtualItem.index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 윈도우 기반 Virtual Scrolling
 * 페이지 전체 스크롤에 반응
 */
export function WindowVirtualList<T>({
  items,
  estimateSize,
  renderItem,
  overscan = 5,
  emptyMessage = '항목이 없습니다',
  className = '',
  itemClassName = '',
  getItemKey,
}: Omit<VirtualListProps<T>, 'height'>) {
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () =>
      typeof document !== 'undefined' ? document.documentElement : null,
    estimateSize: () => estimateSize,
    overscan,
    getItemKey: getItemKey
      ? (index) => getItemKey(items[index], index)
      : undefined,
  });

  const virtualItems = virtualizer.getVirtualItems();

  if (items.length === 0) {
    return (
      <div className={`virtual-list-empty ${className}`}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      className={`window-virtual-list ${className}`}
      style={{
        height: `${virtualizer.getTotalSize()}px`,
        width: '100%',
        position: 'relative',
      }}
    >
      {virtualItems.map((virtualItem) => {
        const item = items[virtualItem.index];
        return (
          <div
            key={virtualItem.key}
            className={`virtual-list-item ${itemClassName}`}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualItem.start}px)`,
            }}
            data-index={virtualItem.index}
          >
            {renderItem(item, virtualItem.index)}
          </div>
        );
      })}
    </div>
  );
}

export default VirtualList;
