import clsx from 'clsx';
import type { ReactNode, CSSProperties } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'draft' | 'invalid' | 'ai' | 'success' | 'warning';
  className?: string;
  style?: CSSProperties;
}

export function Badge({ children, variant = 'default', className, style }: BadgeProps) {
  return (
    <span className={clsx('badge', `badge-${variant}`, className)} style={style}>
      {children}
    </span>
  );
}
