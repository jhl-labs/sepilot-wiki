import { type InputHTMLAttributes, forwardRef, useId } from 'react';
import clsx from 'clsx';

/**
 * Input 컴포넌트 Props
 * @extends InputHTMLAttributes<HTMLInputElement>
 */
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /**
   * 입력창 왼쪽에 표시될 아이콘
   * lucide-react 아이콘 컴포넌트 등을 전달
   */
  icon?: React.ReactNode;
  /**
   * 에러 상태 여부
   */
  error?: boolean;
  /**
   * 에러 메시지 (error가 true일 때 표시)
   */
  errorMessage?: string;
  /**
   * 도움말 텍스트 (에러가 없을 때 표시)
   */
  helperText?: string;
  /**
   * 필수 입력 필드 라벨 표시
   */
  label?: string;
}

/**
 * 재사용 가능한 입력 필드 컴포넌트
 *
 * 아이콘과 함께 사용하여 시각적 힌트를 제공할 수 있습니다.
 * 에러 상태와 접근성 지원을 포함합니다.
 *
 * @example
 * // 기본 사용법
 * <Input placeholder="이름을 입력하세요" />
 *
 * @example
 * // 아이콘과 함께 사용
 * <Input icon={<Search size={16} />} placeholder="검색..." />
 *
 * @example
 * // 에러 상태
 * <Input error errorMessage="유효한 이메일을 입력하세요" />
 *
 * @example
 * // 라벨과 도움말
 * <Input label="이메일" helperText="회사 이메일을 입력하세요" required />
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, icon, error, errorMessage, helperText, label, id, required, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    const hasError = error || !!errorMessage;
    const describedBy = hasError ? errorId : helperText ? helperId : undefined;

    return (
      <div className={clsx('input-container', className)}>
        {label && (
          <label htmlFor={inputId} className="input-label">
            {label}
            {required && <span className="input-required" aria-hidden="true">*</span>}
          </label>
        )}
        <div className={clsx('input-wrapper', hasError && 'input-wrapper-error')}>
          {icon && <span className="input-icon" aria-hidden="true">{icon}</span>}
          <input
            ref={ref}
            id={inputId}
            className={clsx('input', icon && 'input-with-icon', hasError && 'input-error')}
            aria-invalid={hasError || undefined}
            aria-describedby={describedBy}
            aria-required={required || undefined}
            required={required}
            {...props}
          />
        </div>
        {hasError && errorMessage && (
          <span id={errorId} className="input-error-message" role="alert">
            {errorMessage}
          </span>
        )}
        {!hasError && helperText && (
          <span id={helperId} className="input-helper-text">
            {helperText}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
