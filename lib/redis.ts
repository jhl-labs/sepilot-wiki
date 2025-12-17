/**
 * Redis 클라이언트 설정
 * 분산 락, 작업 큐, 실행 이력 저장에 사용
 */
import Redis from 'ioredis';

// Redis 연결 설정
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  enableReadyCheck: true,
  lazyConnect: true,
};

// REDIS_URL이 있으면 우선 사용
const redisUrl = process.env.REDIS_URL;

// 싱글톤 Redis 클라이언트
let redisClient: Redis | null = null;

/**
 * Redis 클라이언트 가져오기 (싱글톤)
 */
export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = redisUrl
      ? new Redis(redisUrl, { lazyConnect: true })
      : new Redis(redisConfig);

    redisClient.on('error', (error) => {
      console.error('[Redis] 연결 오류:', error.message);
    });

    redisClient.on('connect', () => {
      console.log('[Redis] 연결됨');
    });

    redisClient.on('ready', () => {
      console.log('[Redis] 준비 완료');
    });

    redisClient.on('close', () => {
      console.log('[Redis] 연결 종료');
    });
  }

  return redisClient;
}

/**
 * Redis 연결 시도
 */
export async function connectRedis(): Promise<boolean> {
  try {
    const client = getRedisClient();
    await client.connect();
    await client.ping();
    return true;
  } catch (error) {
    console.error('[Redis] 연결 실패:', error);
    return false;
  }
}

/**
 * Redis 연결 종료
 */
export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    console.log('[Redis] 연결 해제됨');
  }
}

/**
 * Redis 연결 상태 확인
 */
export function isRedisConnected(): boolean {
  return redisClient?.status === 'ready';
}

/**
 * Redis가 사용 가능한지 확인 (환경변수 기반)
 */
export function isRedisEnabled(): boolean {
  return !!(process.env.REDIS_URL || process.env.REDIS_HOST);
}

// 편의를 위한 기본 내보내기
export const redis = {
  getClient: getRedisClient,
  connect: connectRedis,
  disconnect: disconnectRedis,
  isConnected: isRedisConnected,
  isEnabled: isRedisEnabled,
};

export default redis;
