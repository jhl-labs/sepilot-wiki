/**
 * 태스크 큐 관리자
 *
 * JSON 기반 영속적 태스크 큐로 에이전트 작업 상태를 관리
 * 태스크 생성, 상태 업데이트, 의존성 관리, 재시도 기능 제공
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { randomUUID } from 'crypto';

// 태스크 큐 파일 경로
const DATA_DIR = join(process.cwd(), 'public', 'data');
const QUEUE_FILE = join(DATA_DIR, 'task-queue.json');

/** 기본 최대 재시도 횟수 */
const DEFAULT_MAX_RETRIES = 2;

/** 기본 타임아웃 (분) */
const DEFAULT_TIMEOUT_MIN = 15;

/**
 * 태스크 큐 로드
 * @returns {Promise<{tasks: Array, lastUpdated: string}>}
 */
export async function loadTaskQueue() {
  try {
    if (!existsSync(QUEUE_FILE)) {
      return { tasks: [], lastUpdated: new Date().toISOString() };
    }
    const content = await readFile(QUEUE_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.warn('태스크 큐 로드 실패, 새로 생성:', error.message);
    return { tasks: [], lastUpdated: new Date().toISOString() };
  }
}

/**
 * 태스크 큐 저장
 * @param {Object} queue - 태스크 큐 데이터
 */
export async function saveTaskQueue(queue) {
  await mkdir(DATA_DIR, { recursive: true });
  queue.lastUpdated = new Date().toISOString();
  await writeFile(QUEUE_FILE, JSON.stringify(queue, null, 2));
}

/**
 * 태스크 생성
 * @param {Object} taskData - 태스크 데이터
 * @param {string} taskData.type - 태스크 유형
 * @param {string} [taskData.priority='normal'] - 우선순위
 * @param {number} [taskData.issueNumber] - Issue 번호
 * @param {string} [taskData.documentSlug] - 문서 슬러그
 * @param {string} [taskData.parentTaskId] - 부모 태스크 ID
 * @param {string[]} [taskData.dependsOn] - 의존 태스크 ID 배열
 * @param {Object} taskData.input - 태스크 입력 데이터
 * @param {string} [taskData.assignedAgent] - 배정할 에이전트 역할
 * @param {number} [taskData.maxRetries=2] - 최대 재시도 횟수
 * @returns {Promise<Object>} 생성된 태스크
 */
export async function createTask(taskData) {
  const queue = await loadTaskQueue();

  const task = {
    id: randomUUID(),
    type: taskData.type,
    status: 'pending',
    priority: taskData.priority || 'normal',
    issueNumber: taskData.issueNumber || null,
    documentSlug: taskData.documentSlug || null,
    parentTaskId: taskData.parentTaskId || null,
    dependsOn: taskData.dependsOn || [],
    input: taskData.input || {},
    output: null,
    assignedAgent: taskData.assignedAgent || null,
    createdAt: new Date().toISOString(),
    completedAt: null,
    error: null,
    retryCount: 0,
    maxRetries: taskData.maxRetries ?? DEFAULT_MAX_RETRIES,
  };

  queue.tasks.push(task);
  await saveTaskQueue(queue);

  console.log(`📋 태스크 생성: [${task.type}] ${task.id.slice(0, 8)}`);
  return task;
}

/**
 * 태스크 상태 업데이트
 * @param {string} taskId - 태스크 ID
 * @param {Object} updates - 업데이트할 필드
 * @returns {Promise<Object|null>} 업데이트된 태스크
 */
export async function updateTask(taskId, updates) {
  const queue = await loadTaskQueue();
  const task = queue.tasks.find((t) => t.id === taskId);

  if (!task) {
    console.warn(`태스크 없음: ${taskId}`);
    return null;
  }

  Object.assign(task, updates);

  if (updates.status === 'completed') {
    task.completedAt = new Date().toISOString();
  }

  await saveTaskQueue(queue);
  return task;
}

/**
 * 다음 실행 가능한 태스크 조회
 * 의존성이 모두 완료된 pending 태스크 중 우선순위가 가장 높은 것
 *
 * @param {string} [agentRole] - 특정 에이전트용 태스크만 필터
 * @returns {Promise<Object|null>}
 */
export async function getNextTask(agentRole) {
  const queue = await loadTaskQueue();

  const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };

  const completedIds = new Set(
    queue.tasks.filter((t) => t.status === 'completed').map((t) => t.id)
  );

  const available = queue.tasks
    .filter((t) => {
      if (t.status !== 'pending') return false;
      if (agentRole && t.assignedAgent !== agentRole) return false;
      // 의존성 확인
      if (t.dependsOn.length > 0) {
        return t.dependsOn.every((depId) => completedIds.has(depId));
      }
      return true;
    })
    .sort((a, b) => (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2));

  return available[0] || null;
}

/**
 * 파이프라인 태스크 체인 생성
 * 하나의 Issue에 대해 research → outline → write → review → refine 순서로 태스크 생성
 *
 * @param {number} issueNumber - Issue 번호
 * @param {Object} input - 공통 입력 데이터
 * @returns {Promise<Object[]>} 생성된 태스크 배열
 */
export async function createPipelineTasks(issueNumber, input) {
  const parentId = randomUUID();
  const tasks = [];

  // 에이전트 ↔ 태스크 타입 매핑
  const pipeline = [
    { type: 'research', agent: 'researcher' },
    { type: 'outline', agent: 'writer' },
    { type: 'write', agent: 'writer' },
    { type: 'review', agent: 'reviewer' },
    { type: 'refine', agent: 'editor' },
  ];

  let previousTaskId = null;

  for (const step of pipeline) {
    const taskData = {
      type: step.type,
      priority: 'normal',
      issueNumber,
      parentTaskId: parentId,
      dependsOn: previousTaskId ? [previousTaskId] : [],
      input: { ...input, pipelineParentId: parentId },
      assignedAgent: step.agent,
    };

    const task = await createTask(taskData);
    tasks.push(task);
    previousTaskId = task.id;
  }

  console.log(
    `🔗 파이프라인 태스크 체인 생성: ${tasks.length}개 (Issue #${issueNumber})`
  );

  return tasks;
}

/**
 * 실패한 태스크 재시도
 * @param {string} taskId - 태스크 ID
 * @returns {Promise<Object|null>} 재시도를 위해 초기화된 태스크
 */
export async function retryTask(taskId) {
  const queue = await loadTaskQueue();
  const task = queue.tasks.find((t) => t.id === taskId);

  if (!task) {
    console.warn(`태스크 없음: ${taskId}`);
    return null;
  }

  if (task.status !== 'failed') {
    console.warn(`재시도 불가: 태스크 상태가 failed가 아님 (${task.status})`);
    return null;
  }

  if (task.retryCount >= task.maxRetries) {
    console.warn(`재시도 한도 초과: ${task.retryCount}/${task.maxRetries}`);
    return null;
  }

  task.status = 'pending';
  task.retryCount += 1;
  task.error = null;
  task.completedAt = null;

  await saveTaskQueue(queue);

  console.log(`🔄 태스크 재시도: [${task.type}] ${taskId.slice(0, 8)} (${task.retryCount}/${task.maxRetries})`);
  return task;
}

/**
 * 타임아웃된 태스크 정리
 * in_progress 상태로 오래 머문 태스크를 failed로 변경
 *
 * @param {number} [timeoutMin=15] - 타임아웃 (분)
 * @returns {Promise<number>} 정리된 태스크 수
 */
export async function cleanupStaleTasks(timeoutMin = DEFAULT_TIMEOUT_MIN) {
  const queue = await loadTaskQueue();
  const now = Date.now();
  const timeoutMs = timeoutMin * 60 * 1000;
  let cleaned = 0;

  for (const task of queue.tasks) {
    if (task.status === 'in_progress') {
      const elapsed = now - new Date(task.createdAt).getTime();
      if (elapsed > timeoutMs) {
        task.status = 'failed';
        task.error = `타임아웃 (${timeoutMin}분 초과)`;
        task.completedAt = new Date().toISOString();
        cleaned++;
      }
    }
  }

  if (cleaned > 0) {
    await saveTaskQueue(queue);
    console.log(`🧹 ${cleaned}개 타임아웃 태스크 정리 완료`);
  }

  return cleaned;
}

/**
 * Issue별 태스크 조회
 * @param {number} issueNumber - Issue 번호
 * @returns {Promise<Object[]>}
 */
export async function getTasksByIssue(issueNumber) {
  const queue = await loadTaskQueue();
  return queue.tasks.filter((t) => t.issueNumber === issueNumber);
}

/**
 * 태스크 큐 통계
 * @returns {Promise<Object>}
 */
export async function getQueueStats() {
  const queue = await loadTaskQueue();
  const stats = {
    total: queue.tasks.length,
    pending: 0,
    in_progress: 0,
    completed: 0,
    failed: 0,
    cancelled: 0,
  };

  for (const task of queue.tasks) {
    if (stats[task.status] !== undefined) {
      stats[task.status]++;
    }
  }

  return stats;
}
