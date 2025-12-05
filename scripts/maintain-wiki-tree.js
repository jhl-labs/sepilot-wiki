#!/usr/bin/env node

/**
 * Wiki Tree Maintainer
 * AI 기반으로 wiki page tree를 체계적으로 정비하는 스크립트
 *
 * 주요 기능:
 * - 문서 구조 분석 및 카테고리 분류
 * - 중복/유사 문서 감지
 * - 파일명 정규화 (한글 → 영문 slug)
 * - 고아 문서 정리
 * - 디렉토리 구조 재배치 제안/적용
 */

import { readFile, readdir, writeFile, rename, mkdir, unlink } from 'fs/promises';
import { join, dirname } from 'path';
import { existsSync } from 'fs';
import { callOpenAI, getOpenAIConfig, setGitHubOutput } from './lib/utils.js';
import { addAIHistoryEntry } from './lib/ai-history.js';

// 경로 설정
const WIKI_DIR = join(process.cwd(), 'wiki');
const REPORT_FILE = join(process.cwd(), 'public', 'data', 'wiki-tree-report.json');
const IS_DRY_RUN = process.env.DRY_RUN === 'true';

/**
 * Wiki 문서 전체 로드
 */
async function loadAllDocuments() {
  if (!existsSync(WIKI_DIR)) {
    console.log('⚠️ wiki 디렉토리가 없습니다.');
    return [];
  }

  const documents = [];

  async function scanDir(dir, prefix = '') {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        await scanDir(fullPath, relativePath);
      } else if (entry.name.endsWith('.md')) {
        const content = await readFile(fullPath, 'utf-8');
        const frontmatter = parseFrontmatter(content);
        const bodyContent = content.replace(/^---[\s\S]*?---\n?/, '');

        documents.push({
          path: relativePath,
          fullPath,
          filename: entry.name,
          slug: entry.name.replace('.md', ''),
          directory: prefix || '/',
          frontmatter,
          title: frontmatter.title || extractTitle(bodyContent) || entry.name.replace('.md', ''),
          content: bodyContent,
          wordCount: bodyContent.split(/\s+/).filter(Boolean).length,
          hasKoreanFilename: /[가-힣]/.test(entry.name),
        });
      }
    }
  }

  await scanDir(WIKI_DIR);
  return documents;
}

/**
 * Frontmatter 파싱
 */
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  const frontmatter = {};
  const lines = match[1].split('\n');

  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      let value = line.slice(colonIndex + 1).trim();
      // 따옴표 제거
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      frontmatter[key] = value;
    }
  }

  return frontmatter;
}

/**
 * 본문에서 제목 추출
 */
function extractTitle(content) {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

/**
 * AI에게 Wiki 구조 분석 요청
 */
async function analyzeWikiStructure(documents) {
  console.log('🤖 AI 분석 시작...');

  const docSummaries = documents.map((doc) => ({
    path: doc.path,
    title: doc.title,
    directory: doc.directory,
    status: doc.frontmatter.status || 'unknown',
    tags: doc.frontmatter.tags || '',
    hasKoreanFilename: doc.hasKoreanFilename,
    wordCount: doc.wordCount,
    preview: doc.content.slice(0, 300),
  }));

  const systemPrompt = `당신은 Wiki 구조 전문가입니다. 주어진 Wiki 문서들을 분석하여 체계적인 구조 개선안을 제시합니다.

## 분석 기준

1. **카테고리 분류**: 문서 내용을 기반으로 적절한 카테고리/디렉토리 제안
2. **파일명 정규화**: 한글 파일명을 영문 slug로 변환 제안
3. **중복 감지**: 유사하거나 중복된 내용의 문서 감지
4. **구조 최적화**: 계층 구조 개선, 관련 문서 그룹화

## 출력 형식 (JSON)

{
  "analysis": {
    "summary": "전체 구조 분석 요약",
    "totalDocuments": 숫자,
    "categories": ["감지된 카테고리들"],
    "issues": ["발견된 문제점들"]
  },
  "actions": [
    {
      "type": "rename",  // rename, move, merge, delete, create_category
      "priority": "high", // high, medium, low
      "source": "현재 경로",
      "target": "새 경로 (rename/move 시)",
      "reason": "변경 이유",
      "autoApply": true  // 자동 적용 가능 여부 (간단한 변경만)
    }
  ],
  "suggestedStructure": {
    "디렉토리명": ["포함될 문서 slug들"]
  },
  "issuesForHuman": [
    {
      "title": "Issue 제목",
      "body": "Issue 내용 (마크다운)",
      "labels": ["wiki-maintenance"]
    }
  ]
}

## 중요 규칙

- 파일명은 영문 소문자, 하이픈만 사용 (예: getting-started.md)
- home.md는 루트에 유지
- 자동 적용(autoApply: true)은 단순 rename만 허용
- 구조 변경이 큰 경우 issuesForHuman에 추가
- 기존 URL이 깨지지 않도록 주의 (리다이렉트 필요 시 명시)`;

  const userPrompt = `다음 Wiki 문서들을 분석하고 구조 개선안을 JSON 형식으로 제시해주세요:

${JSON.stringify(docSummaries, null, 2)}`;

  const response = await callOpenAI(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    { temperature: 0.1, maxTokens: 8000 }
  );

  // JSON 추출
  const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) || response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('AI 응답에서 JSON을 찾을 수 없습니다.');
  }

  const jsonStr = jsonMatch[1] || jsonMatch[0];
  return JSON.parse(jsonStr);
}

/**
 * 자동 적용 가능한 액션 실행
 */
async function applyAutoActions(actions, documents) {
  const applied = [];
  const skipped = [];

  for (const action of actions) {
    if (!action.autoApply) {
      skipped.push(action);
      continue;
    }

    try {
      if (action.type === 'rename') {
        if (IS_DRY_RUN) {
          console.log(`[DRY RUN] 적용 예정: ${action.source} → ${action.target}`);
        } else {
          await applyRename(action, documents);
          console.log(`✅ 적용: ${action.source} → ${action.target}`);
        }
        applied.push(action);
      } else if (action.type === 'move') {
        if (IS_DRY_RUN) {
          console.log(`[DRY RUN] 이동 예정: ${action.source} → ${action.target}`);
        } else {
          await applyMove(action, documents);
          console.log(`✅ 이동: ${action.source} → ${action.target}`);
        }
        applied.push(action);
      } else if (action.type === 'create_category') {
        if (IS_DRY_RUN) {
          console.log(`[DRY RUN] 카테고리 생성 예정: ${action.target}`);
        } else {
          await applyCreateCategory(action);
          console.log(`✅ 카테고리 생성: ${action.target}`);
        }
        applied.push(action);
      } else {
        skipped.push(action);
      }
    } catch (error) {
      console.error(`❌ 실패: ${action.type} ${action.source} - ${error.message}`);
      skipped.push({ ...action, error: error.message });
    }
  }

  return { applied, skipped };
}

/**
 * 파일명 변경 적용
 */
async function applyRename(action, documents) {
  const doc = documents.find((d) => d.path === action.source);
  if (!doc) {
    throw new Error(`문서를 찾을 수 없음: ${action.source}`);
  }

  const sourceFullPath = doc.fullPath;
  const targetPath = join(WIKI_DIR, action.target);
  const targetDir = dirname(targetPath);

  // 대상 디렉토리 생성
  if (!existsSync(targetDir)) {
    await mkdir(targetDir, { recursive: true });
  }

  // 파일 이동
  await rename(sourceFullPath, targetPath);

  // 리다이렉트 정보 추가 (frontmatter에)
  const content = await readFile(targetPath, 'utf-8');
  const updatedContent = addRedirectInfo(content, action.source);
  await writeFile(targetPath, updatedContent);
}

/**
 * 파일 이동 적용
 */
async function applyMove(action, documents) {
  // rename과 동일한 로직
  await applyRename(action, documents);
}

/**
 * 카테고리(디렉토리) 생성
 */
async function applyCreateCategory(action) {
  const categoryPath = join(WIKI_DIR, action.target);
  if (!existsSync(categoryPath)) {
    await mkdir(categoryPath, { recursive: true });
    console.log(`📁 디렉토리 생성: ${action.target}`);
  }
}

/**
 * 리다이렉트 정보를 frontmatter에 추가
 */
function addRedirectInfo(content, oldPath) {
  const oldSlug = oldPath.replace('.md', '').replace(/\//g, '-');
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1];
    const rest = content.slice(frontmatterMatch[0].length);

    // 기존 redirect_from 확인
    if (/^redirect_from:/m.test(frontmatter)) {
      // 기존 배열에 추가
      const updated = frontmatter.replace(/^(redirect_from:.*?)$/m, `$1\n  - ${oldSlug}`);
      return `---\n${updated}\n---${rest}`;
    } else {
      // 새로 추가
      return `---\n${frontmatter}\nredirect_from:\n  - ${oldSlug}\n---${rest}`;
    }
  } else {
    // frontmatter가 없으면 추가
    return `---\nredirect_from:\n  - ${oldSlug}\n---\n${content}`;
  }
}

/**
 * GitHub Issue 생성
 */
async function createGitHubIssues(issues) {
  const repo = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;

  if (!repo || !token) {
    console.log('⚠️ GitHub 정보 없음 - Issue 생성 건너뜀');
    return [];
  }

  if (IS_DRY_RUN) {
    console.log(`[DRY RUN] ${issues.length}개 Issue 생성 건너뜀`);
    return [];
  }

  const createdIssues = [];

  for (const issue of issues) {
    try {
      const response = await fetch(`https://api.github.com/repos/${repo}/issues`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/vnd.github.v3+json',
        },
        body: JSON.stringify({
          title: `[Wiki Maintainer] ${issue.title}`,
          body:
            issue.body +
            '\n\n---\n*🤖 이 Issue는 Wiki Tree Maintainer에 의해 자동 생성되었습니다.*',
          labels: issue.labels || ['wiki-maintenance'],
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      createdIssues.push({ number: data.number, url: data.html_url, title: issue.title });
      console.log(`📌 Issue 생성: #${data.number} - ${issue.title}`);
    } catch (error) {
      console.error(`❌ Issue 생성 실패: ${issue.title} - ${error.message}`);
    }
  }

  return createdIssues;
}

/**
 * 분석 리포트 저장
 */
async function saveReport(analysis, results) {
  const report = {
    timestamp: new Date().toISOString(),
    model: getOpenAIConfig().model,
    analysis: analysis.analysis,
    suggestedStructure: analysis.suggestedStructure,
    results: {
      appliedActions: results.applied.length,
      skippedActions: results.skipped.length,
      createdIssues: results.createdIssues?.length || 0,
    },
    actions: {
      applied: results.applied,
      skipped: results.skipped,
    },
    createdIssues: results.createdIssues || [],
  };

  await mkdir(dirname(REPORT_FILE), { recursive: true });
  await writeFile(REPORT_FILE, JSON.stringify(report, null, 2));
  console.log(`📄 리포트 저장: ${REPORT_FILE}`);

  return report;
}

/**
 * AI History에 기록
 */
async function recordHistory(report) {
  await addAIHistoryEntry({
    actionType: 'maintain',
    issueNumber: null,
    issueTitle: 'Wiki Tree Maintenance',
    documentSlug: '_wiki-tree',
    documentTitle: 'Wiki Tree Maintenance',
    summary: `구조 분석 완료. ${report.results.appliedActions}개 자동 적용, ${report.results.skippedActions}개 보류, ${report.results.createdIssues}개 Issue 생성`,
    trigger: 'scheduled',
    model: report.model,
    changes: {
      applied: report.results.appliedActions,
      skipped: report.results.skippedActions,
      issues: report.results.createdIssues,
    },
  });
}

/**
 * 메인 실행
 */
async function main() {
  console.log('🌳 Wiki Tree Maintainer 시작');
  if (IS_DRY_RUN) console.log('🧪 TEST MODE (DRY RUN) - 변경 사항이 저장되지 않습니다.');
  console.log(`📅 ${new Date().toISOString()}`);
  console.log('---');

  try {
    // 1. 문서 로드
    const documents = await loadAllDocuments();
    console.log(`📚 ${documents.length}개 문서 로드됨`);

    if (documents.length === 0) {
      console.log('⚠️ 분석할 문서가 없습니다.');
      await setGitHubOutput({ has_changes: 'false' });
      return;
    }

    // 2. AI 분석
    const analysis = await analyzeWikiStructure(documents);
    console.log(`🔍 분석 완료: ${analysis.actions?.length || 0}개 액션 제안됨`);

    // 3. 자동 적용
    const { applied, skipped } = await applyAutoActions(analysis.actions || [], documents);
    console.log(`✅ ${applied.length}개 자동 적용, ⏸️ ${skipped.length}개 보류`);

    // 4. Issue 생성 (복잡한 변경 사항)
    const createdIssues = await createGitHubIssues(analysis.issuesForHuman || []);

    // 5. 리포트 저장
    const report = await saveReport(analysis, { applied, skipped, createdIssues });

    // 6. History 기록
    await recordHistory(report);

    // 7. GitHub Actions 출력
    await setGitHubOutput({
      has_changes: applied.length > 0 ? 'true' : 'false',
      applied_count: String(applied.length),
      skipped_count: String(skipped.length),
      issues_created: String(createdIssues.length),
      summary: analysis.analysis?.summary || 'Wiki 구조 분석 완료',
    });

    console.log('---');
    console.log('🎉 Wiki Tree Maintainer 완료');
  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
