/**
 * Next.js Middleware
 * 인증이 필요한 경로를 보호하고 리다이렉션 처리
 */

import { auth } from '@/lib/auth';

export default auth((req) => {
  // Public 모드에서는 모든 요청 허용
  if (process.env.AUTH_MODE === 'public') {
    return;
  }

  const isLoggedIn = !!req.auth;
  const pathname = req.nextUrl.pathname;

  // 보호된 경로 패턴
  const protectedRoutes = [
    /^\/issues/, // Issues 페이지
    /^\/ai-history/, // AI 히스토리
    /^\/admin/, // 관리자 페이지
    /^\/wiki\/.*\/edit/, // 문서 편집
  ];

  const isProtectedRoute = protectedRoutes.some((pattern) => pattern.test(pathname));

  // 보호된 경로에 미인증 접근 시 로그인 페이지로 리다이렉트
  if (isProtectedRoute && !isLoggedIn) {
    const signInUrl = new URL('/auth/signin', req.nextUrl.origin);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return Response.redirect(signInUrl);
  }
});

export const config = {
  // 미들웨어를 적용할 경로 (정적 파일, API 제외)
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
