'use client';

/**
 * 에러 상태 관리 Context
 * 전역 에러 상태 및 토스트 알림 관리
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { ApiError, ApiErrorCode } from '@/src/types';
import { createApiError, getDefaultErrorMessage, isRecoverable } from '@/lib/errors';

export type ToastType = 'error' | 'success' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  details?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ErrorContextType {
  // 에러 상태
  errors: ApiError[];
  // 토스트 목록
  toasts: Toast[];
  // 에러 추가
  addError: (error: ApiError) => void;
  // 에러 코드로 에러 추가
  addErrorByCode: (code: ApiErrorCode, message?: string) => void;
  // 에러 제거
  removeError: (index: number) => void;
  // 모든 에러 제거
  clearErrors: () => void;
  // 토스트 추가
  showToast: (toast: Omit<Toast, 'id'>) => void;
  // 토스트 제거
  removeToast: (id: string) => void;
  // 간편 토스트 함수들
  showError: (message: string, details?: string) => void;
  showSuccess: (message: string) => void;
  showWarning: (message: string) => void;
  showInfo: (message: string) => void;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

interface ErrorProviderProps {
  children: ReactNode;
}

export function ErrorProvider({ children }: ErrorProviderProps) {
  const [errors, setErrors] = useState<ApiError[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // 토스트 ID 생성
  const generateToastId = useCallback(() => {
    return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }, []);

  // 에러 추가
  const addError = useCallback((error: ApiError) => {
    setErrors((prev) => [...prev, error]);
  }, []);

  // 에러 코드로 에러 추가
  const addErrorByCode = useCallback((code: ApiErrorCode, message?: string) => {
    const error = createApiError(
      code,
      message || getDefaultErrorMessage(code),
      { recoverable: isRecoverable(code) }
    );
    addError(error);
  }, [addError]);

  // 에러 제거
  const removeError = useCallback((index: number) => {
    setErrors((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // 모든 에러 제거
  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  // 토스트 추가
  const showToast = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = generateToastId();
      const newToast: Toast = { ...toast, id };
      setToasts((prev) => [...prev, newToast]);

      // 자동 제거 (기본 5초)
      const duration = toast.duration ?? 5000;
      if (duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, duration);
      }
    },
    [generateToastId]
  );

  // 토스트 제거
  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // 간편 토스트 함수들
  const showError = useCallback(
    (message: string, details?: string) => {
      showToast({ type: 'error', message, details, duration: 7000 });
    },
    [showToast]
  );

  const showSuccess = useCallback(
    (message: string) => {
      showToast({ type: 'success', message, duration: 3000 });
    },
    [showToast]
  );

  const showWarning = useCallback(
    (message: string) => {
      showToast({ type: 'warning', message, duration: 5000 });
    },
    [showToast]
  );

  const showInfo = useCallback(
    (message: string) => {
      showToast({ type: 'info', message, duration: 4000 });
    },
    [showToast]
  );

  const value: ErrorContextType = {
    errors,
    toasts,
    addError,
    addErrorByCode,
    removeError,
    clearErrors,
    showToast,
    removeToast,
    showError,
    showSuccess,
    showWarning,
    showInfo,
  };

  return (
    <ErrorContext.Provider value={value}>{children}</ErrorContext.Provider>
  );
}

export function useError() {
  const context = useContext(ErrorContext);
  if (context === undefined) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
}
