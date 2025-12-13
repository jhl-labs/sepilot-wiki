'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react';
import { Suspense } from 'react';

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const getErrorMessage = (errorCode: string | null) => {
    switch (errorCode) {
      case 'Configuration':
        return {
          title: '서버 구성 오류',
          message: '인증 서버 구성에 문제가 있습니다. 관리자에게 문의하세요.',
        };
      case 'AccessDenied':
        return {
          title: '접근 거부',
          message: '이 리소스에 접근할 권한이 없습니다.',
        };
      case 'Verification':
        return {
          title: '인증 링크 만료',
          message: '인증 링크가 만료되었거나 이미 사용되었습니다.',
        };
      case 'OAuthSignin':
        return {
          title: 'OAuth 로그인 오류',
          message: 'OAuth 로그인 프로세스를 시작하는 중 오류가 발생했습니다.',
        };
      case 'OAuthCallback':
        return {
          title: 'OAuth 콜백 오류',
          message: '인증 공급자로부터 응답을 처리하는 중 오류가 발생했습니다.',
        };
      case 'OAuthCreateAccount':
        return {
          title: '계정 생성 오류',
          message: 'OAuth 계정을 생성하는 중 오류가 발생했습니다.',
        };
      case 'EmailCreateAccount':
        return {
          title: '계정 생성 오류',
          message: '이메일 계정을 생성하는 중 오류가 발생했습니다.',
        };
      case 'Callback':
        return {
          title: '콜백 오류',
          message: '인증 콜백을 처리하는 중 오류가 발생했습니다.',
        };
      case 'OAuthAccountNotLinked':
        return {
          title: '계정 연결 오류',
          message: '이 이메일은 다른 인증 방법으로 이미 등록되어 있습니다.',
        };
      case 'SessionRequired':
        return {
          title: '로그인 필요',
          message: '이 페이지에 접근하려면 로그인이 필요합니다.',
        };
      default:
        return {
          title: '인증 오류',
          message: '알 수 없는 오류가 발생했습니다. 다시 시도해 주세요.',
        };
    }
  };

  const { title, message } = getErrorMessage(error);

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card auth-error-card">
          <div className="auth-header">
            <AlertTriangle size={48} className="auth-icon error-icon" />
            <h1>{title}</h1>
            <p>{message}</p>
          </div>

          {error && (
            <div className="auth-error-code">
              <span>오류 코드: {error}</span>
            </div>
          )}

          <div className="auth-actions">
            <Link href="/auth/signin" className="btn btn-primary btn-lg">
              <RefreshCw size={20} />
              <span>다시 로그인</span>
            </Link>
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

function ErrorLoading() {
  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card auth-error-card">
          <div className="auth-header">
            <AlertTriangle size={48} className="auth-icon error-icon" />
            <h1>오류</h1>
            <p>로딩 중...</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<ErrorLoading />}>
      <ErrorContent />
    </Suspense>
  );
}
