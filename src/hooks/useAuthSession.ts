'use client';

/**
 * 인증 모드에 따른 세션 훅
 * public 모드: SessionProvider 없이 null 세션 반환
 * private 모드: next-auth의 useSession 사용
 */

import { useSession } from 'next-auth/react';

const isAuthEnabled = process.env.NEXT_PUBLIC_AUTH_MODE === 'private';

const nullSession = {
  data: null,
  status: 'unauthenticated' as const,
  update: async () => null as never,
};

export function useAuthSession() {
  // isAuthEnabled는 빌드 타임 상수이므로 조건부 훅 호출이 안전함
  if (!isAuthEnabled) {
    return nullSession;
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useSession();
}
