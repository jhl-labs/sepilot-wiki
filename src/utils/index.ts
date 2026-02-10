/**
 * 공통 유틸리티 함수
 */

/**
 * 슬러그를 사람이 읽기 쉬운 제목으로 변환
 * @example formatTitle('hello-world') => 'Hello World'
 * @example formatTitle('api_docs') => 'Api Docs'
 */
export function formatTitle(slug: string): string {
  return slug
    .replace(/-/g, ' ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * 제목을 URL-safe 슬러그로 변환
 * @example slugify('Hello World') => 'hello-world'
 * @example slugify('API 문서') => 'api-문서'
 */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/**
 * 날짜를 상대적 시간으로 표시
 * @example formatRelativeTime(new Date()) => '방금 전'
 */
export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const target = typeof date === 'string' ? new Date(date) : date;
  const diffMs = now.getTime() - target.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  if (diffDay < 7) return `${diffDay}일 전`;

  return target.toLocaleDateString('ko-KR');
}

/**
 * 마크다운에서 순수 텍스트만 추출
 */
export function extractPlainText(markdown: string): string {
  let text = markdown
    .replace(/```[\s\S]*?```/g, '') // 코드 블록 제거
    .replace(/`[^`]+`/g, '') // 인라인 코드 제거
    .replace(/!\[.*?\]\(.*?\)/g, '') // 이미지 제거
    .replace(/\[([^\]]+)\]\(.*?\)/g, '$1'); // 링크에서 텍스트만
  // 루프 기반 HTML 태그 제거 (중첩/변형 태그 방지)
  let prev: string;
  do {
    prev = text;
    text = text.replace(/<script\b[^>]*>[\s\S]*?<\/script[^>]*>/gi, '');
    text = text.replace(/<style\b[^>]*>[\s\S]*?<\/style[^>]*>/gi, '');
    text = text.replace(/<[^>]+>/g, '');
  } while (text !== prev);
  return text
    .replace(/^#+\s*/gm, '') // 헤더 기호 제거
    .replace(/[*_~]{1,3}([^*_~]+)[*_~]{1,3}/g, '$1') // 굵게/기울임 제거
    .replace(/^>\s*/gm, '') // 인용문 기호 제거
    .replace(/^[-*+]\s+/gm, '') // 리스트 기호 제거
    .replace(/^\d+\.\s+/gm, '') // 숫자 리스트 제거
    .replace(/^[-*_]{3,}$/gm, '') // 구분선 제거
    .replace(/\|/g, ' ') // 테이블 구분자 제거
    .replace(/\n{2,}/g, '\n') // 여러 줄바꿈 정리
    .trim();
}

/**
 * 문자열을 지정된 길이로 자르고 말줄임표 추가
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength).trim() + '...';
}

import type { ApiError, ApiErrorCode } from '../types';

/**
 * 구조화된 API 에러 생성 헬퍼 함수
 * @param code - 에러 코드
 * @param message - 사용자 표시용 메시지
 * @param options - 추가 옵션 (details, recoverable, statusCode, originalError)
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
    ...options,
  };
}

/**
 * HTTP 응답에서 API 에러 생성
 * @param response - fetch Response 객체
 * @param originalError - 원본 에러 (있는 경우)
 */
export function createApiErrorFromResponse(
  response: Response,
  originalError?: unknown
): ApiError {
  const statusCode = response.status;

  const errorMap: Record<number, { code: ApiErrorCode; message: string; recoverable: boolean }> = {
    400: { code: 'PARSE_ERROR', message: '잘못된 요청입니다.', recoverable: false },
    401: { code: 'UNAUTHORIZED', message: '인증이 필요합니다.', recoverable: false },
    403: { code: 'FORBIDDEN', message: '접근 권한이 없습니다.', recoverable: false },
    404: { code: 'NOT_FOUND', message: '요청한 리소스를 찾을 수 없습니다.', recoverable: false },
    429: { code: 'RATE_LIMITED', message: '요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.', recoverable: true },
    500: { code: 'SERVER_ERROR', message: '서버 오류가 발생했습니다.', recoverable: true },
    502: { code: 'SERVER_ERROR', message: '서버가 응답하지 않습니다.', recoverable: true },
    503: { code: 'SERVER_ERROR', message: '서비스를 일시적으로 사용할 수 없습니다.', recoverable: true },
    504: { code: 'TIMEOUT', message: '요청 시간이 초과되었습니다.', recoverable: true },
  };

  const errorInfo = errorMap[statusCode] ?? {
    code: 'UNKNOWN' as ApiErrorCode,
    message: `알 수 없는 오류가 발생했습니다. (${statusCode})`,
    recoverable: false,
  };

  return {
    ...errorInfo,
    statusCode,
    details: response.statusText,
    originalError,
  };
}

/**
 * 네트워크 에러인지 확인
 */
export function isNetworkError(error: unknown): boolean {
  return error instanceof TypeError && error.message === 'Failed to fetch';
}

/**
 * catch된 에러에서 API 에러 생성
 * @param error - catch된 에러
 */
export function createApiErrorFromCatch(error: unknown): ApiError {
  if (isNetworkError(error)) {
    return {
      code: 'NETWORK_ERROR',
      message: '네트워크 연결을 확인해주세요.',
      recoverable: true,
      originalError: error,
    };
  }

  if (error instanceof Error) {
    return {
      code: 'UNKNOWN',
      message: error.message || '알 수 없는 오류가 발생했습니다.',
      recoverable: false,
      details: error.stack,
      originalError: error,
    };
  }

  return {
    code: 'UNKNOWN',
    message: '알 수 없는 오류가 발생했습니다.',
    recoverable: false,
    originalError: error,
  };
}

/**
 * 에러 코드별 사용자 친화적 메시지 가져오기
 */
export function getErrorMessage(code: ApiErrorCode): string {
  const messages: Record<ApiErrorCode, string> = {
    NETWORK_ERROR: '네트워크 연결을 확인해주세요.',
    NOT_FOUND: '요청한 페이지를 찾을 수 없습니다.',
    UNAUTHORIZED: '로그인이 필요합니다.',
    FORBIDDEN: '접근 권한이 없습니다.',
    RATE_LIMITED: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
    SERVER_ERROR: '서버에 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
    PARSE_ERROR: '데이터를 처리하는 중 오류가 발생했습니다.',
    TIMEOUT: '요청 시간이 초과되었습니다. 다시 시도해주세요.',
    UNKNOWN: '알 수 없는 오류가 발생했습니다.',
  };

  return messages[code];
}

/**
 * 텍스트에서 앵커 링크용 ID 생성
 * 중복 방지를 위해 usedIds Set을 전달할 수 있음
 * @param text - 원본 텍스트
 * @param usedIds - 이미 사용된 ID 목록 (중복 방지용)
 * @param counter - 폴백 카운터 (빈 ID 방지용)
 * @returns 생성된 ID
 *
 * @example
 * generateHeadingId('Hello World') => 'hello-world'
 * generateHeadingId('API 문서') => 'api-문서'
 */
export function generateHeadingId(
  text: string,
  usedIds?: Set<string>,
  counter = 0
): string {
  let id = text
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();

  // 빈 ID 방지
  if (!id) {
    id = `heading-${counter || Date.now()}`;
  }

  // 중복 방지
  if (usedIds) {
    if (usedIds.has(id)) {
      let suffix = 1;
      while (usedIds.has(`${id}-${suffix}`)) {
        suffix++;
      }
      id = `${id}-${suffix}`;
    }
    usedIds.add(id);
  }

  return id;
}

/**
 * 정규식 특수문자 이스케이프
 * 사용자 입력을 정규식 패턴에 안전하게 사용할 수 있게 함
 * @param str - 이스케이프할 문자열
 * @returns 이스케이프된 문자열
 *
 * @example
 * escapeRegExp('hello.world') => 'hello\\.world'
 * escapeRegExp('test[1]') => 'test\\[1\\]'
 */
export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
