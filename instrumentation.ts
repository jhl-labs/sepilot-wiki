/**
 * Next.js Instrumentation
 * 서버 시작 시 스케줄러 초기화
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // 서버 사이드에서만 실행
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // 환경변수 검증
    const { validateAndLogEnv } = await import('@/lib/env-validation');
    validateAndLogEnv();

    // 동적 임포트로 서버 전용 모듈 로드
    const { initializeScheduler, shouldEnableScheduler } = await import(
      '@/lib/scheduler'
    );

    // 스케줄러 활성화 여부 확인
    if (shouldEnableScheduler()) {
      console.log('[Instrumentation] 스케줄러 초기화 시작...');

      // 약간의 지연 후 초기화 (서버 완전 시작 대기)
      setTimeout(async () => {
        try {
          const result = await initializeScheduler();
          if (result) {
            console.log('[Instrumentation] 스케줄러 초기화 성공');
          } else {
            console.warn('[Instrumentation] 스케줄러 초기화 실패 또는 비활성화');
          }
        } catch (error) {
          console.error('[Instrumentation] 스케줄러 초기화 오류:', error);
        }
      }, 3000); // 3초 후 시작
    } else {
      console.log(
        '[Instrumentation] 스케줄러 비활성화됨 (BUILD_MODE 또는 SCHEDULER_ENABLED 설정 확인)'
      );
    }
  }
}
