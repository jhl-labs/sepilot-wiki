/**
 * 사실검증 에이전트
 *
 * 문서 내 사실 주장을 Tavily 검색으로 검증
 * 출력: { claims: [{claim, verified, source, confidence}], overallTrust: 0-100 }
 */

import { BaseAgent } from './base-agent.js';
import { researchTopic, isTavilyAvailable } from '../tavily-search.js';

export class FactCheckerAgent extends BaseAgent {
  constructor() {
    super({
      role: 'fact-checker',
      name: 'Fact Checker',
      systemPrompt: `당신은 기술 문서의 사실검증 전문가입니다.
문서에서 검증 가능한 사실적 주장을 추출하고, 제공된 검색 결과를 바탕으로 각 주장의 정확성을 평가합니다.

규칙:
- 주관적 의견이나 일반 상식은 검증 대상에서 제외
- 기술적 사실, 버전 정보, API 사양, 성능 수치 등을 검증
- 검증 불가능한 항목은 confidence를 낮게 설정
- 한국어로 응답

JSON으로 응답:
{
  "claims": [
    {
      "claim": "검증할 주장",
      "verified": true/false/null,
      "source": "검증 근거 URL 또는 설명",
      "confidence": 0-100
    }
  ],
  "overallTrust": 0-100
}`,
      tools: ['tavily', 'web_fetch'],
      outputFormat: 'json',
      temperature: 0.1,
      maxTokens: 4000,
    });
  }

  async run(task, context) {
    const document = task.input?.document || '';

    // Tavily로 문서 주제에 대한 사실 검증 자료 수집
    let searchResults = [];
    if (isTavilyAvailable()) {
      const topic = task.input?.topic || context.issueTitle || '';
      searchResults = await researchTopic(`fact check: ${topic}`);
    }

    const searchContext = searchResults.length > 0
      ? searchResults.map((r) => `[${r.title}](${r.url}): ${r.snippet}`).join('\n\n')
      : '(검색 결과 없음 — 문서 내용만으로 검증)';

    const response = await this.callLLM(
      `다음 문서의 사실적 주장을 검증해주세요.

## 문서 내용
${document.slice(0, 6000)}

## 검색 결과 (검증 근거)
${searchContext}`
    );

    try {
      const cleaned = response.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(cleaned);
    } catch {
      return {
        claims: [],
        overallTrust: 50,
        error: '사실검증 결과 파싱 실패',
      };
    }
  }
}
