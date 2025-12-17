/**
 * 스케줄 작업 베이스 클래스
 * 모든 스케줄 작업은 이 클래스를 상속받아 구현
 */
import { JobResult } from '../types';

export abstract class BaseJob {
  /** 작업 이름 (고유 식별자) */
  abstract readonly name: string;

  /** 작업 설명 */
  abstract readonly description: string;

  /** Cron 스케줄 표현식 */
  abstract readonly schedule: string;

  /**
   * 작업 실행 가능 여부 확인
   * 환경변수, 의존성 등을 확인하여 실행 가능한지 판단
   */
  async isEnabled(): Promise<boolean> {
    return true;
  }

  /**
   * 실제 작업 로직 구현 (하위 클래스에서 구현)
   */
  protected abstract execute(): Promise<JobResult>;

  /**
   * 작업 실행 (래퍼 메서드)
   * 로깅, 에러 처리 등 공통 로직 포함
   */
  async run(): Promise<JobResult> {
    // 실행 가능 여부 확인
    const enabled = await this.isEnabled();
    if (!enabled) {
      return {
        success: true,
        message: '작업 비활성화됨 (건너뜀)',
      };
    }

    try {
      return await this.execute();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[Job:${this.name}] 실행 오류:`, error);

      return {
        success: false,
        message: '작업 실행 중 오류 발생',
        error: errorMessage,
      };
    }
  }

  /**
   * 재시도 로직이 포함된 실행
   */
  protected async executeWithRetry<T>(
    fn: () => Promise<T>,
    options: {
      maxRetries?: number;
      delayMs?: number;
      backoff?: boolean;
    } = {}
  ): Promise<T> {
    const { maxRetries = 3, delayMs = 1000, backoff = true } = options;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }

        const delay = backoff ? delayMs * Math.pow(2, attempt - 1) : delayMs;
        console.warn(
          `[Job:${this.name}] 재시도 ${attempt}/${maxRetries}, ${delay}ms 후...`
        );
        await this.sleep(delay);
      }
    }

    throw new Error('재시도 횟수 초과');
  }

  /**
   * 지연 유틸리티
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 로그 출력 유틸리티
   */
  protected log(message: string, data?: unknown): void {
    if (data) {
      console.log(`[Job:${this.name}] ${message}`, data);
    } else {
      console.log(`[Job:${this.name}] ${message}`);
    }
  }

  /**
   * 경고 출력 유틸리티
   */
  protected warn(message: string, data?: unknown): void {
    if (data) {
      console.warn(`[Job:${this.name}] ${message}`, data);
    } else {
      console.warn(`[Job:${this.name}] ${message}`);
    }
  }

  /**
   * 에러 출력 유틸리티
   */
  protected error(message: string, error?: unknown): void {
    console.error(`[Job:${this.name}] ${message}`, error);
  }
}
