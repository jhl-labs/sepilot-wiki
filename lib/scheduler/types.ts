/**
 * 스케줄러 타입 정의
 */

/** 작업 실행 결과 */
export interface JobResult {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
  error?: string;
  duration?: number;
}

/** 작업 실행 이력 */
export interface JobExecution {
  id: string;
  jobName: string;
  startedAt: string;
  completedAt: string;
  success: boolean;
  message: string;
  duration: number;
  error?: string;
}

/** 작업 정보 */
export interface JobInfo {
  name: string;
  description: string;
  schedule: string;
  enabled: boolean;
  lastRun?: JobExecution;
  nextRun?: string;
}

/** 스케줄러 상태 */
export interface SchedulerStatus {
  status: 'running' | 'stopped' | 'starting' | 'error';
  isLeader: boolean;
  leaderId?: string;
  startedAt?: string;
  jobs: JobInfo[];
  error?: string;
}

/** 스케줄러 설정 */
export interface SchedulerConfig {
  enabled: boolean;
  leaderTtlSeconds: number;
  heartbeatIntervalMs: number;
  historyLimit: number;
}

/** 기본 스케줄러 설정 */
export const DEFAULT_SCHEDULER_CONFIG: SchedulerConfig = {
  enabled: true,
  leaderTtlSeconds: 30,
  heartbeatIntervalMs: 10000,
  historyLimit: 100,
};

/** Redis 키 상수 */
export const REDIS_KEYS = {
  LEADER: 'sepilot-wiki:scheduler:leader',
  HISTORY: 'sepilot-wiki:scheduler:history',
  JOB_LAST_RUN: (jobName: string) => `sepilot-wiki:scheduler:job:${jobName}:lastRun`,
} as const;
