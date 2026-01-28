import { type ButtonHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

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
  /**
   * 로딩 상태 표시
   * true일 때 스피너가 표시되고 버튼이 비활성화됨
   */
  loading?: boolean;
  /**
   * 로딩 중 표시할 텍스트
   */
  loadingText?: string;
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
 *
 * @example
 * // 로딩 상태
 * <Button loading loadingText="저장 중...">저장</Button>
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, loadingText, disabled, children, ...props }, ref) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        className={clsx(
          'btn',
          `btn-${variant}`,
          size !== 'md' && `btn-${size}`,
          loading && 'btn-loading',
          className
        )}
        disabled={isDisabled}
        aria-disabled={isDisabled || undefined}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && (
          <Loader2
            size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16}
            className="btn-spinner"
            aria-hidden="true"
          />
        )}
        <span className={loading ? 'btn-text-loading' : undefined}>
          {loading && loadingText ? loadingText : children}
        </span>
      </button>
    );
  }
);

Button.displayName = 'Button';
