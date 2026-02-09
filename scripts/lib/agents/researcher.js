/**
 * Researcher 에이전트
 *
 * 웹 검색, 자료 수집/분석 담당
 * 도구: tavily, web_fetch, read_docs
 */

import { BaseAgent } from './base-agent.js';
import { researchTopic, isTavilyAvailable } from '../tavily-search.js';
import { fetchReferenceContents } from '../web-fetcher.js';

export class ResearcherAgent extends BaseAgent {
  constructor() {
    super({
      role: 'researcher',
      name: 'Researcher',
      systemPrompt: `당신은 기술 리서치 전문가입니다.
주어진 주제에 대해 웹 검색 결과와 참고 자료를 분석하여
핵심 정보를 구조화된 형태로 정리합니다.

규칙:
- 사실 기반의 정보만 포함
- 출처를 명확히 표기
- 한국어로 분석 결과 작성
- JSON 형식으로 응답

응답 형식:
{
  "topic": "주제",
  "keyConcepts": ["핵심 개념1", "핵심 개념2"],
  "summary": "종합 분석 요약",
  "sources": [{"title": "제목", "url": "URL", "relevance": "관련성 설명"}],
  "suggestedSections": ["제안 섹션1", "제안 섹션2"]
}`,
      tools: ['tavily', 'web_fetch', 'read_docs'],
      outputFormat: 'json',
      temperature: 0.1,
      maxTokens: 4000,
    });
  }

  /**
   * 리서치 실행
   * @param {Object} task - 태스크 (input: { topic, issueBody, referenceContents })
   * @param {Object} context - 컨텍스트
   * @returns {Promise<Object>} 리서치 결과
   */
  async run(task, context) {
    const { topic, issueBody, referenceContents } = task.input;

    // 1. Tavily 검색 (가능한 경우)
    let tavilyResults = [];
    if (this.canUseTool('tavily') && isTavilyAvailable()) {
      tavilyResults = await researchTopic(topic);
    }

    // 2. 기존 참고 URL 콘텐츠 활용
    const urlResults = referenceContents || [];

    // 3. LLM으로 종합 분석
    const researchData = this.buildResearchData(tavilyResults, urlResults);

    const prompt = `다음 주제에 대한 리서치 자료를 분석하고 정리해주세요.

## 주제: ${topic}
## 요청 내용: ${issueBody || '(추가 설명 없음)'}

## 수집된 자료
${researchData}

위 자료를 분석하여 JSON 형식으로 응답하세요.`;

    const response = await this.callLLM(prompt);

    try {
      const cleaned = response.replace(/```json\n?|\n?```/g, '').trim();
      const analysis = JSON.parse(cleaned);
      return {
        ...analysis,
        rawSources: { tavilyResults, urlResults },
      };
    } catch {
      return {
        topic,
        keyConcepts: [],
        summary: response,
        sources: [],
        suggestedSections: [],
        rawSources: { tavilyResults, urlResults },
      };
    }
  }

  /**
   * 리서치 데이터를 텍스트로 변환
   */
  buildResearchData(tavilyResults, urlResults) {
    const parts = [];

    if (tavilyResults.length > 0) {
      parts.push('### 웹 검색 결과');
      for (const r of tavilyResults) {
        parts.push(`\n**${r.title}** (${r.url})`);
        parts.push(r.snippet);
      }
    }

    if (urlResults.length > 0) {
      parts.push('\n### 참고 URL 내용');
      for (const r of urlResults) {
        parts.push(`\n**${r.title}** (${r.url})`);
        parts.push((r.content || '').slice(0, 2000));
      }
    }

    return parts.length > 0 ? parts.join('\n') : '(수집된 자료 없음)';
  }
}
