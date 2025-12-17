/**
 * 스케줄러 모듈 진입점
 */
export {
  startScheduler,
  stopScheduler,
  getSchedulerStatus,
  getExecutionHistory,
  runJobManually,
  registerJob,
  shouldEnableScheduler,
  getRegisteredJobs,
} from './scheduler-manager';

export {
  isLeader,
  getLeaderId,
  getCurrentLeader,
  acquireLeadership,
  releaseLeadership,
} from './leader-election';

export type {
  JobResult,
  JobExecution,
  JobInfo,
  SchedulerStatus,
  SchedulerConfig,
} from './types';

export { BaseJob, getAllJobs } from './jobs';

import { registerJob, startScheduler, shouldEnableScheduler } from './scheduler-manager';
import { getAllJobs } from './jobs';

let initialized = false;

/**
 * 스케줄러 초기화 (모든 작업 등록 및 시작)
 */
export async function initializeScheduler(): Promise<boolean> {
  if (initialized) {
    console.log('[Scheduler] 이미 초기화됨');
    return true;
  }

  if (!shouldEnableScheduler()) {
    console.log('[Scheduler] 스케줄러 비활성화 상태');
    return false;
  }

  console.log('[Scheduler] 초기화 시작...');

  // 모든 작업 등록
  const jobs = getAllJobs();
  for (const job of jobs) {
    registerJob(job);
  }

  // 스케줄러 시작
  const started = await startScheduler();

  if (started) {
    initialized = true;
    console.log('[Scheduler] 초기화 완료');
  }

  return started;
}

/**
 * 스케줄러 초기화 여부 확인
 */
export function isSchedulerInitialized(): boolean {
  return initialized;
}
