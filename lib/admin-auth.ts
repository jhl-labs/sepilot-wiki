/**
 * Admin API 인증 유틸리티
 * 스케줄러, 스크립트 등 관리 API의 공통 인증 로직
 */
import { NextRequest } from 'next/server';
import crypto from 'crypto';

/**
 * 관리자 API 인증 확인
 * - SCHEDULER_API_KEY 설정: Bearer 토큰 검증 (타이밍 공격 방지)
 * - 프로덕션: SCHEDULER_API_KEY 필수
 * - 개발 환경: API 키 미설정 시 허용
 *
 * 참고: AUTH_MODE=public이더라도 admin API는 API 키 인증 필요
 */
export function checkAdminApiAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization') || '';
  const apiKey = process.env.SCHEDULER_API_KEY;

  // 프로덕션에서는 API 키 필수
  if (process.env.NODE_ENV === 'production' && !apiKey) {
    console.error('[admin-auth] SCHEDULER_API_KEY가 프로덕션에서 설정되지 않았습니다.');
    return false;
  }

  // API 키가 설정된 경우 타이밍 안전 비교
  if (apiKey) {
    const expected = `Bearer ${apiKey}`;
    if (authHeader.length !== expected.length) {
      return false;
    }
    try {
      return crypto.timingSafeEqual(
        Buffer.from(authHeader),
        Buffer.from(expected)
      );
    } catch {
      return false;
    }
  }

  // 개발 환경에서만 API 키 없이 허용
  return process.env.NODE_ENV !== 'production';
}
