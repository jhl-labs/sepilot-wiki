'use client';

/**
 * 토스트 알림 컴포넌트
 * 에러, 성공, 경고, 정보 메시지를 표시
 */

import { useState } from 'react';
import { X, AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { useError, type Toast, type ToastType } from '@/src/context/ErrorContext';

const TOAST_ICONS: Record<ToastType, typeof AlertCircle> = {
  error: AlertCircle,
  success: CheckCircle,
  warning: AlertTriangle,
  info: Info,
};

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const [isExiting, setIsExiting] = useState(false);
  const Icon = TOAST_ICONS[toast.type];

  const handleRemove = () => {
    setIsExiting(true);
    setTimeout(() => onRemove(toast.id), 200);
  };

  return (
    <div
      className={`toast-item toast-${toast.type} ${isExiting ? 'toast-exit' : ''}`}
      role="alert"
      aria-live="polite"
    >
      <Icon className="toast-icon" size={20} aria-hidden="true" />
      <div className="toast-content">
        <p className="toast-message">{toast.message}</p>
        {toast.details && (
          <p className="toast-details">{toast.details}</p>
        )}
        {toast.action && (
          <button
            onClick={toast.action.onClick}
            className="toast-action"
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        onClick={handleRemove}
        className="toast-close"
        aria-label="알림 닫기"
      >
        <X size={16} />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const { toasts, removeToast } = useError();

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="toast-container" aria-label="알림 목록">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}

      <style jsx global>{`
        .toast-container {
          position: fixed;
          bottom: 1rem;
          right: 1rem;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          max-width: 400px;
          width: 100%;
          pointer-events: none;
        }

        @media (max-width: 480px) {
          .toast-container {
            left: 1rem;
            right: 1rem;
            max-width: none;
          }
        }

        .toast-item {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 0.875rem 1rem;
          border-radius: 8px;
          background: var(--color-background);
          border: 1px solid var(--color-border);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          animation: toast-enter 0.2s ease-out;
          pointer-events: auto;
        }

        .toast-item.toast-exit {
          animation: toast-exit 0.2s ease-in forwards;
        }

        @keyframes toast-enter {
          from {
            opacity: 0;
            transform: translateY(1rem) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes toast-exit {
          from {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          to {
            opacity: 0;
            transform: translateY(-0.5rem) scale(0.95);
          }
        }

        .toast-error {
          border-color: var(--color-error, #ef4444);
        }

        .toast-error .toast-icon {
          color: var(--color-error, #ef4444);
        }

        .toast-success {
          border-color: var(--color-success, #22c55e);
        }

        .toast-success .toast-icon {
          color: var(--color-success, #22c55e);
        }

        .toast-warning {
          border-color: var(--color-warning, #f59e0b);
        }

        .toast-warning .toast-icon {
          color: var(--color-warning, #f59e0b);
        }

        .toast-info {
          border-color: var(--color-info, #3b82f6);
        }

        .toast-info .toast-icon {
          color: var(--color-info, #3b82f6);
        }

        .toast-icon {
          flex-shrink: 0;
          margin-top: 0.125rem;
        }

        .toast-content {
          flex: 1;
          min-width: 0;
        }

        .toast-message {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--color-text);
          margin: 0;
          line-height: 1.4;
        }

        .toast-details {
          font-size: 0.75rem;
          color: var(--color-text-secondary);
          margin: 0.25rem 0 0;
          line-height: 1.4;
        }

        .toast-action {
          display: inline-block;
          margin-top: 0.5rem;
          padding: 0.25rem 0.5rem;
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--color-primary);
          background: transparent;
          border: 1px solid var(--color-primary);
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .toast-action:hover {
          background: var(--color-primary);
          color: white;
        }

        .toast-close {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border: none;
          background: transparent;
          color: var(--color-text-muted);
          cursor: pointer;
          border-radius: 4px;
          transition: all 0.15s;
        }

        .toast-close:hover {
          background: var(--color-background-secondary);
          color: var(--color-text);
        }
      `}</style>
    </div>
  );
}

export default ToastContainer;
