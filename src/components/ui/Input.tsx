import { type InputHTMLAttributes, forwardRef } from 'react';
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
}

/**
 * 재사용 가능한 입력 필드 컴포넌트
 *
 * 아이콘과 함께 사용하여 시각적 힌트를 제공할 수 있습니다.
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
 * // 비밀번호 입력
 * <Input type="password" icon={<Lock size={16} />} />
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, icon, ...props }, ref) => {
    return (
      <div className={clsx('input-wrapper', className)}>
        {icon && <span className="input-icon">{icon}</span>}
        <input ref={ref} className={clsx('input', icon && 'input-with-icon')} {...props} />
      </div>
    );
  }
);

Input.displayName = 'Input';
