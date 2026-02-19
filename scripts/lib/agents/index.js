/**
 * 에이전트 레지스트리
 *
 * 모든 에이전트를 중앙 관리하고, 역할별로 인스턴스를 제공
 */

import { ResearcherAgent } from './researcher.js';
import { WriterAgent } from './writer.js';
import { ReviewerAgent } from './reviewer.js';
import { EditorAgent } from './editor.js';
import { FactCheckerAgent } from './fact-checker.js';
import { ValidatorAgent } from './validator.js';

/** 에이전트 인스턴스 캐시 (싱글턴) */
const agentInstances = {};

/**
 * 역할별 에이전트 클래스 매핑
 */
const AGENT_CLASSES = {
  researcher: ResearcherAgent,
  writer: WriterAgent,
  reviewer: ReviewerAgent,
  editor: EditorAgent,
  'fact-checker': FactCheckerAgent,
  validator: ValidatorAgent,
};

/**
 * 역할로 에이전트 인스턴스 가져오기
 * @param {string} role - 에이전트 역할 ('researcher' | 'writer' | 'reviewer' | 'editor')
 * @returns {import('./base-agent.js').BaseAgent}
 */
export function getAgent(role) {
  if (!agentInstances[role]) {
    const AgentClass = AGENT_CLASSES[role];
    if (!AgentClass) {
      throw new Error(`알 수 없는 에이전트 역할: ${role}`);
    }
    agentInstances[role] = new AgentClass();
  }
  return agentInstances[role];
}

/**
 * 모든 에이전트 역할 목록
 * @returns {string[]}
 */
export function getAvailableRoles() {
  return Object.keys(AGENT_CLASSES);
}

/**
 * 모든 에이전트 정보 조회
 * @returns {Array<Object>}
 */
export function getAllAgentInfo() {
  return Object.keys(AGENT_CLASSES).map((role) => getAgent(role).getInfo());
}

// 에이전트 클래스 내보내기
export { BaseAgent } from './base-agent.js';
export { ResearcherAgent } from './researcher.js';
export { WriterAgent } from './writer.js';
export { ReviewerAgent } from './reviewer.js';
export { EditorAgent } from './editor.js';
export { FactCheckerAgent } from './fact-checker.js';
export { ValidatorAgent } from './validator.js';
