import { type InputHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

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
