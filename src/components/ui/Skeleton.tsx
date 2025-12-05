import clsx from 'clsx';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({ className, variant = 'text', width, height, style, ...props }: SkeletonProps) {
  return (
    <div
      className={clsx('skeleton', `skeleton-${variant}`, className)}
      style={{ width, height, ...style }}
      {...props}
    />
  );
}
