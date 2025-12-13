import { type ButtonHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

/**
 * Button 컴포넌트 Props
 * @extends ButtonHTMLAttributes<HTMLButtonElement>
 */
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * 버튼 스타일 변형
   * - `primary`: 주요 액션 버튼 (기본값)
   * - `secondary`: 보조 액션 버튼
   * - `ghost`: 배경 없는 투명 버튼
   * - `danger`: 삭제/위험 액션 버튼
   */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  /**
   * 버튼 크기
   * - `sm`: 작은 크기 (패딩 축소)
   * - `md`: 중간 크기 (기본값)
   * - `lg`: 큰 크기 (패딩 확대)
   */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * 재사용 가능한 버튼 컴포넌트
 *
 * @example
 * // 기본 사용법
 * <Button>클릭</Button>
 *
 * @example
 * // 변형 및 크기 지정
 * <Button variant="secondary" size="lg">큰 보조 버튼</Button>
 *
 * @example
 * // 위험 액션
 * <Button variant="danger" onClick={handleDelete}>삭제</Button>
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={clsx(
          'btn',
          `btn-${variant}`,
          `btn-${size}`,
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
