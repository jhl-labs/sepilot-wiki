/**
 * Base URL 결정 (Next.js / Vite 호환)
 * 모든 서비스에서 공통으로 사용하는 유틸리티
 */
export function getBaseUrl(): string {
  let base = '/';
  // Next.js 환경
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_BASE_PATH) {
    base = process.env.NEXT_PUBLIC_BASE_PATH;
  }
  // Vite 환경
  else if (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) {
    base = import.meta.env.BASE_URL;
  }
  // trailing slash 보장
  return base.endsWith('/') ? base : base + '/';
}
