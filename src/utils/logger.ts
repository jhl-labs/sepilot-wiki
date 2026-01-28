/**
 * 구조화된 로깅 시스템
 * 로그 레벨, 타임스탬프, 컨텍스트 정보 지원
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  /** 컴포넌트 또는 모듈 이름 */
  component?: string;
  /** 추가 메타데이터 */
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: Error;
}

// 로그 레벨 우선순위
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// 환경에 따른 최소 로그 레벨
function getMinLogLevel(): LogLevel {
  if (typeof process !== 'undefined') {
    // Node.js 환경
    if (process.env.NODE_ENV === 'production') return 'warn';
    if (process.env.LOG_LEVEL) return process.env.LOG_LEVEL as LogLevel;
  }
  if (typeof window !== 'undefined') {
    // 브라우저 환경
    // @ts-expect-error - import.meta는 빌드 환경에서만 사용 가능
    if (typeof import.meta !== 'undefined' && import.meta.env?.PROD) return 'warn';
  }
  return 'debug';
}

// 현재 환경이 프로덕션인지 확인
function isProduction(): boolean {
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
    return true;
  }
  if (typeof window !== 'undefined') {
    // @ts-expect-error - import.meta는 빌드 환경에서만 사용 가능
    if (typeof import.meta !== 'undefined' && import.meta.env?.PROD) return true;
  }
  return false;
}

/**
 * Logger 클래스
 */
class Logger {
  private minLevel: LogLevel;
  private defaultContext?: LogContext;

  constructor(defaultContext?: LogContext) {
    this.minLevel = getMinLogLevel();
    this.defaultContext = defaultContext;
  }

  /**
   * 로그 레벨이 출력 가능한지 확인
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.minLevel];
  }

  /**
   * 로그 엔트리 포맷팅
   */
  private formatEntry(entry: LogEntry): string {
    const parts = [
      `[${entry.timestamp}]`,
      `[${entry.level.toUpperCase()}]`,
    ];

    if (entry.context?.component) {
      parts.push(`[${entry.context.component}]`);
    }

    parts.push(entry.message);

    return parts.join(' ');
  }

  /**
   * 로그 출력
   */
  private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: { ...this.defaultContext, ...context },
      error,
    };

    const formattedMessage = this.formatEntry(entry);

    // 프로덕션이 아닌 경우에만 상세 로그 출력
    const shouldLogDetailed = !isProduction();

    switch (level) {
      case 'debug':
        if (shouldLogDetailed) {
          console.debug(formattedMessage, entry.context);
        }
        break;
      case 'info':
        if (shouldLogDetailed) {
          console.info(formattedMessage, entry.context);
        }
        break;
      case 'warn':
        console.warn(formattedMessage, entry.context);
        break;
      case 'error':
        console.error(formattedMessage, entry.context, error);
        break;
    }
  }

  /**
   * 디버그 로그
   */
  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  /**
   * 정보 로그
   */
  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  /**
   * 경고 로그
   */
  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  /**
   * 에러 로그
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorObj = error instanceof Error ? error : undefined;
    this.log('error', message, context, errorObj);
  }

  /**
   * 특정 컴포넌트용 자식 Logger 생성
   */
  child(component: string): Logger {
    return new Logger({
      ...this.defaultContext,
      component,
    });
  }
}

// 기본 Logger 인스턴스
export const logger = new Logger();

// 컴포넌트별 Logger 생성 헬퍼
export function createLogger(component: string): Logger {
  return logger.child(component);
}

export default logger;
