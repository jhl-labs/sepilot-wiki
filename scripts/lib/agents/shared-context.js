/**
 * 에이전트 간 공유 컨텍스트
 *
 * 오케스트레이션 세션 내에서 에이전트들이 지식을 공유하는 메커니즘
 * 세션별로 격리되며, JSON 파일로 영속화
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { randomUUID } from 'crypto';

const CONTEXT_DIR = join(process.cwd(), 'public', 'data', 'shared-context');

/**
 * 새 세션 생성
 * @param {Object} [metadata] - 세션 메타데이터
 * @returns {Promise<Object>} 세션 객체
 */
export async function createSession(metadata = {}) {
  const session = {
    sessionId: randomUUID(),
    createdAt: new Date().toISOString(),
    metadata,
    messages: [],
    sharedKnowledge: {
      researchFindings: '',
      documentOutline: '',
      reviewFeedback: [],
    },
  };

  await saveSession(session);
  console.log(`📋 공유 컨텍스트 세션 생성: ${session.sessionId.slice(0, 8)}`);
  return session;
}

/**
 * 세션 로드
 * @param {string} sessionId
 * @returns {Promise<Object|null>}
 */
export async function loadSession(sessionId) {
  const filepath = join(CONTEXT_DIR, `${sessionId}.json`);
  if (!existsSync(filepath)) return null;

  try {
    return JSON.parse(await readFile(filepath, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * 세션 저장
 * @param {Object} session
 */
export async function saveSession(session) {
  await mkdir(CONTEXT_DIR, { recursive: true });
  const filepath = join(CONTEXT_DIR, `${session.sessionId}.json`);
  await writeFile(filepath, JSON.stringify(session, null, 2));
}

/**
 * 에이전트 메시지 추가
 * @param {string} sessionId
 * @param {Object} message - { from: AgentRole, type: string, content: string }
 * @returns {Promise<Object>} 업데이트된 세션
 */
export async function addMessage(sessionId, message) {
  const session = await loadSession(sessionId);
  if (!session) throw new Error(`세션 없음: ${sessionId}`);

  session.messages.push({
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    ...message,
  });

  await saveSession(session);
  return session;
}

/**
 * 공유 지식 업데이트
 * @param {string} sessionId
 * @param {string} key - 지식 키 (researchFindings, documentOutline, reviewFeedback)
 * @param {*} value - 값
 * @returns {Promise<Object>}
 */
export async function updateSharedKnowledge(sessionId, key, value) {
  const session = await loadSession(sessionId);
  if (!session) throw new Error(`세션 없음: ${sessionId}`);

  if (key === 'reviewFeedback' && Array.isArray(session.sharedKnowledge.reviewFeedback)) {
    // reviewFeedback은 누적
    if (Array.isArray(value)) {
      session.sharedKnowledge.reviewFeedback.push(...value);
    } else {
      session.sharedKnowledge.reviewFeedback.push(value);
    }
  } else {
    session.sharedKnowledge[key] = value;
  }

  await saveSession(session);
  return session;
}

/**
 * 세션의 전체 컨텍스트를 LLM 프롬프트용 텍스트로 변환
 * @param {string} sessionId
 * @returns {Promise<string>}
 */
export async function getContextSummary(sessionId) {
  const session = await loadSession(sessionId);
  if (!session) return '';

  const parts = [];

  if (session.sharedKnowledge.researchFindings) {
    parts.push('## 리서치 결과');
    parts.push(session.sharedKnowledge.researchFindings);
  }

  if (session.sharedKnowledge.documentOutline) {
    parts.push('\n## 문서 아웃라인');
    parts.push(session.sharedKnowledge.documentOutline);
  }

  if (session.sharedKnowledge.reviewFeedback.length > 0) {
    parts.push('\n## 리뷰 피드백');
    session.sharedKnowledge.reviewFeedback.forEach((fb, i) => {
      parts.push(`${i + 1}. ${typeof fb === 'string' ? fb : JSON.stringify(fb)}`);
    });
  }

  return parts.join('\n');
}
