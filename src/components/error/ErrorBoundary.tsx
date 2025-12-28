'use client';

/**
 * Error Boundary 컴포넌트
 * React 컴포넌트 트리에서 발생하는 에러를 캐치하고 폴백 UI 표시
 */

import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

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

            {process.env.NODE_ENV === 'development' && this.state.error && (
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

          <style jsx>{`
            .error-boundary {
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 400px;
              padding: 2rem;
            }

            .error-boundary-content {
              text-align: center;
              max-width: 500px;
            }

            .error-boundary-icon {
              color: var(--color-error, #ef4444);
              margin-bottom: 1rem;
            }

            .error-boundary-title {
              font-size: 1.5rem;
              font-weight: 600;
              color: var(--color-text);
              margin-bottom: 0.5rem;
            }

            .error-boundary-message {
              color: var(--color-text-secondary);
              margin-bottom: 1.5rem;
              line-height: 1.6;
            }

            .error-boundary-details {
              text-align: left;
              margin-bottom: 1.5rem;
              padding: 1rem;
              background: var(--color-background-secondary);
              border-radius: 8px;
              font-size: 0.875rem;
            }

            .error-boundary-details summary {
              cursor: pointer;
              font-weight: 500;
              margin-bottom: 0.5rem;
            }

            .error-boundary-details pre {
              overflow-x: auto;
              white-space: pre-wrap;
              word-break: break-word;
              margin: 0.5rem 0;
              padding: 0.5rem;
              background: var(--color-background);
              border-radius: 4px;
              font-size: 0.75rem;
            }

            .error-boundary-actions {
              display: flex;
              gap: 0.75rem;
              justify-content: center;
              flex-wrap: wrap;
            }

            .error-boundary-button {
              display: inline-flex;
              align-items: center;
              gap: 0.5rem;
              padding: 0.5rem 1rem;
              border-radius: 6px;
              font-size: 0.875rem;
              font-weight: 500;
              cursor: pointer;
              transition: all 0.2s;
              border: none;
            }

            .error-boundary-button.primary {
              background: var(--color-primary);
              color: white;
            }

            .error-boundary-button.primary:hover {
              background: var(--color-primary-hover);
            }

            .error-boundary-button.secondary {
              background: var(--color-background-secondary);
              color: var(--color-text);
              border: 1px solid var(--color-border);
            }

            .error-boundary-button.secondary:hover {
              background: var(--color-background-tertiary);
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
