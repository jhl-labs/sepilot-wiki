/**
 * API 요청 재시도 유틸리티
 * 지수 백오프(Exponential Backoff) 전략 사용
 */

export interface RetryOptions {
  /** 최대 재시도 횟수 (기본값: 3) */
  maxRetries?: number;
  /** 초기 지연 시간 (ms, 기본값: 1000) */
  initialDelay?: number;
  /** 최대 지연 시간 (ms, 기본값: 30000) */
  maxDelay?: number;
  /** 지연 시간 배수 (기본값: 2) */
  backoffMultiplier?: number;
  /** 재시도 가능 여부 판단 함수 */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  /** 재시도 전 콜백 */
  onRetry?: (error: unknown, attempt: number, delay: number) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  shouldRetry: defaultShouldRetry,
  onRetry: () => {},
};

/**
 * 기본 재시도 판단 함수
 * 네트워크 에러, 5xx 에러, 429 (Rate Limit) 에러만 재시도
 */
function defaultShouldRetry(error: unknown, _attempt: number): boolean {
  // 네트워크 에러
  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    return true;
  }

  // HTTP 에러 응답
  if (error instanceof Response) {
    const status = error.status;
    // 5xx 서버 에러 또는 429 Rate Limit
    return status >= 500 || status === 429;
  }

  // ApiServiceError (커스텀 에러)
  if (error && typeof error === 'object' && 'recoverable' in error) {
    return (error as { recoverable: boolean }).recoverable;
  }

  return false;
}

/**
 * 지연 시간 계산 (지수 백오프 + 지터)
 */
function calculateDelay(
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  backoffMultiplier: number
): number {
  // 지수 백오프
  const exponentialDelay = initialDelay * Math.pow(backoffMultiplier, attempt - 1);
  // 최대값 제한
  const boundedDelay = Math.min(exponentialDelay, maxDelay);
  // 지터 추가 (0.5 ~ 1.5 배)
  const jitter = 0.5 + Math.random();
  return Math.floor(boundedDelay * jitter);
}

/**
 * 지정된 시간만큼 대기
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 재시도 가능한 비동기 함수 실행
 *
 * @example
 * const result = await withRetry(
 *   () => fetch('/api/data'),
 *   { maxRetries: 3, initialDelay: 1000 }
 * );
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts: Required<RetryOptions> = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;

  for (let attempt = 1; attempt <= opts.maxRetries + 1; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // 마지막 시도였거나 재시도 불가능한 에러면 바로 throw
      if (attempt > opts.maxRetries || !opts.shouldRetry(error, attempt)) {
        throw error;
      }

      // 재시도 전 지연
      const delay = calculateDelay(
        attempt,
        opts.initialDelay,
        opts.maxDelay,
        opts.backoffMultiplier
      );

      opts.onRetry(error, attempt, delay);
      await sleep(delay);
    }
  }

  // 이론적으로 여기 도달하지 않지만 TypeScript를 위해 추가
  throw lastError;
}

/**
 * fetch 함수를 재시도 가능하게 래핑
 *
 * @example
 * const response = await fetchWithRetry('/api/data', {
 *   method: 'GET',
 * }, { maxRetries: 3 });
 */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  retryOptions?: RetryOptions
): Promise<Response> {
  return withRetry(async () => {
    const response = await fetch(input, init);

    // 성공 응답이 아니면 재시도 판단을 위해 에러 throw
    if (!response.ok) {
      const retryable = response.status >= 500 || response.status === 429;
      if (retryable) {
        throw response;
      }
    }

    return response;
  }, {
    ...retryOptions,
    shouldRetry: (error) => {
      // 네트워크 에러
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        return true;
      }
      // HTTP 에러 응답
      if (error instanceof Response) {
        return error.status >= 500 || error.status === 429;
      }
      return false;
    },
  });
}

/**
 * 재시도 상태 추적을 위한 타입
 */
export interface RetryState {
  attempt: number;
  totalAttempts: number;
  lastError: unknown | null;
  isRetrying: boolean;
}

/**
 * 초기 재시도 상태
 */
export const initialRetryState: RetryState = {
  attempt: 0,
  totalAttempts: 0,
  lastError: null,
  isRetrying: false,
};
