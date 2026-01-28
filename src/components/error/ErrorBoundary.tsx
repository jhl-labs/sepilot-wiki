/**
 * Error Boundary 컴포넌트
 * React 컴포넌트 트리에서 발생하는 에러를 캐치하고 폴백 UI 표시
 */

import { Component, type ReactNode, type ErrorInfo, type ComponentType } from 'react';
import { AlertTriangle, RefreshCw, Home, AlertCircle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // 에러 로깅
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Error info:', errorInfo);

    // 콜백 실행
    this.props.onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  handleGoHome = (): void => {
    window.location.href = '/';
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // 커스텀 폴백이 제공된 경우
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 기본 에러 UI
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <AlertTriangle className="error-boundary-icon" size={48} />
            <h2 className="error-boundary-title">문제가 발생했습니다</h2>
            <p className="error-boundary-message">
              페이지를 로드하는 중 오류가 발생했습니다.
              <br />
              문제가 지속되면 페이지를 새로고침하거나 홈으로 이동해주세요.
            </p>

            {import.meta.env.DEV && this.state.error && (
              <details className="error-boundary-details">
                <summary>에러 상세 정보</summary>
                <pre>{this.state.error.toString()}</pre>
                {this.state.errorInfo && (
                  <pre>{this.state.errorInfo.componentStack}</pre>
                )}
              </details>
            )}

            <div className="error-boundary-actions">
              <button
                onClick={this.handleReset}
                className="error-boundary-button secondary"
              >
                <RefreshCw size={16} />
                다시 시도
              </button>
              <button
                onClick={this.handleReload}
                className="error-boundary-button secondary"
              >
                <RefreshCw size={16} />
                페이지 새로고침
              </button>
              <button
                onClick={this.handleGoHome}
                className="error-boundary-button primary"
              >
                <Home size={16} />
                홈으로 이동
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

/**
 * 섹션 레벨 에러 바운더리
 * 개별 컴포넌트/섹션에서 사용하며, 작은 폴백 UI 표시
 */
interface SectionErrorBoundaryProps {
  children: ReactNode;
  /** 섹션 이름 (에러 메시지에 표시) */
  sectionName?: string;
  /** 에러 발생 시 표시할 커스텀 메시지 */
  errorMessage?: string;
  /** 에러 콜백 */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** 에러 발생 시 숨길지 여부 (true면 아무것도 표시 안 함) */
  hideOnError?: boolean;
}

interface SectionErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class SectionErrorBoundary extends Component<SectionErrorBoundaryProps, SectionErrorBoundaryState> {
  constructor(props: SectionErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): Partial<SectionErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { sectionName, onError } = this.props;
    console.error(`[SectionErrorBoundary${sectionName ? `: ${sectionName}` : ''}]`, error);
    onError?.(error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, sectionName, errorMessage, hideOnError } = this.props;

    if (hasError) {
      if (hideOnError) {
        return null;
      }

      return (
        <div className="section-error" role="alert">
          <div className="section-error-content">
            <AlertCircle size={20} className="section-error-icon" />
            <div className="section-error-text">
              <p className="section-error-message">
                {errorMessage || `${sectionName || '이 섹션'}을(를) 로드할 수 없습니다`}
              </p>
              {import.meta.env.DEV && error && (
                <p className="section-error-detail">{error.message}</p>
              )}
            </div>
            <button
              onClick={this.handleRetry}
              className="section-error-retry"
              aria-label="다시 시도"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
      );
    }

    return children;
  }
}

/**
 * 에러 바운더리를 감싸는 HOC
 * 함수형 컴포넌트를 쉽게 에러 바운더리로 감쌀 수 있음
 *
 * @example
 * const SafeMarkdownRenderer = withErrorBoundary(MarkdownRenderer, {
 *   sectionName: '마크다운 렌더러',
 *   errorMessage: '콘텐츠를 표시할 수 없습니다',
 * });
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: ComponentType<P>,
  options: Omit<SectionErrorBoundaryProps, 'children'> = {}
): ComponentType<P> {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';

  const WithErrorBoundary = (props: P) => (
    <SectionErrorBoundary {...options}>
      <WrappedComponent {...props} />
    </SectionErrorBoundary>
  );

  WithErrorBoundary.displayName = `withErrorBoundary(${displayName})`;
  return WithErrorBoundary;
}
