/**
 * 통합 에러 처리 유틸리티
 * 애플리케이션 전체에서 일관된 에러 처리를 위한 모듈
 */

import type { ApiError, ApiErrorCode } from '@/src/types';

/**
 * 애플리케이션 에러 클래스
 * 구조화된 에러 정보를 포함
 */
export class AppError extends Error {
  code: ApiErrorCode;
  recoverable: boolean;
  statusCode?: number;
  details?: string;
  originalError?: unknown;

  constructor(
    code: ApiErrorCode,
    message: string,
    options?: {
      recoverable?: boolean;
      statusCode?: number;
      details?: string;
      originalError?: unknown;
    }
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.recoverable = options?.recoverable ?? false;
    this.statusCode = options?.statusCode;
    this.details = options?.details;
    this.originalError = options?.originalError;
  }

  toApiError(): ApiError {
    return {
      code: this.code,
      message: this.message,
      recoverable: this.recoverable,
      statusCode: this.statusCode,
      details: this.details,
      originalError: this.originalError,
    };
  }
}

/**
 * API 에러 생성 함수
 */
export function createApiError(
  code: ApiErrorCode,
  message: string,
  options?: Partial<Omit<ApiError, 'code' | 'message'>>
): ApiError {
  return {
    code,
    message,
    recoverable: options?.recoverable ?? false,
    statusCode: options?.statusCode,
    details: options?.details,
    originalError: options?.originalError,
  };
}

/**
 * HTTP 상태 코드에서 에러 코드 추출
 */
export function getErrorCodeFromStatus(status: number): ApiErrorCode {
  switch (status) {
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 429:
      return 'RATE_LIMITED';
    case 500:
    case 502:
    case 503:
    case 504:
      return 'SERVER_ERROR';
    default:
      return 'UNKNOWN';
  }
}

/**
 * 에러 코드에 따른 기본 메시지
 */
export function getDefaultErrorMessage(code: ApiErrorCode): string {
  const messages: Record<ApiErrorCode, string> = {
    NETWORK_ERROR: '네트워크 연결에 실패했습니다. 인터넷 연결을 확인해주세요.',
    NOT_FOUND: '요청한 리소스를 찾을 수 없습니다.',
    UNAUTHORIZED: '로그인이 필요합니다.',
    FORBIDDEN: '접근 권한이 없습니다.',
    RATE_LIMITED: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
    SERVER_ERROR: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    PARSE_ERROR: '데이터 처리 중 오류가 발생했습니다.',
    TIMEOUT: '요청 시간이 초과되었습니다.',
    UNKNOWN: '알 수 없는 오류가 발생했습니다.',
  };
  return messages[code];
}

/**
 * 에러 코드에 따른 복구 가능 여부
 */
export function isRecoverable(code: ApiErrorCode): boolean {
  const recoverableCodes: ApiErrorCode[] = [
    'NETWORK_ERROR',
    'RATE_LIMITED',
    'SERVER_ERROR',
    'TIMEOUT',
  ];
  return recoverableCodes.includes(code);
}

/**
 * unknown 타입의 에러를 ApiError로 변환
 */
export function parseError(error: unknown): ApiError {
  // AppError 인스턴스인 경우
  if (error instanceof AppError) {
    return error.toApiError();
  }

  // fetch Response 객체인 경우
  if (error instanceof Response) {
    const code = getErrorCodeFromStatus(error.status);
    return createApiError(code, getDefaultErrorMessage(code), {
      statusCode: error.status,
      recoverable: isRecoverable(code),
    });
  }

  // Error 객체인 경우
  if (error instanceof Error) {
    // 네트워크 에러 감지
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return createApiError('NETWORK_ERROR', getDefaultErrorMessage('NETWORK_ERROR'), {
        recoverable: true,
        originalError: error,
      });
    }

    // AbortError (타임아웃)
    if (error.name === 'AbortError') {
      return createApiError('TIMEOUT', getDefaultErrorMessage('TIMEOUT'), {
        recoverable: true,
        originalError: error,
      });
    }

    // JSON 파싱 에러
    if (error.name === 'SyntaxError') {
      return createApiError('PARSE_ERROR', getDefaultErrorMessage('PARSE_ERROR'), {
        recoverable: false,
        originalError: error,
      });
    }

    return createApiError('UNKNOWN', error.message || getDefaultErrorMessage('UNKNOWN'), {
      originalError: error,
    });
  }

  // 기타 타입
  return createApiError('UNKNOWN', getDefaultErrorMessage('UNKNOWN'), {
    originalError: error,
  });
}

/**
 * 안전한 fetch 래퍼
 * 타임아웃 및 에러 처리 포함
 */
export async function safeFetch<T>(
  url: string,
  options?: RequestInit & { timeout?: number }
): Promise<{ data: T | null; error: ApiError | null }> {
  const { timeout = 30000, ...fetchOptions } = options || {};

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const code = getErrorCodeFromStatus(response.status);
      return {
        data: null,
        error: createApiError(code, getDefaultErrorMessage(code), {
          statusCode: response.status,
          recoverable: isRecoverable(code),
        }),
      };
    }

    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    clearTimeout(timeoutId);
    return { data: null, error: parseError(error) };
  }
}

/**
 * 에러 로깅 유틸리티
 */
export function logError(error: ApiError, context?: string): void {
  const prefix = context ? `[${context}]` : '';
  console.error(`${prefix} Error [${error.code}]:`, error.message);
  if (error.details) {
    console.error(`${prefix} Details:`, error.details);
  }
  if (error.originalError) {
    console.error(`${prefix} Original:`, error.originalError);
  }
}
