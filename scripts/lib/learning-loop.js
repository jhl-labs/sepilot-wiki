#!/usr/bin/env node

/**
 * 학습 루프
 *
 * 피드백 패턴 분석 → 프롬프트 개선 제안
 * - Issue 댓글에서 반복되는 피드백 패턴 감지
 * - 에이전트별 프롬프트 개선 제안 생성
 * - 동적 프롬프트 템플릿 관리
 *
 * 트리거: 주 1회 (learning-loop.yml)
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, resolve } from 'path';
import { existsSync } from 'fs';
import { callOpenAI } from './utils.js';
import { addAIHistoryEntry } from './ai-history.js';

const DATA_DIR = join(process.cwd(), 'public', 'data');
const FEEDBACK_FILE = join(DATA_DIR, 'feedback-patterns.json');
const TEMPLATES_FILE = join(DATA_DIR, 'prompt-templates.json');

/** 패턴 감지 최소 빈도 */
const MIN_PATTERN_FREQUENCY = 3;

/** 경로 탐색 방지 검증 */
function validatePath(filepath) {
  const resolved = resolve(filepath);
  const base = resolve(DATA_DIR);
  if (!resolved.startsWith(base + '/') && resolved !== base) {
    throw new Error(`경로 탐색 방지: ${filepath}가 허용된 디렉토리 밖입니다.`);
  }
}

/**
 * 프롬프트 템플릿 파일 로드
 * @returns {Promise<Object>}
 */
async function loadPromptTemplates() {
  if (!existsSync(TEMPLATES_FILE)) {
    return { templates: {}, lastUpdated: null };
  }
  try {
    return JSON.parse(await readFile(TEMPLATES_FILE, 'utf-8'));
  } catch {
    return { templates: {}, lastUpdated: null };
  }
}

/**
 * AI History에서 피드백 관련 항목 추출
 * @returns {Promise<Array>}
 */
async function extractFeedbackEntries() {
  const historyFile = join(DATA_DIR, 'ai-history.json');
  if (!existsSync(historyFile)) return [];

  try {
    const data = JSON.parse(await readFile(historyFile, 'utf-8'));
    // modify, invalid 관련 항목이 피드백을 나타냄
    return (data.entries || []).filter((e) =>
      ['modify', 'invalid'].includes(e.actionType)
    );
  } catch {
    return [];
  }
}

/**
 * 피드백 패턴 분석
 * AI History의 수정/오류 이력을 분석하여 반복 패턴 감지
 *
 * @returns {Promise<Array<{pattern: string, frequency: number, affectedAgents: string[], suggestedPromptFix: string}>>}
 */
export async function analyzeFeedbackPatterns() {
  const entries = await extractFeedbackEntries();

  if (entries.length < MIN_PATTERN_FREQUENCY) {
    console.log(`📊 피드백 항목 ${entries.length}개 (최소 ${MIN_PATTERN_FREQUENCY}개 필요), 분석 건너뜀`);
    return [];
  }

  const summaries = entries
    .slice(0, 50)
    .map((e) => `[${e.actionType}] ${e.documentTitle || e.issueTitle}: ${e.summary}`)
    .join('\n');

  const systemPrompt = `당신은 AI 시스템 개선 분석가입니다.
AI가 생성한 문서의 수정/오류 이력을 분석하여 반복적인 패턴을 찾습니다.

JSON으로 응답:
{
  "patterns": [
    {
      "pattern": "패턴 설명 (예: frontmatter에 tags 필드 누락)",
      "frequency": 3,
      "affectedAgents": ["writer", "editor"],
      "suggestedPromptFix": "프롬프트에 추가할 구체적 지시사항"
    }
  ]
}

규칙:
- ${MIN_PATTERN_FREQUENCY}회 이상 반복된 패턴만 포함
- 구체적이고 실행 가능한 프롬프트 개선 제안
- 한국어로 작성`;

  const response = await callOpenAI(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `다음 수정/오류 이력을 분석하세요:\n\n${summaries}` },
    ],
    { temperature: 0.1, maxTokens: 3000, responseFormat: 'json_object' }
  );

  try {
    const cleaned = response.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return parsed.patterns || [];
  } catch {
    return [];
  }
}

/**
 * 감지된 패턴으로 프롬프트 개선 제안 생성
 *
 * @param {Array} patterns - 감지된 패턴 목록
 * @returns {Promise<Object>} 에이전트별 개선 프롬프트 맵
 */
export async function suggestPromptImprovements(patterns) {
  if (patterns.length === 0) return {};

  const improvements = {};

  for (const pattern of patterns) {
    for (const agent of pattern.affectedAgents || []) {
      if (!improvements[agent]) {
        improvements[agent] = [];
      }
      improvements[agent].push({
        pattern: pattern.pattern,
        fix: pattern.suggestedPromptFix,
        frequency: pattern.frequency,
      });
    }
  }

  return improvements;
}

/**
 * 학습된 프롬프트 로드 (에이전트 역할별)
 * 기본 프롬프트에 학습된 추가 지시사항을 병합
 * 현재 활성 버전 ID도 함께 반환
 *
 * @param {string} role - 에이전트 역할
 * @returns {Promise<{text: string, version: string|null}|string>} 추가할 프롬프트 텍스트와 버전 ID
 */
export async function getEnhancedPrompt(role) {
  const templates = await loadPromptTemplates();
  const roleTemplate = templates.templates?.[role];

  if (!roleTemplate || !roleTemplate.additions || roleTemplate.additions.length === 0) {
    return { text: '', version: roleTemplate?.version || null };
  }

  const text = '\n\n## 학습된 추가 지시사항\n' + roleTemplate.additions.map((a) => `- ${a}`).join('\n');
  return { text, version: roleTemplate.version || null };
}

/**
 * 프롬프트 버전의 성과 기록
 * 리뷰 점수를 해당 프롬프트 버전과 연결하여 추적
 *
 * @param {string} role - 에이전트 역할
 * @param {string} version - 프롬프트 버전 ID
 * @param {number} score - 리뷰 점수
 */
export async function recordPromptPerformance(role, version, score) {
  if (!role || !version || score == null) return;

  const templates = await loadPromptTemplates();
  const roleTemplate = templates.templates?.[role];
  if (!roleTemplate) return;

  if (!roleTemplate.performance) {
    roleTemplate.performance = {};
  }
  if (!roleTemplate.performance[version]) {
    roleTemplate.performance[version] = { scores: [], avgScore: 0 };
  }

  const perf = roleTemplate.performance[version];
  perf.scores.push(score);
  // 최근 20개만 유지
  if (perf.scores.length > 20) {
    perf.scores = perf.scores.slice(-20);
  }
  perf.avgScore = Math.round(perf.scores.reduce((a, b) => a + b, 0) / perf.scores.length);

  validatePath(TEMPLATES_FILE);
  await writeFile(TEMPLATES_FILE, JSON.stringify(templates, null, 2));
}

/**
 * 프롬프트 자동 롤백 검사
 * 새 프롬프트 적용 후 평균 점수가 5점 이상 하락하면 이전 버전으로 롤백
 *
 * @param {string} role - 에이전트 역할
 * @returns {Promise<boolean>} 롤백 수행 여부
 */
export async function checkAndRollbackPrompt(role) {
  const templates = await loadPromptTemplates();
  const roleTemplate = templates.templates?.[role];
  if (!roleTemplate || !roleTemplate.performance || !roleTemplate.previousVersion) return false;

  const currentVersion = roleTemplate.version;
  const previousVersion = roleTemplate.previousVersion;

  const currentPerf = roleTemplate.performance[currentVersion];
  const previousPerf = roleTemplate.performance[previousVersion];

  if (!currentPerf || !previousPerf || currentPerf.scores.length < 3) return false;

  const scoreDrop = previousPerf.avgScore - currentPerf.avgScore;
  if (scoreDrop >= 5) {
    console.warn(`⚠️ [${role}] 프롬프트 롤백: v${currentVersion} (avg ${currentPerf.avgScore}) → v${previousVersion} (avg ${previousPerf.avgScore}), 차이: ${scoreDrop}점`);

    // 이전 버전으로 롤백
    roleTemplate.additions = roleTemplate.previousAdditions || [];
    roleTemplate.version = previousVersion;
    roleTemplate.rolledBackFrom = currentVersion;
    roleTemplate.rollbackAt = new Date().toISOString();

    validatePath(TEMPLATES_FILE);
    await writeFile(TEMPLATES_FILE, JSON.stringify(templates, null, 2));
    return true;
  }

  return false;
}

/**
 * 메인: 학습 루프 실행
 * 피드백 분석 → 패턴 감지 → 프롬프트 개선 → 저장
 */
export async function runLearningLoop() {
  console.log('🧠 학습 루프 시작...');

  // 1. 피드백 패턴 분석
  const patterns = await analyzeFeedbackPatterns();
  console.log(`   감지된 패턴: ${patterns.length}개`);

  // 2. 프롬프트 개선 제안
  const improvements = await suggestPromptImprovements(patterns);

  // 3. 패턴 저장 (경로 검증)
  validatePath(FEEDBACK_FILE);
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(
    FEEDBACK_FILE,
    JSON.stringify(
      {
        lastAnalyzed: new Date().toISOString(),
        totalFeedbackEntries: (await extractFeedbackEntries()).length,
        patterns,
      },
      null,
      2
    )
  );

  // 4. 프롬프트 템플릿 업데이트 (버전 관리 포함)
  const existingTemplates = await loadPromptTemplates();

  for (const [role, fixes] of Object.entries(improvements)) {
    if (!existingTemplates.templates[role]) {
      existingTemplates.templates[role] = { additions: [], version: null };
    }

    const roleTemplate = existingTemplates.templates[role];

    // 이전 버전 백업 (롤백용)
    roleTemplate.previousAdditions = [...(roleTemplate.additions || [])];
    roleTemplate.previousVersion = roleTemplate.version || null;

    // 새 개선사항 추가 (중복 제거)
    const existingSet = new Set(roleTemplate.additions);
    for (const fix of fixes) {
      if (!existingSet.has(fix.fix)) {
        roleTemplate.additions.push(fix.fix);
      }
    }

    // 최대 10개까지만 유지
    roleTemplate.additions = roleTemplate.additions.slice(-10);

    // 새 버전 ID 생성
    roleTemplate.version = `v${Date.now()}`;
  }

  existingTemplates.lastUpdated = new Date().toISOString();
  validatePath(TEMPLATES_FILE);
  await writeFile(TEMPLATES_FILE, JSON.stringify(existingTemplates, null, 2));

  // 5. AI History 기록
  await addAIHistoryEntry({
    actionType: 'maintain',
    issueNumber: null,
    issueTitle: '학습 루프',
    documentSlug: null,
    documentTitle: null,
    summary: `학습 루프: ${patterns.length}개 패턴 감지, ${Object.keys(improvements).length}개 에이전트 개선`,
    trigger: 'weekly_schedule',
  });

  console.log(`✅ 학습 루프 완료`);

  return { patterns, improvements };
}

// CLI 직접 실행 지원
const isDirectRun = process.argv[1]?.includes('learning-loop');
if (isDirectRun) {
  runLearningLoop().catch((error) => {
    console.error('❌ 학습 루프 실패:', error.message);
    process.exit(1);
  });
}
