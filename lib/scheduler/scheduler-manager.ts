/**
 * 스케줄러 매니저
 * 작업 등록, 실행, 생명주기 관리
 */
import cron, { ScheduledTask } from 'node-cron';
import { getRedisClient, isRedisEnabled, connectRedis, disconnectRedis } from '@/lib/redis';
import {
  acquireLeadership,
  releaseLeadership,
  isLeader,
  getCurrentLeader,
} from './leader-election';
import {
  JobResult,
  JobRunOptions,
  JobExecution,
  JobInfo,
  SchedulerStatus,
  REDIS_KEYS,
  DEFAULT_SCHEDULER_CONFIG,
} from './types';
import type { BaseJob } from './jobs/base-job';

// 스케줄러 상태
let schedulerStatus: 'stopped' | 'starting' | 'running' | 'error' = 'stopped';
let startedAt: string | null = null;

// 인메모리 이력 (Redis 미사용 시 폴백)
const inMemoryHistory: JobExecution[] = [];
const inMemoryLastRun: Map<string, JobExecution> = new Map();
const IN_MEMORY_HISTORY_LIMIT = 100;

// 등록된 작업 목록
const registeredJobs: Map<
  string,
  { job: BaseJob; task: ScheduledTask; enabled: boolean }
> = new Map();

// 실행 중인 작업 추적 (동시 실행 방지)
const runningJobs = new Set<string>();

/**
 * 스케줄러가 활성화되어야 하는지 확인
 */
export function shouldEnableScheduler(): boolean {
  // static 모드에서는 스케줄러 비활성화
  if (process.env.BUILD_MODE === 'static') {
    return false;
  }

  // 명시적으로 비활성화된 경우
  if (process.env.SCHEDULER_ENABLED === 'false') {
    return false;
  }

  // standalone 모드에서는 기본 활성화
  return process.env.BUILD_MODE === 'standalone' ||
         process.env.SCHEDULER_ENABLED === 'true';
}

/**
 * 작업 등록
 */
export function registerJob(job: BaseJob): void {
  if (registeredJobs.has(job.name)) {
    console.warn(`[Scheduler] 작업 '${job.name}' 이미 등록됨`);
    return;
  }

  // cron 태스크 생성
  const task = cron.schedule(
    job.schedule,
    async () => {
      // 리더만 실행
      if (!isLeader()) {
        console.log(`[Scheduler] ${job.name} 건너뜀 (리더 아님)`);
        return;
      }

      // 이미 실행 중이면 건너뜀 (수동 실행과 동시 실행 방지)
      if (runningJobs.has(job.name)) {
        console.log(`[Scheduler] ${job.name} 건너뜀 (이미 실행 중)`);
        return;
      }

      runningJobs.add(job.name);
      try {
        await executeJob(job);
      } finally {
        runningJobs.delete(job.name);
      }
    }
  );

  // 태스크 생성 후 즉시 중지 (startScheduler에서 명시적으로 시작)
  task.stop();

  registeredJobs.set(job.name, { job, task, enabled: true });
  console.log(`[Scheduler] 작업 등록: ${job.name} (${job.schedule})`);
}

/**
 * 작업 실행
 */
async function executeJob(job: BaseJob, options?: JobRunOptions): Promise<JobResult> {
  const startTime = Date.now();
  const executionId = `${job.name}-${startTime}`;

  console.log(`[Job:${job.name}] 실행 시작${options?.dryRun ? ' (DRY_RUN)' : ''}`);

  try {
    const result = await job.run(options);
    const duration = Date.now() - startTime;

    // 실행 이력 저장
    await recordExecution({
      id: executionId,
      jobName: job.name,
      startedAt: new Date(startTime).toISOString(),
      completedAt: new Date().toISOString(),
      success: result.success,
      message: result.message,
      duration,
      error: result.error,
    });

    console.log(
      `[Job:${job.name}] ${result.success ? '완료' : '실패'} (${duration}ms): ${result.message}`
    );

    return { ...result, duration };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    // 실행 이력 저장
    await recordExecution({
      id: executionId,
      jobName: job.name,
      startedAt: new Date(startTime).toISOString(),
      completedAt: new Date().toISOString(),
      success: false,
      message: '예외 발생',
      duration,
      error: errorMessage,
    });

    console.error(`[Job:${job.name}] 예외 발생 (${duration}ms):`, error);

    return {
      success: false,
      message: '예외 발생',
      error: errorMessage,
      duration,
    };
  }
}

/**
 * 실행 이력 저장
 */
async function recordExecution(execution: JobExecution): Promise<void> {
  try {
    if (isRedisEnabled()) {
      const redis = getRedisClient();

      // 전체 이력에 추가
      await redis.lpush(REDIS_KEYS.HISTORY, JSON.stringify(execution));
      await redis.ltrim(REDIS_KEYS.HISTORY, 0, DEFAULT_SCHEDULER_CONFIG.historyLimit - 1);

      // 작업별 마지막 실행 저장
      await redis.set(
        REDIS_KEYS.JOB_LAST_RUN(execution.jobName),
        JSON.stringify(execution),
        'EX',
        86400 * 7 // 7일 보관
      );
    } else {
      // 인메모리 폴백
      inMemoryHistory.unshift(execution);
      if (inMemoryHistory.length > IN_MEMORY_HISTORY_LIMIT) {
        inMemoryHistory.pop();
      }
      inMemoryLastRun.set(execution.jobName, execution);
    }
  } catch (error) {
    console.error('[Scheduler] 실행 이력 저장 실패:', error);
  }
}

/**
 * 스크립트 실행 이력 기록 (외부 API에서 호출)
 */
export async function recordScriptExecution(execution: JobExecution): Promise<void> {
  return recordExecution(execution);
}

/**
 * 실행 이력 조회
 */
export async function getExecutionHistory(limit = 50): Promise<JobExecution[]> {
  if (!isRedisEnabled()) {
    // 인메모리 폴백
    return inMemoryHistory.slice(0, limit);
  }

  try {
    const redis = getRedisClient();
    const history = await redis.lrange(REDIS_KEYS.HISTORY, 0, limit - 1);
    return history.map((item) => JSON.parse(item) as JobExecution);
  } catch (error) {
    console.error('[Scheduler] 실행 이력 조회 실패:', error);
    return inMemoryHistory.slice(0, limit);
  }
}

/**
 * 작업별 마지막 실행 조회
 */
async function getLastExecution(jobName: string): Promise<JobExecution | undefined> {
  if (!isRedisEnabled()) {
    // 인메모리 폴백
    return inMemoryLastRun.get(jobName);
  }

  try {
    const redis = getRedisClient();
    const data = await redis.get(REDIS_KEYS.JOB_LAST_RUN(jobName));
    return data ? (JSON.parse(data) as JobExecution) : undefined;
  } catch {
    return inMemoryLastRun.get(jobName);
  }
}

/**
 * 다음 실행 시간 계산
 */
function getNextRunTime(schedule: string): string | undefined {
  try {
    const interval = cron.validate(schedule);
    if (!interval) return undefined;

    // node-cron은 다음 실행 시간을 직접 제공하지 않음
    // 간단한 추정값 반환
    return '다음 스케줄에 따라 실행';
  } catch {
    return undefined;
  }
}

/**
 * 스케줄러 시작
 */
export async function startScheduler(): Promise<boolean> {
  if (!shouldEnableScheduler()) {
    console.log('[Scheduler] 스케줄러 비활성화됨 (BUILD_MODE 또는 SCHEDULER_ENABLED 설정)');
    return false;
  }

  if (schedulerStatus === 'running') {
    console.warn('[Scheduler] 이미 실행 중');
    return true;
  }

  schedulerStatus = 'starting';
  console.log('[Scheduler] 스케줄러 시작 중...');

  try {
    // Redis 연결 (사용 가능한 경우)
    if (isRedisEnabled()) {
      const connected = await connectRedis();
      if (!connected) {
        console.warn('[Scheduler] Redis 연결 실패 - 단일 인스턴스 모드로 계속');
      }
    }

    // 리더십 획득
    await acquireLeadership();

    // 모든 작업 시작
    for (const [name, { task }] of registeredJobs) {
      task.start();
      console.log(`[Scheduler] 작업 시작: ${name}`);
    }

    schedulerStatus = 'running';
    startedAt = new Date().toISOString();
    console.log('[Scheduler] 스케줄러 시작 완료');

    // Graceful shutdown 핸들러 등록
    setupShutdownHandlers();

    return true;
  } catch (error) {
    schedulerStatus = 'error';
    console.error('[Scheduler] 스케줄러 시작 실패:', error);
    return false;
  }
}

/**
 * 스케줄러 중지
 */
export async function stopScheduler(): Promise<void> {
  if (schedulerStatus === 'stopped') {
    return;
  }

  console.log('[Scheduler] 스케줄러 중지 중...');

  // 모든 작업 중지
  for (const [name, { task }] of registeredJobs) {
    task.stop();
    console.log(`[Scheduler] 작업 중지: ${name}`);
  }

  // 리더십 포기
  await releaseLeadership();

  // Redis 연결 종료
  await disconnectRedis();

  schedulerStatus = 'stopped';
  startedAt = null;
  console.log('[Scheduler] 스케줄러 중지 완료');
}

/**
 * 작업 수동 실행
 */
export async function runJobManually(
  jobName: string,
  options?: { dryRun?: boolean }
): Promise<JobResult> {
  const entry = registeredJobs.get(jobName);

  if (!entry) {
    return {
      success: false,
      message: `작업 '${jobName}'을 찾을 수 없음`,
    };
  }

  // 동시 실행 방지
  if (runningJobs.has(jobName)) {
    return {
      success: false,
      message: `작업 '${jobName}'이(가) 이미 실행 중입니다`,
    };
  }

  runningJobs.add(jobName);

  console.log(`[Scheduler] 수동 실행: ${jobName}${options?.dryRun ? ' (DRY_RUN)' : ''}`);

  try {
    return await executeJob(entry.job, options);
  } finally {
    runningJobs.delete(jobName);
  }
}

/**
 * 스케줄러 상태 조회
 */
export async function getSchedulerStatus(): Promise<SchedulerStatus> {
  const jobs: JobInfo[] = [];

  for (const [name, { job, enabled }] of registeredJobs) {
    const lastRun = await getLastExecution(name);

    jobs.push({
      name: job.name,
      description: job.description,
      schedule: job.schedule,
      enabled,
      lastRun,
      nextRun: getNextRunTime(job.schedule),
    });
  }

  return {
    status: schedulerStatus,
    isLeader: isLeader(),
    leaderId: getCurrentLeader() || undefined,
    startedAt: startedAt || undefined,
    jobs,
  };
}

/**
 * 등록된 작업 목록 조회
 */
export function getRegisteredJobs(): BaseJob[] {
  return Array.from(registeredJobs.values()).map(({ job }) => job);
}

/**
 * Graceful shutdown 핸들러
 */
let shutdownHandlersSetup = false;

function setupShutdownHandlers(): void {
  if (shutdownHandlersSetup) return;

  const shutdown = async (signal: string) => {
    console.log(`[Scheduler] ${signal} 신호 수신 - 종료 중...`);
    await stopScheduler();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  shutdownHandlersSetup = true;
}
