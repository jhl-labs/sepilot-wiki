import { memo } from 'react';
import clsx from 'clsx';

/**
 * Skeleton 컴포넌트 Props
 * @extends React.HTMLAttributes<HTMLDivElement>
 */
interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  /**
   * 스켈레톤 형태
   * - `text`: 텍스트 라인 형태 (기본값)
   * - `circular`: 원형 (아바타 등)
   * - `rectangular`: 사각형 (이미지, 카드 등)
   */
  variant?: 'text' | 'circular' | 'rectangular';
  /** 너비 (px 또는 CSS 문자열) */
  width?: string | number;
  /** 높이 (px 또는 CSS 문자열) */
  height?: string | number;
  /** 스크린 리더를 위한 라벨 */
  label?: string;
}

/**
 * 로딩 상태를 표시하는 스켈레톤 컴포넌트
 *
 * 콘텐츠가 로딩되는 동안 placeholder로 사용됩니다.
 * 애니메이션 효과가 포함되어 있습니다.
 * reduced-motion 미디어 쿼리를 지원합니다.
 *
 * @example
 * // 텍스트 라인 스켈레톤
 * <Skeleton width="100%" height={20} />
 *
 * @example
 * // 아바타 스켈레톤
 * <Skeleton variant="circular" width={40} height={40} />
 *
 * @example
 * // 이미지 카드 스켈레톤
 * <Skeleton variant="rectangular" width="100%" height={200} />
 *
 * @example
 * // 접근성 라벨과 함께
 * <Skeleton label="프로필 이미지 로딩 중" variant="circular" />
 */
export const Skeleton = memo(function Skeleton({
  className,
  variant = 'text',
  width,
  height,
  style,
  label = '콘텐츠 로딩 중',
  ...props
}: SkeletonProps) {
  return (
    <div
      className={clsx('skeleton', `skeleton-${variant}`, className)}
      style={{ width, height, ...style }}
      role="progressbar"
      aria-busy="true"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      {...props}
    />
  );
});

Skeleton.displayName = 'Skeleton';

/**
 * 스켈레톤 표준 높이 (일관성 유지)
 */
export const SKELETON_HEIGHTS = {
  /** 텍스트 한 줄 (16px) */
  text: 16,
  /** 제목 (24px) */
  title: 24,
  /** 카드/아이템 (60px) */
  card: 60,
  /** 검색 결과 아이템 (80px) */
  searchResult: 80,
  /** 이미지/차트 (150px) */
  media: 150,
} as const;

/**
 * SkeletonList Props
 */
interface SkeletonListProps {
  /** 스켈레톤 개수 */
  count?: number;
  /** 스켈레톤 높이 (preset 또는 숫자) */
  height?: keyof typeof SKELETON_HEIGHTS | number;
  /** 스켈레톤 간격 */
  gap?: number;
  /** 컨테이너 클래스 */
  className?: string;
  /** 접근성 라벨 */
  label?: string;
}

/**
 * 일관된 스켈레톤 리스트 컴포넌트
 *
 * @example
 * // 검색 결과 스켈레톤 (3개)
 * <SkeletonList count={3} height="searchResult" />
 *
 * @example
 * // 카드 스켈레톤 (5개, 커스텀 높이)
 * <SkeletonList count={5} height={100} gap={12} />
 */
export const SkeletonList = memo(function SkeletonList({
  count = 3,
  height = 'card',
  gap = 8,
  className = '',
  label = '목록 로딩 중',
}: SkeletonListProps) {
  const heightValue = typeof height === 'number'
    ? height
    : SKELETON_HEIGHTS[height];

  return (
    <div
      className={`skeleton-list ${className}`}
      style={{ display: 'flex', flexDirection: 'column', gap }}
      role="status"
      aria-label={label}
    >
      {Array.from({ length: count }, (_, index) => (
        <Skeleton
          key={index}
          height={heightValue}
          label={`${label} ${index + 1}/${count}`}
        />
      ))}
    </div>
  );
});

SkeletonList.displayName = 'SkeletonList';
