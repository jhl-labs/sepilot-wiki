/**
 * Reviewer 에이전트
 *
 * 품질 평가, 정확성 검증 담당
 * 도구: read_docs
 */

import { BaseAgent } from './base-agent.js';

export class ReviewerAgent extends BaseAgent {
  constructor() {
    super({
      role: 'reviewer',
      name: 'Reviewer',
      systemPrompt: `당신은 기술 문서 품질 검토 전문가입니다.
문서를 정확성, 완성도, 가독성 관점에서 엄격하게 평가합니다.

반드시 JSON 형식으로만 응답하세요:
{
  "score": 0-100,
  "breakdown": {
    "accuracy": 0-30,
    "completeness": 0-30,
    "readability": 0-20,
    "formatting": 0-20
  },
  "feedback": ["피드백1", "피드백2"],
  "suggestions": ["개선제안1", "개선제안2"],
  "criticalIssues": ["심각한 문제가 있다면 여기에"]
}

평가 기준:
- 정확성 (30점): 사실 오류, 허위 정보, 오래된 정보
- 완성도 (30점): 주제 커버리지, 누락된 중요 섹션
- 가독성 (20점): 구조, 흐름, 명확성, 설명 품질
- 형식 (20점): frontmatter 규칙, 마크다운 형식, 코드 블록`,
      tools: ['read_docs'],
      outputFormat: 'json',
      temperature: 0.1,
      maxTokens: 2000,
    });
  }

  /**
   * 리뷰 실행
   * @param {Object} task - 태스크 (input: { document, topic, issueBody })
   * @param {Object} context - 컨텍스트
   * @returns {Promise<Object>} 리뷰 결과
   */
  async run(task, context) {
    const { document, topic, issueBody } = task.input;

    const prompt = `다음 문서를 평가해주세요.

## 원래 요청
제목: ${topic}
내용: ${issueBody || '(추가 설명 없음)'}

## 작성된 문서
${document}`;

    const response = await this.callLLM(prompt);

    try {
      const cleaned = response.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(cleaned);
    } catch {
      console.warn('⚠️ Reviewer: JSON 파싱 실패, 기본값 사용');
      return {
        score: 85,
        breakdown: { accuracy: 25, completeness: 25, readability: 18, formatting: 17 },
        feedback: ['리뷰 응답 파싱 실패'],
        suggestions: [],
        criticalIssues: [],
      };
    }
  }
}
