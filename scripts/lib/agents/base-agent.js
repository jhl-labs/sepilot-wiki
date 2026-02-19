/**
 * 에이전트 기본 클래스
 *
 * 모든 전문 에이전트(Researcher, Writer, Reviewer, Editor)의 부모 클래스
 * 공통 LLM 호출, 도구 권한 확인, 실행 추적 기능 제공
 */

import { callOpenAI } from '../utils.js';
import { getEnhancedPrompt } from '../learning-loop.js';
import { recordAgentMetric } from '../agent-metrics.js';
import { trackError, createErrorIssue } from '../error-tracker.js';

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
    const maxRetries = 2;
    console.log(`🤖 [${this.name}] 태스크 실행: ${task.type}`);

    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.run(task, context);
        const durationMs = Date.now() - start;

        console.log(`   ✅ [${this.name}] 완료 (${(durationMs / 1000).toFixed(1)}초)`);

        // 메트릭 기록 (비동기, 실패 무시)
        recordAgentMetric({
          agent: this.role,
          taskType: task.type,
          durationMs,
          success: true,
          usage: this._lastUsage || null,
          reviewScore: result?.score ?? null,
          promptVersion: this._lastPromptVersion || null,
          retryCount: attempt - 1,
        }).catch(() => {});

        return {
          success: true,
          output: result,
          agent: this.role,
          durationMs,
          usage: this._lastUsage || null,
        };
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) {
          console.warn(`   ⚠️ [${this.name}] 재시도 (${attempt}/${maxRetries}): ${error.message}`);
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    // 모든 재시도 실패
    const durationMs = Date.now() - start;
    console.error(`   ❌ [${this.name}] 실패 (${maxRetries}회 시도): ${lastError.message}`);

    // error-tracker 자동 기록
    try {
      const tracking = await trackError({
        workflow: `agent:${this.role}`,
        step: task.type,
        message: lastError.message,
      });
      if (tracking.shouldCreateIssue) {
        await createErrorIssue({
          workflow: `agent:${this.role}`,
          step: task.type,
          message: lastError.message,
          consecutiveCount: tracking.consecutiveCount,
        });
      }
    } catch {
      // error-tracker 실패는 무시
    }

    // 실패 메트릭 기록
    recordAgentMetric({
      agent: this.role,
      taskType: task.type,
      durationMs,
      success: false,
      retryCount: maxRetries - 1,
    }).catch(() => {});

    return {
      success: false,
      error: lastError.message,
      agent: this.role,
      durationMs,
    };
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
    // 학습 루프에서 역할별 추가 지시사항 로드
    let enhancedSystemPrompt = this.systemPrompt;
    this._lastPromptVersion = null;
    try {
      const enhancement = await getEnhancedPrompt(this.role);
      if (enhancement) {
        if (typeof enhancement === 'object' && enhancement.text) {
          enhancedSystemPrompt += enhancement.text;
          this._lastPromptVersion = enhancement.version || null;
        } else {
          enhancedSystemPrompt += enhancement;
        }
      }
    } catch {
      // 학습 루프 로드 실패 시 무시
    }

    const messages = [
      { role: 'system', content: enhancedSystemPrompt },
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

    const result = await callOpenAI(messages, options);

    // 토큰 사용량 저장 (callOpenAI가 usage를 반환하는 경우)
    if (result && typeof result === 'object' && result.usage) {
      this._lastUsage = result.usage;
      return result.content;
    }

    return result;
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
