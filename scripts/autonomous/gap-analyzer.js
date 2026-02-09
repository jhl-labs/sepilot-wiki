#!/usr/bin/env node

/**
 * 갭 분석기
 *
 * 프로젝트 소스코드와 설정 파일을 분석하여 Wiki에 미문서화된 주제를 식별
 * 코드에서 사용되는 기술 스택, 패턴, 도구 대비 Wiki 커버리지를 비교
 *
 * 트리거: 월 1회 (autonomous-gap-analysis.yml)
 */

import { resolve, extname } from 'path';
import { readFile, readdir, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { callOpenAI } from '../lib/utils.js';
import { saveReport, createGitHubIssues, getExistingIssues } from '../lib/report-generator.js';
import { addAIHistoryEntry } from '../lib/ai-history.js';
import { loadAllDocuments } from '../lib/document-scanner.js';
import { MAX_AUTO_ISSUES, GAP_ANALYSIS_IGNORE, SOURCE_EXTENSIONS } from './config.js';

const WIKI_DIR = resolve(process.cwd(), 'wiki');
const IS_DRY_RUN = process.env.DRY_RUN === 'true';

/**
 * 프로젝트 소스 파일 재귀 탐색
 * @param {string} dir - 탐색할 디렉토리
 * @param {string} baseDir - 기준 디렉토리
 * @returns {Promise<Array<{path: string, ext: string}>>}
 */
async function scanSourceFiles(dir, baseDir = dir) {
  const files = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = resolve(dir, entry.name);
    const relativePath = fullPath.replace(baseDir + '/', '');

    // 무시 대상 확인
    if (GAP_ANALYSIS_IGNORE.some((ignore) => relativePath.startsWith(ignore) || entry.name === ignore)) {
      continue;
    }

    if (entry.isDirectory()) {
      files.push(...(await scanSourceFiles(fullPath, baseDir)));
    } else {
      const ext = extname(entry.name);
      if (SOURCE_EXTENSIONS.includes(ext)) {
        files.push({ path: relativePath, ext });
      }
    }
  }

  return files;
}

/**
 * 소스코드에서 기술 키워드 추출
 * @param {Array} sourceFiles - 소스 파일 목록
 * @returns {Promise<Object>} 카테고리별 키워드
 */
async function extractTechKeywords(sourceFiles) {
  const keywords = {
    imports: new Set(),
    frameworks: new Set(),
    patterns: new Set(),
    configs: new Set(),
  };

  // 주요 파일들만 샘플링 (최대 30개)
  const sampled = sourceFiles.slice(0, 30);

  for (const file of sampled) {
    try {
      const content = await readFile(resolve(process.cwd(), file.path), 'utf-8');

      // import/require 문에서 패키지명 추출
      const importMatches = content.matchAll(/(?:import|require)\s*\(?\s*['"]([^'"./][^'"]*)['"]/g);
      for (const match of importMatches) {
        const pkg = match[1].split('/')[0].replace(/^@/, '');
        if (pkg.length > 1 && !pkg.startsWith('.')) {
          keywords.imports.add(match[1].split('/').slice(0, 2).join('/'));
        }
      }

      // 설정 파일 분석
      if (file.path.includes('.yml') || file.path.includes('.yaml')) {
        keywords.configs.add(file.path);
      }
    } catch {
      // 파일 읽기 실패 무시
    }
  }

  // package.json에서 dependencies 추출
  const pkgJsonPath = resolve(process.cwd(), 'package.json');
  if (existsSync(pkgJsonPath)) {
    try {
      const pkgJson = JSON.parse(await readFile(pkgJsonPath, 'utf-8'));
      const deps = {
        ...pkgJson.dependencies,
        ...pkgJson.devDependencies,
      };

      for (const dep of Object.keys(deps)) {
        keywords.imports.add(dep);
      }
    } catch {
      // 무시
    }
  }

  return {
    imports: [...keywords.imports],
    frameworks: [...keywords.frameworks],
    patterns: [...keywords.patterns],
    configs: [...keywords.configs],
  };
}

/**
 * AI로 갭 분석 수행
 * @param {Object} techKeywords - 추출된 기술 키워드
 * @param {Array} existingDocs - 기존 문서 목록
 * @returns {Promise<Array>} 갭 항목
 */
async function analyzeGaps(techKeywords, existingDocs) {
  const docList = existingDocs
    .map((d) => `- ${d.title} (${d.tags?.join(', ') || '태그 없음'})`)
    .join('\n');

  const systemPrompt = `당신은 기술 문서 커버리지 분석 전문가입니다.
프로젝트에서 사용하는 기술 스택과 기존 Wiki 문서를 비교하여
미문서화된 중요 주제를 식별합니다.

JSON 형식으로 응답하세요:
{
  "gaps": [
    {
      "topic": "미문서화 주제",
      "importance": "critical" | "high" | "medium" | "low",
      "reason": "이 주제가 문서화되어야 하는 이유",
      "suggestedTitle": "[요청] 제안 문서 제목",
      "relatedTech": ["관련 기술/패키지"]
    }
  ]
}

중요도 기준:
- critical: 보안, 배포, 핵심 아키텍처 관련
- high: 주요 프레임워크, 핵심 기능 관련
- medium: 유틸리티, 부가 기능 관련
- low: 개발 도구, 선택적 기능 관련`;

  const userPrompt = `프로젝트 기술 스택과 Wiki 문서를 비교 분석하세요.

## 프로젝트에서 사용하는 패키지/라이브러리
${techKeywords.imports.join(', ')}

## 설정 파일
${techKeywords.configs.join(', ')}

## 기존 Wiki 문서
${docList || '(문서 없음)'}

미문서화된 중요 주제를 최대 10개까지 식별하세요.`;

  const response = await callOpenAI(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    { temperature: 0.1, maxTokens: 4000, responseFormat: 'json_object' }
  );

  try {
    const cleaned = response.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return parsed.gaps || [];
  } catch {
    console.warn('⚠️ 갭 분석 JSON 파싱 실패');
    return [];
  }
}

/** 메인 실행 */
async function main() {
  console.log('🔍 갭 분석 시작...');

  // 1. 소스 파일 스캔
  const sourceFiles = await scanSourceFiles(process.cwd());
  console.log(`   소스 파일: ${sourceFiles.length}개`);

  // 2. 기술 키워드 추출
  const techKeywords = await extractTechKeywords(sourceFiles);
  console.log(`   패키지: ${techKeywords.imports.length}개, 설정: ${techKeywords.configs.length}개`);

  // 3. 기존 문서 로드
  const existingDocs = await loadAllDocuments(WIKI_DIR);
  console.log(`   기존 문서: ${existingDocs.length}개`);

  // 4. AI 갭 분석
  const gaps = await analyzeGaps(techKeywords, existingDocs);

  // importance 우선순위
  const importanceOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  gaps.sort((a, b) => (importanceOrder[a.importance] || 3) - (importanceOrder[b.importance] || 3));

  console.log(`\n📊 갭 분석 결과: ${gaps.length}개 미문서화 주제 발견`);

  // 5. 중요도 high 이상 → Issue 생성
  let issuesCreated = 0;
  const actionableGaps = gaps
    .filter((g) => g.importance === 'critical' || g.importance === 'high')
    .slice(0, MAX_AUTO_ISSUES);

  if (actionableGaps.length > 0 && !IS_DRY_RUN) {
    const existingIssueTitles = await getExistingIssues('wiki-maintenance');

    for (const gap of actionableGaps) {
      const issueTitle = gap.suggestedTitle || `[요청] ${gap.topic}`;

      if (existingIssueTitles.includes(issueTitle.toLowerCase())) {
        console.log(`⏭️ 중복 Issue 건너뜀: ${issueTitle}`);
        continue;
      }

      const issueBody = [
        `> 🤖 자동 감지: 갭 분석`,
        '',
        `**주제**: ${gap.topic}`,
        `**중요도**: ${gap.importance}`,
        '',
        `## 문서화 필요 사유`,
        gap.reason,
        '',
        gap.relatedTech?.length > 0
          ? `## 관련 기술\n${gap.relatedTech.map((t) => `- ${t}`).join('\n')}`
          : '',
      ].join('\n');

      try {
        const issues = await createGitHubIssues([
          { title: issueTitle, body: issueBody, labels: ['request', 'auto-detected'] },
        ]);

        if (issues.length > 0) {
          gap.issueCreated = issues[0].number;
          issuesCreated++;
        }
      } catch (error) {
        console.warn(`⚠️ Issue 생성 실패: ${error.message}`);
      }
    }
  }

  // 6. 보고서 저장
  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      sourceFiles: sourceFiles.length,
      packages: techKeywords.imports.length,
      existingDocs: existingDocs.length,
      gapsFound: gaps.length,
      issuesCreated,
    },
    techStack: techKeywords,
    gaps: gaps.map((g) => ({
      ...g,
      issueCreated: g.issueCreated || null,
    })),
  };

  await saveReport('gap-analysis.json', report);

  // 7. AI History 기록
  await addAIHistoryEntry({
    actionType: 'coverage_analysis',
    issueNumber: null,
    issueTitle: '갭 분석',
    documentSlug: null,
    documentTitle: null,
    summary: `갭 분석: ${gaps.length}개 미문서화 주제 발견, ${issuesCreated}건 Issue 생성`,
    trigger: 'monthly_schedule',
  });

  console.log(`\n✅ 갭 분석 완료 (Issue ${issuesCreated}건 생성)`);
}

main().catch((error) => {
  console.error('❌ 갭 분석 실패:', error.message);
  process.exit(1);
});
