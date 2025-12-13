import '../globals.css';

/**
 * 인증 페이지 레이아웃
 * 로그인/에러 페이지용 간소화된 레이아웃
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="auth-layout">{children}</div>;
}
