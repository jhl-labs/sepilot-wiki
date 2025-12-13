'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { LogIn, KeyRound, ArrowLeft } from 'lucide-react';
import { Suspense } from 'react';

function SignInContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const error = searchParams.get('error');

  const handleSignIn = () => {
    signIn('keycloak', { callbackUrl });
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <KeyRound size={48} className="auth-icon" />
            <h1>로그인</h1>
            <p>문서를 편집하려면 로그인이 필요합니다.</p>
          </div>

          {error && (
            <div className="auth-error" role="alert">
              <p>
                {error === 'OAuthSignin' && '로그인 중 오류가 발생했습니다.'}
                {error === 'OAuthCallback' && '인증 콜백 처리 중 오류가 발생했습니다.'}
                {error === 'OAuthAccountNotLinked' && '이미 다른 방식으로 로그인된 계정입니다.'}
                {error === 'AccessDenied' && '접근이 거부되었습니다.'}
                {error === 'Configuration' && '서버 구성 오류가 발생했습니다.'}
                {!['OAuthSignin', 'OAuthCallback', 'OAuthAccountNotLinked', 'AccessDenied', 'Configuration'].includes(error) &&
                  '알 수 없는 오류가 발생했습니다.'}
              </p>
            </div>
          )}

          <div className="auth-actions">
            <button
              className="btn btn-primary btn-lg auth-signin-btn"
              onClick={handleSignIn}
            >
              <LogIn size={20} />
              <span>Keycloak으로 로그인</span>
            </button>
          </div>

          <div className="auth-footer">
            <Link href="/" className="auth-back-link">
              <ArrowLeft size={16} />
              <span>홈으로 돌아가기</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function SignInLoading() {
  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <KeyRound size={48} className="auth-icon" />
            <h1>로그인</h1>
            <p>로딩 중...</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<SignInLoading />}>
      <SignInContent />
    </Suspense>
  );
}
