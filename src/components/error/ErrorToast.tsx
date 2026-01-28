/**
 * 토스트 알림 컴포넌트
 * 에러, 성공, 경고, 정보 메시지를 표시
 */

import { useState } from 'react';
import { X, AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { useError, type Toast, type ToastType } from '../../context/ErrorContext';

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
    </div>
  );
}

export default ToastContainer;
