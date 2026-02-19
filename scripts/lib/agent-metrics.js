/**
 * 에이전트 메트릭 수집
 *
 * 에이전트별 실행 시간, LLM 토큰 사용량, 리뷰 점수, 재시도 횟수 추적
 * 저장: public/data/agent-metrics.json
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const DATA_DIR = join(process.cwd(), 'public', 'data');
const METRICS_FILE = join(DATA_DIR, 'agent-metrics.json');

/** 최대 메트릭 항목 수 (오래된 것부터 삭제) */
const MAX_ENTRIES = 500;

/**
 * 기존 메트릭 로드
 * @returns {Promise<Object>}
 */
async function loadMetrics() {
  if (!existsSync(METRICS_FILE)) {
    return { entries: [], summary: {}, lastUpdated: null };
  }
  try {
    return JSON.parse(await readFile(METRICS_FILE, 'utf-8'));
  } catch {
    return { entries: [], summary: {}, lastUpdated: null };
  }
}

/**
 * 메트릭 저장
 * @param {Object} data
 */
async function saveMetrics(data) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(METRICS_FILE, JSON.stringify(data, null, 2));
}

/**
 * 에이전트 실행 메트릭 기록
 *
 * @param {Object} metric
 * @param {string} metric.agent - 에이전트 역할
 * @param {string} metric.taskType - 태스크 유형
 * @param {number} metric.durationMs - 실행 시간 (ms)
 * @param {boolean} metric.success - 성공 여부
 * @param {Object} [metric.usage] - LLM 토큰 사용량
 * @param {number} [metric.usage.promptTokens] - 프롬프트 토큰
 * @param {number} [metric.usage.completionTokens] - 완성 토큰
 * @param {number} [metric.usage.totalTokens] - 총 토큰
 * @param {number} [metric.reviewScore] - 리뷰 점수 (reviewer만 해당)
 * @param {number} [metric.retryCount] - 재시도 횟수
 * @param {string} [metric.promptVersion] - 사용된 프롬프트 버전 ID
 */
export async function recordAgentMetric(metric) {
  const data = await loadMetrics();

  data.entries.push({
    ...metric,
    timestamp: new Date().toISOString(),
  });

  // 최대 항목 수 제한
  if (data.entries.length > MAX_ENTRIES) {
    data.entries = data.entries.slice(-MAX_ENTRIES);
  }

  // 요약 통계 갱신
  data.summary = computeSummary(data.entries);
  data.lastUpdated = new Date().toISOString();

  await saveMetrics(data);
}

/**
 * 에이전트별 요약 통계 계산
 * @param {Array} entries
 * @returns {Object}
 */
function computeSummary(entries) {
  const summary = {};

  for (const entry of entries) {
    const agent = entry.agent;
    if (!summary[agent]) {
      summary[agent] = {
        totalRuns: 0,
        successCount: 0,
        failCount: 0,
        totalDurationMs: 0,
        totalTokens: 0,
        avgDurationMs: 0,
        avgTokens: 0,
        avgReviewScore: null,
        reviewScores: [],
      };
    }

    const s = summary[agent];
    s.totalRuns++;
    if (entry.success) s.successCount++;
    else s.failCount++;
    s.totalDurationMs += entry.durationMs || 0;
    s.totalTokens += entry.usage?.totalTokens || 0;

    if (entry.reviewScore != null) {
      s.reviewScores.push(entry.reviewScore);
    }
  }

  // 평균 계산
  for (const s of Object.values(summary)) {
    s.avgDurationMs = s.totalRuns > 0 ? Math.round(s.totalDurationMs / s.totalRuns) : 0;
    s.avgTokens = s.totalRuns > 0 ? Math.round(s.totalTokens / s.totalRuns) : 0;
    if (s.reviewScores.length > 0) {
      s.avgReviewScore = Math.round(
        s.reviewScores.reduce((a, b) => a + b, 0) / s.reviewScores.length
      );
    }
    delete s.reviewScores;
  }

  return summary;
}

/**
 * 메트릭 데이터 조회
 * @returns {Promise<Object>}
 */
export async function getAgentMetrics() {
  return loadMetrics();
}
