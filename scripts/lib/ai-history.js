/**
 * AI History 관리 유틸리티
 * AI 작업 이력을 기록하고 관리하는 모듈
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { randomUUID } from 'crypto';

// AI History 파일 경로
const DATA_DIR = join(process.cwd(), 'public', 'data');
const HISTORY_FILE = join(DATA_DIR, 'ai-history.json');

/**
 * AI History 파일 로드
 * @returns {Promise<{entries: Array, lastUpdated: string}>}
 */
export async function loadAIHistory() {
  try {
    if (!existsSync(HISTORY_FILE)) {
      return { entries: [], lastUpdated: new Date().toISOString() };
    }
    const content = await readFile(HISTORY_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.warn('AI History 로드 실패, 새로 생성:', error.message);
    return { entries: [], lastUpdated: new Date().toISOString() };
  }
}

/**
 * AI History 파일 저장
 * @param {object} history - AI History 데이터
 */
export async function saveAIHistory(history) {
  await mkdir(DATA_DIR, { recursive: true });
  history.lastUpdated = new Date().toISOString();
  await writeFile(HISTORY_FILE, JSON.stringify(history, null, 2));
}

/**
 * 새 AI History 항목 추가
 * @param {object} entry - History 항목
 * @param {string} entry.actionType - 'generate' | 'modify' | 'publish' | 'invalid' | 'delete' | 'recover'
 * @param {number} entry.issueNumber - Issue 번호
 * @param {string} entry.issueTitle - Issue 제목
 * @param {string} entry.documentSlug - 문서 슬러그
 * @param {string} entry.documentTitle - 문서 제목
 * @param {string} entry.summary - 작업 요약
 * @param {string} entry.trigger - 트리거 유형
 * @param {string} [entry.triggerUser] - 트리거 사용자
 * @param {string} [entry.model] - 사용된 AI 모델
 * @param {object} [entry.changes] - 변경 사항 (additions, deletions)
 */
export async function addAIHistoryEntry(entry) {
  const history = await loadAIHistory();

  const newEntry = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    actionType: entry.actionType,
    issueNumber: entry.issueNumber,
    issueTitle: entry.issueTitle,
    documentSlug: entry.documentSlug,
    documentTitle: entry.documentTitle,
    summary: entry.summary,
    trigger: entry.trigger,
    triggerUser: entry.triggerUser || null,
    model: entry.model || process.env.OPENAI_MODEL || 'unknown',
    changes: entry.changes || null,
  };

  // 최신 항목이 앞에 오도록
  history.entries.unshift(newEntry);

  // 최대 1000개 항목만 유지
  if (history.entries.length > 1000) {
    history.entries = history.entries.slice(0, 1000);
  }

  await saveAIHistory(history);

  console.log(`📝 AI History 기록 완료: ${entry.actionType} - ${entry.documentSlug}`);

  return newEntry;
}

/**
 * 특정 문서의 AI History 조회
 * @param {string} slug - 문서 슬러그
 * @returns {Promise<Array>}
 */
export async function getDocumentAIHistory(slug) {
  const history = await loadAIHistory();
  return history.entries.filter(entry => entry.documentSlug === slug);
}

/**
 * 액션 타입 한글 변환
 * @param {string} actionType
 * @returns {string}
 */
export function getActionTypeLabel(actionType) {
  const labels = {
    generate: '문서 생성',
    modify: '문서 수정',
    publish: '문서 발행',
    unpublish: '발행 취소',
    invalid: '오류 수정',
    delete: '문서 삭제',
    recover: '문서 복구',
    maintain: '구조 정비',
  };
  return labels[actionType] || actionType;
}

/**
 * 트리거 타입 한글 변환
 * @param {string} trigger
 * @returns {string}
 */
export function getTriggerLabel(trigger) {
  const labels = {
    request_label: 'request 라벨',
    invalid_label: 'invalid 라벨',
    maintainer_comment: 'Maintainer 피드백',
    issue_close: 'Issue 종료',
    scheduled: '정기 스케줄',
  };
  return labels[trigger] || trigger;
}
