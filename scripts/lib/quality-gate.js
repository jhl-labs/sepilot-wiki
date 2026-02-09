/**
 * 품질 게이트
 *
 * 발행 전 규칙 기반 + AI 기반 다중 품질 체크
 * 규칙 체크 (LLM 없음) + AI 체크를 조합하여 최종 점수 산출
 */

import { callOpenAI } from './utils.js';

/**
 * 규칙 기반 체크 (LLM 없음, 빠름)
 *
 * @param {string} content - 문서 내용
 * @returns {Array<{name: string, passed: boolean, severity: string, detail: string}>}
 */
export function runRuleBasedChecks(content) {
  const checks = [];

  // 1. Frontmatter 존재 여부
  const hasFrontmatter = /^---\n[\s\S]*?\n---/.test(content);
  checks.push({
    name: 'frontmatter_exists',
    passed: hasFrontmatter,
    severity: 'error',
    detail: hasFrontmatter ? 'Frontmatter 존재' : 'Frontmatter 누락',
  });

  // 2. title 필드 존재
  const hasTitle = /^title:\s*.+/m.test(content);
  checks.push({
    name: 'title_field',
    passed: hasTitle,
    severity: 'error',
    detail: hasTitle ? 'title 필드 존재' : 'title 필드 누락',
  });

  // 3. status 필드 존재
  const hasStatus = /^status:\s*.+/m.test(content);
  checks.push({
    name: 'status_field',
    passed: hasStatus,
    severity: 'warning',
    detail: hasStatus ? 'status 필드 존재' : 'status 필드 누락',
  });

  // 4. 최소 길이 (500자 이상)
  const minLength = content.length >= 500;
  checks.push({
    name: 'minimum_length',
    passed: minLength,
    severity: 'warning',
    detail: `문서 길이: ${content.length}자 (최소 500자)`,
  });

  // 5. H1 사용 금지 (frontmatter 외부)
  const bodyContent = content.replace(/^---\n[\s\S]*?\n---/, '');
  const hasH1 = /^#\s+/m.test(bodyContent);
  checks.push({
    name: 'no_h1_in_body',
    passed: !hasH1,
    severity: 'warning',
    detail: hasH1 ? '본문에 H1(#) 사용됨 (H2부터 시작 권장)' : 'H1 미사용 (올바름)',
  });

  // 6. 민감 정보 패턴 체크
  const sensitivePatterns = [
    /(?:api[_-]?key|secret|password|token)\s*[:=]\s*['"][^'"]{10,}/i,
    /(?:sk-|ghp_|gho_|ghu_|ghs_|ghr_)[a-zA-Z0-9]{20,}/,
  ];
  const hasSensitive = sensitivePatterns.some((p) => p.test(content));
  checks.push({
    name: 'no_sensitive_data',
    passed: !hasSensitive,
    severity: 'error',
    detail: hasSensitive ? '민감 정보 패턴 감지' : '민감 정보 없음',
  });

  // 7. 깨진 마크다운 링크 패턴
  const brokenLinks = (content.match(/\[([^\]]*)\]\(\s*\)/g) || []).length;
  checks.push({
    name: 'no_empty_links',
    passed: brokenLinks === 0,
    severity: 'warning',
    detail: brokenLinks > 0 ? `빈 링크 ${brokenLinks}개 발견` : '빈 링크 없음',
  });

  return checks;
}

/**
 * AI 기반 품질 체크
 *
 * @param {string} content - 문서 내용
 * @param {Object} context - Issue 컨텍스트
 * @returns {Promise<Array<{name: string, passed: boolean, severity: string, detail: string}>>}
 */
export async function runAIChecks(content, context) {
  const systemPrompt = `당신은 기술 문서 품질 감사관입니다.
문서를 검토하고 품질 이슈를 식별합니다.

JSON 배열로 응답:
{
  "checks": [
    {
      "name": "체크_이름",
      "passed": true/false,
      "severity": "error" | "warning" | "info",
      "detail": "상세 설명"
    }
  ]
}

체크 항목:
1. factual_accuracy: 명확한 사실 오류가 있는가
2. topic_coverage: 요청 주제를 충분히 다루었는가
3. code_quality: 코드 예제가 올바른가 (있는 경우)
4. korean_quality: 한국어 문법/표현이 자연스러운가
5. structure_quality: 문서 구조가 논리적인가`;

  const userPrompt = `다음 문서를 품질 검사하세요.

원래 요청: ${context.issueTitle}

문서:
${content.slice(0, 6000)}`;

  try {
    const response = await callOpenAI(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { temperature: 0.1, maxTokens: 2000, responseFormat: 'json_object' }
    );

    const cleaned = response.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return parsed.checks || [];
  } catch {
    console.warn('⚠️ AI 품질 체크 파싱 실패');
    return [{
      name: 'ai_check_unavailable',
      passed: false,
      severity: 'warning',
      detail: 'AI 품질 체크를 수행할 수 없음 (파싱 실패)',
    }];
  }
}

/**
 * 발행 전 품질 게이트 실행
 * 규칙 기반 + AI 기반 체크를 모두 수행하고 종합 점수 산출
 *
 * @param {string} content - 문서 내용
 * @param {Object} context - Issue 컨텍스트
 * @returns {Promise<{passed: boolean, score: number, checks: Array}>}
 */
export async function runPrePublishGate(content, context) {
  console.log('🔍 품질 게이트 실행...');

  // 1. 규칙 기반 체크 (항상 실행)
  const ruleChecks = runRuleBasedChecks(content);

  // 2. AI 기반 체크 (가능한 경우)
  let aiChecks = [];
  try {
    aiChecks = await runAIChecks(content, context);
  } catch (error) {
    console.warn(`⚠️ AI 체크 건너뜀: ${error.message}`);
  }

  // 3. 결과 종합
  const allChecks = [...ruleChecks, ...aiChecks];

  // 점수 계산: error=20점 감점, warning=10점 감점, info=5점 감점
  const penalties = { error: 20, warning: 10, info: 5 };
  let score = 100;

  for (const check of allChecks) {
    if (!check.passed) {
      score -= penalties[check.severity] || 5;
    }
  }

  score = Math.max(0, Math.min(100, score));

  // error 등급 실패가 하나라도 있으면 미통과
  const hasError = allChecks.some((c) => !c.passed && c.severity === 'error');
  const passed = !hasError && score >= 60;

  console.log(`   📊 품질 점수: ${score}/100 (${passed ? '✅ 통과' : '❌ 미통과'})`);
  console.log(`   체크: 총 ${allChecks.length}개 (실패 ${allChecks.filter((c) => !c.passed).length}개)`);

  return {
    passed,
    score,
    checks: allChecks,
  };
}
