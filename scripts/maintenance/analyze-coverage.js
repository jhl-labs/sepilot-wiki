#!/usr/bin/env node

/**
 * 문서 커버리지 분석 스크립트
 * 소스코드 구조와 wiki 문서를 비교하여 문서화되지 않은 주요 컴포넌트 식별
 *
 * 트리거: 매월 + workflow_dispatch
 * 출력: 문서 작성 Issue 생성
 */

import { resolve, join } from 'path';
import { readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { loadAllDocuments } from '../lib/document-scanner.js';
import { callOpenAI, parseJsonResponse, getOpenAIConfig, setGitHubOutput } from '../lib/utils.js';
import { addAIHistoryEntry } from '../lib/ai-history.js';
import { saveReport, createGitHubIssues } from '../lib/report-generator.js';

const WIKI_DIR = resolve(process.cwd(), 'wiki');
const IS_DRY_RUN = process.env.DRY_RUN === 'true';

// 소스 디렉토리 목록
const SOURCE_DIRS = [
  { path: 'src', label: '프론트엔드 소스' },
  { path: 'app', label: 'Next.js App' },
  { path: 'lib', label: '백엔드 라이브러리' },
  { path: 'scripts', label: '스크립트' },
  { path: 'components', label: '컴포넌트' },
];

/**
 * 소스 코드 구조 스캔
 */
async function scanSourceStructure() {
  const structure = {};

  for (const { path: dirPath, label } of SOURCE_DIRS) {
    const fullPath = resolve(process.cwd(), dirPath);
    if (!existsSync(fullPath)) continue;

    structure[dirPath] = {
      label,
      files: [],
    };

    async function scan(dir, prefix = '') {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          // node_modules, .next 등 제외
          if (['node_modules', '.next', '.git', 'dist', 'build'].includes(entry.name)) continue;
          await scan(join(dir, entry.name), relativePath);
        } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
          structure[dirPath].files.push(relativePath);
        }
      }
    }

    await scan(fullPath);
  }

  return structure;
}

/**
 * AI를 사용하여 커버리지 분석
 */
async function analyzeCoverage(sourceStructure, documents) {
  const docList = documents.map((d) => ({
    path: d.path,
    title: d.title,
    tags: d.tags,
  }));

  const systemPrompt = `당신은 소프트웨어 문서화 커버리지 분석 전문가입니다.
소스코드 구조와 Wiki 문서를 비교하여 문서화가 필요한 부분을 식별합니다.

## 출력 형식 (JSON)
{
  "coverageScore": 0-100,
  "summary": "전체 분석 요약 (한국어)",
  "documented": ["이미 문서화된 주요 모듈"],
  "undocumented": [
    {
      "module": "모듈/컴포넌트 이름",
      "sourcePath": "소스 경로",
      "importance": "high | medium | low",
      "suggestedTitle": "제안 문서 제목 (한국어)",
      "description": "왜 문서화가 필요한지 (한국어)"
    }
  ]
}

## 규칙
- 핵심 비즈니스 로직과 API 엔드포인트를 우선 식별
- 설정/빌드 파일은 낮은 우선순위
- 테스트 파일은 제외
- undocumented에는 최대 10개까지만 포함 (importance 기준)`;

  const response = await callOpenAI(
    [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `소스 구조:\n${JSON.stringify(sourceStructure, null, 2)}\n\n기존 Wiki 문서:\n${JSON.stringify(docList, null, 2)}`,
      },
    ],
    { temperature: 0.1, maxTokens: 4000 }
  );

  const result = parseJsonResponse(response, { fallback: null });
  if (!result) {
    throw new Error('AI 응답에서 JSON을 찾을 수 없습니다.');
  }
  return result;
}

/**
 * 메인 실행
 */
async function main() {
  console.log('📊 문서 커버리지 분석 시작...');
  if (IS_DRY_RUN) console.log('🧪 DRY RUN 모드');
  console.log('---');

  try {
    // 1. 소스 구조 스캔
    const sourceStructure = await scanSourceStructure();
    const totalSourceFiles = Object.values(sourceStructure).reduce(
      (sum, dir) => sum + dir.files.length,
      0
    );
    console.log(`📦 소스 파일: ${totalSourceFiles}개`);

    // 2. Wiki 문서 로드
    const documents = await loadAllDocuments({ wikiDir: WIKI_DIR, includeContent: false });
    console.log(`📚 Wiki 문서: ${documents.length}개`);

    // 3. AI 커버리지 분석
    console.log('🤖 AI 커버리지 분석 중...');
    const analysis = await analyzeCoverage(sourceStructure, documents);
    console.log(`✅ 커버리지 점수: ${analysis.coverageScore}/100`);
    console.log(`   문서화된 모듈: ${analysis.documented?.length || 0}개`);
    console.log(`   미문서화 모듈: ${analysis.undocumented?.length || 0}개`);

    // 4. 보고서 저장
    const report = {
      timestamp: new Date().toISOString(),
      model: getOpenAIConfig().model,
      isDryRun: IS_DRY_RUN,
      sourceFiles: totalSourceFiles,
      wikiDocuments: documents.length,
      ...analysis,
    };

    await saveReport('coverage-report.json', report);

    // 5. 중요도 높은 미문서화 모듈에 대해 Issue 생성
    const highImportance = (analysis.undocumented || []).filter((u) => u.importance === 'high');
    if (highImportance.length > 0) {
      const issues = highImportance.slice(0, 3).map((item) => ({
        title: `문서 작성 필요: ${item.suggestedTitle}`,
        body: [
          '## 문서화 커버리지 분석 결과',
          '',
          `- **모듈**: ${item.module}`,
          `- **소스 경로**: \`${item.sourcePath}\``,
          `- **중요도**: ${item.importance}`,
          '',
          `### 문서 작성 사유`,
          item.description,
          '',
          `> **제안 문서 제목**: ${item.suggestedTitle}`,
          '',
          '이 Issue에 `request` 라벨을 추가하면 AI가 자동으로 문서를 생성합니다.',
        ].join('\n'),
        labels: ['wiki-maintenance', 'request'],
      }));

      await createGitHubIssues(issues, {
        titlePrefix: '[커버리지 분석]',
        defaultLabels: ['wiki-maintenance'],
        footer: '\n\n---\n*🤖 이 Issue는 문서 커버리지 분석에 의해 자동 생성되었습니다.*',
      });
    }

    // 6. AI History 기록
    if (!IS_DRY_RUN) {
      await addAIHistoryEntry({
        actionType: 'coverage_analysis',
        issueNumber: null,
        issueTitle: '문서 커버리지 분석',
        documentSlug: '_coverage-analysis',
        documentTitle: '문서 커버리지 분석',
        summary: `커버리지 ${analysis.coverageScore}점, ${(analysis.undocumented || []).length}개 미문서화 모듈 발견`,
        trigger: 'monthly_schedule',
        model: getOpenAIConfig().model,
      });
    }

    // 7. GitHub Actions 출력
    await setGitHubOutput({
      coverage_score: String(analysis.coverageScore),
      undocumented_count: String((analysis.undocumented || []).length),
      high_importance_count: String(highImportance.length),
    });

    console.log('---');
    console.log('🎉 커버리지 분석 완료');
  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
