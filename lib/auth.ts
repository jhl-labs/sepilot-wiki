/**
 * NextAuth.js 인증 설정
 * Keycloak OAuth 프로바이더를 사용한 인증 구현
 */

import NextAuth from 'next-auth';
import Keycloak from 'next-auth/providers/keycloak';

// 인증 모드: 'public' (GitHub Pages) 또는 'private' (Keycloak)
const AUTH_MODE = process.env.AUTH_MODE || 'public';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers:
    AUTH_MODE === 'private'
      ? [
          Keycloak({
            clientId: process.env.KEYCLOAK_CLIENT_ID!,
            clientSecret: process.env.KEYCLOAK_CLIENT_SECRET!,
            issuer: process.env.KEYCLOAK_ISSUER!,
          }),
        ]
      : [],

  callbacks: {
    // 인증 여부 확인
    authorized({ auth, request }) {
      // Public 모드에서는 모든 요청 허용
      if (AUTH_MODE === 'public') return true;

      // 보호된 경로 확인
      const isProtectedRoute =
        request.nextUrl.pathname.startsWith('/issues') ||
        request.nextUrl.pathname.startsWith('/ai-history') ||
        request.nextUrl.pathname.startsWith('/admin') ||
        request.nextUrl.pathname.match(/\/wiki\/.*\/edit/);

      // 보호된 경로는 인증 필요
      return isProtectedRoute ? !!auth : true;
    },

    // JWT 토큰에 역할 정보 추가
    jwt({ token, account, profile }) {
      if (account && profile) {
        // Keycloak에서 역할 정보 추출
        const keycloakProfile = profile as {
          realm_access?: { roles?: string[] };
          resource_access?: { [key: string]: { roles?: string[] } };
        };

        token.roles = keycloakProfile.realm_access?.roles || [];
        token.clientRoles =
          keycloakProfile.resource_access?.[process.env.KEYCLOAK_CLIENT_ID || '']?.roles || [];
      }
      return token;
    },

    // 세션에 역할 정보 추가
    session({ session, token }) {
      if (session.user) {
        (session.user as { roles?: string[]; clientRoles?: string[] }).roles =
          (token.roles as string[]) || [];
        (session.user as { roles?: string[]; clientRoles?: string[] }).clientRoles =
          (token.clientRoles as string[]) || [];
      }
      return session;
    },
  },

  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },

  // 세션 전략
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24시간
  },

  // 디버그 모드 (개발 환경에서만)
  debug: process.env.NODE_ENV === 'development',
});

/**
 * 인증 모드 확인
 */
export function isAuthEnabled(): boolean {
  return AUTH_MODE === 'private';
}

/**
 * 역할 확인 유틸리티
 */
export function hasRole(
  session: { user?: { roles?: string[]; clientRoles?: string[] } } | null,
  role: string
): boolean {
  if (!session?.user) return false;
  const user = session.user as { roles?: string[]; clientRoles?: string[] };
  return user.roles?.includes(role) || user.clientRoles?.includes(role) || false;
}

/**
 * 편집 권한 확인
 */
export function canEdit(
  session: { user?: { roles?: string[]; clientRoles?: string[] } } | null
): boolean {
  return hasRole(session, 'wiki-editor') || hasRole(session, 'wiki-admin');
}

/**
 * 관리자 권한 확인
 */
export function isAdmin(
  session: { user?: { roles?: string[]; clientRoles?: string[] } } | null
): boolean {
  return hasRole(session, 'wiki-admin');
}
