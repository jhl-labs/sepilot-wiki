/**
 * Redis 기반 리더 선출
 * 분산 환경에서 단일 스케줄러만 작업을 실행하도록 보장
 */
import { getRedisClient, isRedisEnabled } from '@/lib/redis';
import { REDIS_KEYS, DEFAULT_SCHEDULER_CONFIG } from './types';

// 리더 상태
let isCurrentLeader = false;
let currentLeaderId: string | null = null;
let heartbeatTimer: NodeJS.Timeout | null = null;
let retryAttempt = 0;
const MAX_RETRY_DELAY = 60000; // 최대 60초

// Pod/프로세스 ID 생성
const POD_ID = process.env.HOSTNAME || process.env.POD_NAME || `local-${process.pid}`;

/**
 * 리더 ID 가져오기
 */
export function getLeaderId(): string {
  return POD_ID;
}

/**
 * 현재 프로세스가 리더인지 확인
 */
export function isLeader(): boolean {
  // Redis가 없으면 항상 리더 (단일 인스턴스 모드)
  if (!isRedisEnabled()) {
    return true;
  }
  return isCurrentLeader;
}

/**
 * 현재 리더 ID 가져오기
 */
export function getCurrentLeader(): string | null {
  if (!isRedisEnabled()) {
    return POD_ID;
  }
  return currentLeaderId;
}

/**
 * 리더십 획득 시도
 */
export async function acquireLeadership(): Promise<boolean> {
  // Redis가 없으면 항상 리더
  if (!isRedisEnabled()) {
    isCurrentLeader = true;
    currentLeaderId = POD_ID;
    console.log(`[Leader] Redis 없음 - ${POD_ID} 단일 인스턴스 모드로 실행`);
    return true;
  }

  try {
    const redis = getRedisClient();
    const ttl = DEFAULT_SCHEDULER_CONFIG.leaderTtlSeconds;

    // SETNX로 리더 획득 시도
    const result = await redis.set(
      REDIS_KEYS.LEADER,
      POD_ID,
      'EX',
      ttl,
      'NX'
    );

    if (result === 'OK') {
      isCurrentLeader = true;
      currentLeaderId = POD_ID;
      retryAttempt = 0; // 성공 시 재시도 카운터 리셋
      startHeartbeat();
      console.log(`[Leader] ${POD_ID} 리더로 선출됨 (TTL: ${ttl}s)`);
      return true;
    }

    // 기존 리더 확인
    currentLeaderId = await redis.get(REDIS_KEYS.LEADER);
    console.log(`[Leader] 기존 리더 존재: ${currentLeaderId}`);

    // 리더 변경 감시 시작
    startLeaderWatch();
    return false;
  } catch (error) {
    console.error('[Leader] 리더십 획득 실패:', error);
    // 에러 시에도 지수 백오프 적용
    retryAttempt++;
    const delay = Math.min(1000 * Math.pow(2, retryAttempt - 1), MAX_RETRY_DELAY);
    console.log(`[Leader] Redis 에러, ${delay}ms 후 재시도 (시도 #${retryAttempt})`);
    setTimeout(() => acquireLeadership(), delay);
    return false;
  }
}

/**
 * 리더십 포기
 */
export async function releaseLeadership(): Promise<void> {
  stopHeartbeat();

  if (!isRedisEnabled() || !isCurrentLeader) {
    isCurrentLeader = false;
    return;
  }

  try {
    const redis = getRedisClient();

    // 자신이 리더인 경우에만 삭제 (Lua 스크립트로 원자적 처리)
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    await redis.eval(script, 1, REDIS_KEYS.LEADER, POD_ID);
    console.log(`[Leader] ${POD_ID} 리더십 포기`);
  } catch (error) {
    console.error('[Leader] 리더십 포기 실패:', error);
  } finally {
    isCurrentLeader = false;
    currentLeaderId = null;
  }
}

/**
 * Heartbeat 시작 (리더만)
 */
function startHeartbeat(): void {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
  }

  const interval = DEFAULT_SCHEDULER_CONFIG.heartbeatIntervalMs;
  const ttl = DEFAULT_SCHEDULER_CONFIG.leaderTtlSeconds;

  heartbeatTimer = setInterval(async () => {
    if (!isCurrentLeader) {
      stopHeartbeat();
      return;
    }

    try {
      const redis = getRedisClient();

      // TTL 갱신 (리더인 경우에만)
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("expire", KEYS[1], ARGV[2])
        else
          return 0
        end
      `;

      const result = await redis.eval(script, 1, REDIS_KEYS.LEADER, POD_ID, ttl);

      if (result === 0) {
        console.warn('[Leader] Heartbeat 실패 - 리더십 상실');
        isCurrentLeader = false;
        currentLeaderId = null;
        stopHeartbeat();

        // 지수 백오프로 리더십 재획득 시도
        retryAttempt++;
        const delay = Math.min(1000 * Math.pow(2, retryAttempt - 1), MAX_RETRY_DELAY);
        console.log(`[Leader] ${delay}ms 후 리더십 재획득 시도 (시도 #${retryAttempt})`);
        setTimeout(() => acquireLeadership(), delay);
      }
    } catch (error) {
      console.error('[Leader] Heartbeat 오류:', error);
    }
  }, interval);

  console.log(`[Leader] Heartbeat 시작 (${interval}ms 간격)`);
}

/**
 * Heartbeat 중지
 */
function stopHeartbeat(): void {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
    console.log('[Leader] Heartbeat 중지');
  }
}

/**
 * 리더 변경 감시 (비리더 노드)
 */
let watchTimer: NodeJS.Timeout | null = null;

function startLeaderWatch(): void {
  if (watchTimer || isCurrentLeader) {
    return;
  }

  // 10초마다 리더 상태 확인
  watchTimer = setInterval(async () => {
    if (isCurrentLeader) {
      stopLeaderWatch();
      return;
    }

    try {
      const redis = getRedisClient();
      const leader = await redis.get(REDIS_KEYS.LEADER);

      if (!leader) {
        console.log('[Leader] 리더 부재 감지 - 리더십 획득 시도');
        stopLeaderWatch();
        await acquireLeadership();
      } else {
        currentLeaderId = leader;
      }
    } catch (error) {
      console.error('[Leader] 리더 감시 오류:', error);
    }
  }, 10000);

  console.log('[Leader] 리더 변경 감시 시작');
}

function stopLeaderWatch(): void {
  if (watchTimer) {
    clearInterval(watchTimer);
    watchTimer = null;
    console.log('[Leader] 리더 변경 감시 중지');
  }
}
