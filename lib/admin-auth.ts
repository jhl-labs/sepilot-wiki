/**
 * Admin API 인증 유틸리티
 * 스케줄러, 스크립트 등 관리 API의 공통 인증 로직
 */
import { NextRequest } from 'next/server';

/**
 * 관리자 API 인증 확인
 * - AUTH_MODE=public: 인증 없이 허용
 * - SCHEDULER_API_KEY 설정: Bearer 토큰 검증
 * - 개발 환경: 인증 없이 허용
 */
export function checkAdminApiAuth(request: NextRequest): boolean {
  if (process.env.AUTH_MODE === 'public') return true;

  const authHeader = request.headers.get('authorization');
  const apiKey = process.env.SCHEDULER_API_KEY;

  if (apiKey) return authHeader === `Bearer ${apiKey}`;

  return process.env.NODE_ENV !== 'production';
}
