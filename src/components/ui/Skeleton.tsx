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
export function Skeleton({
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
}
