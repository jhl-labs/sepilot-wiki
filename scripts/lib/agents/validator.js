/**
 * 문서 검증 에이전트
 *
 * 프론트매터 스키마 검증, 내부 링크 유효성, 코드 블록 문법 검사
 * LLM 불필요 (규칙 기반)
 */

import { BaseAgent } from './base-agent.js';
import { validateFrontmatter } from '../frontmatter-schema.js';
import { runRuleBasedChecks } from '../quality-gate.js';

export class ValidatorAgent extends BaseAgent {
  constructor() {
    super({
      role: 'validator',
      name: 'Validator',
      systemPrompt: '',
      tools: [],
      outputFormat: 'json',
      temperature: 0,
      maxTokens: 0,
    });
  }

  /**
   * 규칙 기반 검증 (LLM 호출 없음)
   */
  async run(task) {
    const document = task.input?.document || '';
    const slug = task.input?.slug || 'unknown';
    const results = {
      frontmatter: null,
      ruleChecks: [],
      links: [],
      codeBlocks: [],
      passed: true,
      corrections: [],
    };

    // 1. 프론트매터 스키마 검증
    const frontmatterMatch = document.match(/^---\n([\s\S]*?)\n---/);
    if (frontmatterMatch) {
      // 간단한 YAML 파싱 (gray-matter 없이)
      const metadata = {};
      frontmatterMatch[1].split('\n').forEach((line) => {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          const key = line.slice(0, colonIndex).trim();
          const value = line.slice(colonIndex + 1).trim().replace(/['\"]/g, '');
          metadata[key] = value;
        }
      });
      results.frontmatter = validateFrontmatter(metadata, slug);
      if (!results.frontmatter.valid) {
        results.passed = false;
      }
    } else {
      results.frontmatter = { valid: false, errors: ['프론트매터 없음'], warnings: [], corrected: {} };
      results.passed = false;
    }

    // 2. 규칙 기반 품질 체크 (quality-gate에서 흡수)
    results.ruleChecks = runRuleBasedChecks(document);
    const hasErrors = results.ruleChecks.some((c) => !c.passed && c.severity === 'error');
    if (hasErrors) {
      results.passed = false;
    }

    // 3. 내부 링크 유효성 검사
    const internalLinkRegex = /\[([^\]]+)\]\((?:\.\/|\/wiki\/)([^)]+)\)/g;
    let match;
    while ((match = internalLinkRegex.exec(document)) !== null) {
      results.links.push({
        text: match[1],
        target: match[2].replace('.md', ''),
        line: document.substring(0, match.index).split('\n').length,
      });
    }

    // 4. 코드 블록 문법 검사
    const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
    while ((match = codeBlockRegex.exec(document)) !== null) {
      const language = match[1] || 'text';
      const code = match[2];
      const lineNum = document.substring(0, match.index).split('\n').length;

      const check = { language, line: lineNum, valid: true, issue: null };

      // 기본 문법 체크 (중괄호/괄호 짝 맞춤)
      if (['js', 'javascript', 'ts', 'typescript', 'json', 'java', 'go'].includes(language)) {
        const openBraces = (code.match(/\{/g) || []).length;
        const closeBraces = (code.match(/\}/g) || []).length;
        if (openBraces !== closeBraces) {
          check.valid = false;
          check.issue = `중괄호 불일치: { ${openBraces}개, } ${closeBraces}개`;
        }
      }

      // JSON 검증
      if (language === 'json') {
        try {
          JSON.parse(code);
        } catch (e) {
          check.valid = false;
          check.issue = `잘못된 JSON: ${e.message}`;
        }
      }

      results.codeBlocks.push(check);
    }

    // 5. 자동 교정 제안
    if (results.frontmatter && !results.frontmatter.valid) {
      for (const err of results.frontmatter.errors) {
        results.corrections.push({ type: 'frontmatter', detail: err });
      }
    }

    return results;
  }

  // LLM 호출 오버라이드 (사용하지 않음)
  async callLLM() {
    throw new Error('ValidatorAgent는 LLM을 사용하지 않는 규칙 기반 에이전트입니다.');
  }
}
