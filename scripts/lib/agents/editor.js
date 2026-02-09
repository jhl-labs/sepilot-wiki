/**
 * Editor 에이전트
 *
 * 리뷰 반영, 교정 담당
 * 도구: read_doc, write_doc
 */

import { BaseAgent } from './base-agent.js';

export class EditorAgent extends BaseAgent {
  constructor() {
    super({
      role: 'editor',
      name: 'Editor',
      systemPrompt: `당신은 기술 문서 편집 전문가입니다.
리뷰 피드백을 반영하여 문서를 개선합니다.

규칙:
- 기존 문서의 전체 구조를 유지하면서 개선
- frontmatter 형식 유지
- 한국어로 작성
- 불필요한 내용 추가 금지
- 마크다운 코드 블록 없이 순수 마크다운만 반환`,
      tools: ['read_doc', 'write_doc'],
      outputFormat: 'markdown',
      temperature: 0.2,
      maxTokens: 8000,
    });
  }

  /**
   * 편집 실행
   * @param {Object} task - 태스크 (input: { document, review, topic })
   * @param {Object} context - 컨텍스트
   * @returns {Promise<string>} 개선된 문서
   */
  async run(task, context) {
    const { document, review, topic } = task.input;

    const feedbackText = this.formatReview(review);

    const prompt = `다음 문서를 리뷰 피드백에 따라 개선해주세요.

## 원래 주제: ${topic}

## 리뷰 피드백
${feedbackText}

## 원본 문서
${document}

개선된 전체 문서를 반환하세요. 마크다운 코드 블록(\`\`\`) 없이 순수 마크다운만 반환하세요.`;

    return this.callLLM(prompt);
  }

  /**
   * 리뷰 결과를 텍스트로 포맷
   * @param {Object} review - 리뷰 결과
   * @returns {string}
   */
  formatReview(review) {
    const lines = [`점수: ${review.score}/100`];

    if (review.breakdown) {
      lines.push(`  - 정확성: ${review.breakdown.accuracy}/30`);
      lines.push(`  - 완성도: ${review.breakdown.completeness}/30`);
      lines.push(`  - 가독성: ${review.breakdown.readability}/20`);
      lines.push(`  - 형식: ${review.breakdown.formatting}/20`);
    }

    if (review.criticalIssues?.length > 0) {
      lines.push('\n심각한 문제:');
      review.criticalIssues.forEach((issue) => lines.push(`  ❗ ${issue}`));
    }

    if (review.feedback?.length > 0) {
      lines.push('\n피드백:');
      review.feedback.forEach((f) => lines.push(`  - ${f}`));
    }

    if (review.suggestions?.length > 0) {
      lines.push('\n개선 제안:');
      review.suggestions.forEach((s) => lines.push(`  - ${s}`));
    }

    return lines.join('\n');
  }
}
