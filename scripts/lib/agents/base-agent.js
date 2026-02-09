/**
 * 에이전트 기본 클래스
 *
 * 모든 전문 에이전트(Researcher, Writer, Reviewer, Editor)의 부모 클래스
 * 공통 LLM 호출, 도구 권한 확인, 실행 추적 기능 제공
 */

import { callOpenAI } from '../utils.js';

export class BaseAgent {
  /**
   * @param {Object} definition - 에이전트 정의
   * @param {string} definition.role - 에이전트 역할 ID
   * @param {string} definition.name - 에이전트 이름 (표시용)
   * @param {string} definition.systemPrompt - 시스템 프롬프트
   * @param {string[]} definition.tools - 사용 가능한 도구 목록
   * @param {'markdown'|'json'|'text'} definition.outputFormat - 출력 형식
   * @param {number} definition.temperature - LLM 온도
   * @param {number} definition.maxTokens - 최대 토큰 수
   */
  constructor(definition) {
    this.role = definition.role;
    this.name = definition.name;
    this.systemPrompt = definition.systemPrompt;
    this.tools = definition.tools || [];
    this.outputFormat = definition.outputFormat || 'text';
    this.temperature = definition.temperature ?? 0.1;
    this.maxTokens = definition.maxTokens ?? 4000;
  }

  /**
   * 태스크 실행 (서브클래스에서 오버라이드)
   * @param {Object} task - 태스크 객체
   * @param {Object} context - 실행 컨텍스트
   * @returns {Promise<Object>} 실행 결과
   */
  async execute(task, context) {
    const start = Date.now();
    console.log(`🤖 [${this.name}] 태스크 실행: ${task.type}`);

    try {
      const result = await this.run(task, context);
      const durationMs = Date.now() - start;

      console.log(`   ✅ [${this.name}] 완료 (${(durationMs / 1000).toFixed(1)}초)`);

      return {
        success: true,
        output: result,
        agent: this.role,
        durationMs,
      };
    } catch (error) {
      const durationMs = Date.now() - start;
      console.error(`   ❌ [${this.name}] 실패: ${error.message}`);

      return {
        success: false,
        error: error.message,
        agent: this.role,
        durationMs,
      };
    }
  }

  /**
   * 실제 작업 수행 (서브클래스에서 구현)
   * @param {Object} task - 태스크 객체
   * @param {Object} context - 실행 컨텍스트
   * @returns {Promise<*>} 작업 결과
   */
  async run(task, context) {
    throw new Error(`${this.name}: run() 메서드가 구현되지 않았습니다.`);
  }

  /**
   * 에이전트 설정이 적용된 LLM 호출
   * @param {string} userPrompt - 사용자 프롬프트
   * @param {Object} [opts] - 추가 옵션 (temperature, maxTokens 오버라이드 가능)
   * @returns {Promise<string>} LLM 응답
   */
  async callLLM(userPrompt, opts = {}) {
    const messages = [
      { role: 'system', content: this.systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    const options = {
      temperature: opts.temperature ?? this.temperature,
      maxTokens: opts.maxTokens ?? this.maxTokens,
    };

    // JSON 출력 형식이면 response_format 설정
    if (this.outputFormat === 'json') {
      options.responseFormat = 'json_object';
    }

    return callOpenAI(messages, options);
  }

  /**
   * 도구 사용 권한 확인
   * @param {string} tool - 도구 이름
   * @returns {boolean}
   */
  canUseTool(tool) {
    return this.tools.includes(tool);
  }

  /**
   * 에이전트 정보 반환
   * @returns {Object}
   */
  getInfo() {
    return {
      role: this.role,
      name: this.name,
      tools: this.tools,
      outputFormat: this.outputFormat,
      temperature: this.temperature,
      maxTokens: this.maxTokens,
    };
  }
}
