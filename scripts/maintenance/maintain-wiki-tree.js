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

import { readFile, readdir, writeFile, rename, mkdir } from 'fs/promises';
import { join, dirname, resolve } from 'path';
import { existsSync } from 'fs';
import { callOpenAI, getOpenAIConfig, setGitHubOutput } from '../lib/utils.js';
import { addAIHistoryEntry } from '../lib/ai-history.js';

// 경로 설정
const WIKI_DIR = resolve(process.cwd(), 'wiki');

/**
 * 경로가 WIKI_DIR 내부에 있는지 검증 (Path Traversal 방지)
 */
function validatePath(targetPath) {
  const resolvedPath = resolve(targetPath);
  const resolvedWikiDir = resolve(WIKI_DIR);
  if (!resolvedPath.startsWith(resolvedWikiDir + '/') && resolvedPath !== resolvedWikiDir) {
    throw new Error(`보안 오류: 경로가 wiki 디렉토리 외부를 가리킵니다: ${targetPath}`);
  }
  return resolvedPath;
}
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
 * 간단한 해시 함수 (중복 감지용)
 */
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash.toString(36);
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
    contentHash: simpleHash(doc.content),
  }));

  const systemPrompt = `당신은 Wiki 구조 전문가입니다. 주어진 Wiki 문서들을 분석하여 체계적인 구조 개선안을 제시합니다.

## 분석 기준

1. **카테고리 분류**: 문서 내용을 기반으로 적절한 카테고리/디렉토리 제안
2. **파일명 정규화**: 한글 파일명을 영문 slug로 변환 제안
3. **중복 감지**: 유사하거나 중복된 내용의 문서 감지 (contentHash가 같거나, title이 유사하고 같은 주제인 문서)
4. **구조 최적화**: 계층 구조 개선, 관련 문서 그룹화
5. **중복 문서 병합**: 동일/유사 내용의 문서가 여러 위치에 있으면 더 완성도 높은 쪽을 유지하고 나머지는 삭제(status: deleted)하거나 redirect_from 추가. merge 타입 액션은 autoApply: true 가능.
6. **카테고리 메타데이터**: 카테고리에 적절한 한국어 표시명과 정렬 순서가 필요하면 _category.json 생성 제안. type: "update_category_meta" 액션 사용.
7. **문서 정렬**: 카테고리 내 문서가 논리적 순서(개요→상세→참조)로 배치되도록 frontmatter에 order 필드를 설정. type: "set_order" 액션 사용.

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
      "type": "rename",
      "priority": "high",
      "source": "현재 경로",
      "target": "새 경로 (rename/move 시)",
      "reason": "변경 이유",
      "autoApply": true
    },
    {
      "type": "merge",
      "source": "중복 문서 경로 (삭제할 쪽)",
      "target": "유지할 문서 경로",
      "reason": "병합 이유",
      "autoApply": true
    },
    {
      "type": "update_category_meta",
      "target": "카테고리 경로 (예: ai)",
      "metadata": { "displayName": "AI & LLM", "order": 1 },
      "autoApply": true
    },
    {
      "type": "set_order",
      "target": "문서 경로",
      "order": 1,
      "autoApply": true
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

## 카테고리 분류 규칙 (반드시 준수)

### 카테고리 정의
- **projects/**: 특정 제품·프로젝트·서비스 문서 (소개, 릴리즈 노트, 가이드 등). 예: Antigravity, Claude Code, OpenClaw, Moltbook, SEPilot
- **ai/**: AI 기술·개념·프로토콜·아키텍처 문서. 제품 고유 문서가 아닌 범용 기술 가이드. 예: MCP, Multi-Agent System, Continuous AI
- **기술 도구 카테고리** (bun/, kubernetes/ 등): 개발 도구·인프라 기술별 문서

### 분류 판단 기준
1. 문서가 **특정 제품/서비스 이름**을 title에 포함하면 → \`projects/\`
2. 문서가 **범용 기술 개념/프로토콜**을 다루면 → 해당 기술 카테고리 (ai/, kubernetes/ 등)
3. 릴리즈 노트·버전 히스토리·상세 가이드는 **메인 문서와 같은 카테고리**에 배치
4. 루트 레벨에는 home.md 외 문서 금지 → 반드시 적절한 카테고리로 이동 (type: "move")
5. 1개 문서만 있는 카테고리는 상위 또는 관련 카테고리에 통합 검토

## 중요 규칙

- 파일명은 영문 소문자, 하이픈만 사용 (예: getting-started.md)
- home.md는 루트에 유지
- autoApply: true는 rename, move, merge, update_category_meta, set_order에 허용
- 문서 내용을 변경하는 것만 autoApply: false (삭제, 큰 구조 변경)
- 기존 URL이 깨지지 않도록 주의 (리다이렉트 필요 시 명시)

## Issue 생성 규칙 (매우 중요!)

- issuesForHuman은 **정말 중요한 문제만** 추가 (예: 보안 문제, 심각한 구조 문제)
- 다음은 Issue로 만들지 마세요:
  - 단순 파일명 변경 제안
  - 카테고리 재분류 제안
  - 사소한 개선 사항
- Issue는 **전체 분석에서 최대 1-2개**만 생성
- 이미 자동 적용(autoApply)으로 처리할 수 있는 것은 Issue로 만들지 마세요
- 구조가 이미 양호하면 issuesForHuman을 빈 배열로 반환`;

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
  const dryRunPreviewed = [];

  for (const action of actions) {
    if (!action.autoApply) {
      skipped.push(action);
      continue;
    }

    try {
      if (action.type === 'rename') {
        if (IS_DRY_RUN) {
          console.log(`[DRY RUN] 적용 예정: ${action.source} → ${action.target}`);
          dryRunPreviewed.push(action);
        } else {
          await applyRename(action, documents);
          console.log(`✅ 적용: ${action.source} → ${action.target}`);
          applied.push(action);
        }
      } else if (action.type === 'move') {
        if (IS_DRY_RUN) {
          console.log(`[DRY RUN] 이동 예정: ${action.source} → ${action.target}`);
          dryRunPreviewed.push(action);
        } else {
          await applyMove(action, documents);
          console.log(`✅ 이동: ${action.source} → ${action.target}`);
          applied.push(action);
        }
      } else if (action.type === 'create_category') {
        if (IS_DRY_RUN) {
          console.log(`[DRY RUN] 카테고리 생성 예정: ${action.target}`);
          dryRunPreviewed.push(action);
        } else {
          await applyCreateCategory(action);
          console.log(`✅ 카테고리 생성: ${action.target}`);
          applied.push(action);
        }
      } else if (action.type === 'merge') {
        if (IS_DRY_RUN) {
          console.log(`[DRY RUN] 병합 예정: ${action.source} → ${action.target}`);
          dryRunPreviewed.push(action);
        } else {
          await applyMerge(action, documents);
          console.log(`✅ 병합: ${action.source} → ${action.target}`);
          applied.push(action);
        }
      } else if (action.type === 'update_category_meta') {
        if (IS_DRY_RUN) {
          console.log(`[DRY RUN] 카테고리 메타 업데이트 예정: ${action.target}`);
          dryRunPreviewed.push(action);
        } else {
          await applyUpdateCategoryMeta(action);
          console.log(`✅ 카테고리 메타 업데이트: ${action.target}`);
          applied.push(action);
        }
      } else if (action.type === 'set_order') {
        if (IS_DRY_RUN) {
          console.log(`[DRY RUN] 정렬 순서 설정 예정: ${action.target} → order: ${action.order}`);
          dryRunPreviewed.push(action);
        } else {
          await applySetOrder(action, documents);
          console.log(`✅ 정렬 순서 설정: ${action.target} → order: ${action.order}`);
          applied.push(action);
        }
      } else {
        skipped.push(action);
      }
    } catch (error) {
      console.error(`❌ 실패: ${action.type} ${action.source} - ${error.message}`);
      skipped.push({ ...action, error: error.message });
    }
  }

  return { applied, skipped, dryRunPreviewed };
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

  // Path Traversal 방지: 대상 경로가 WIKI_DIR 내부인지 검증
  validatePath(targetPath);

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
 * 중복 문서 병합 (source를 deleted 상태로, target에 redirect_from 추가)
 */
async function applyMerge(action, documents) {
  const sourceDoc = documents.find((d) => d.path === action.source);
  if (!sourceDoc) {
    throw new Error(`소스 문서를 찾을 수 없음: ${action.source}`);
  }

  // source의 status를 deleted로 변경
  let content = await readFile(sourceDoc.fullPath, 'utf-8');
  if (/^status:\s/m.test(content)) {
    content = content.replace(/^status:\s.+$/m, 'status: deleted');
  } else {
    // frontmatter에 status 추가
    content = content.replace(/^(---\n[\s\S]*?)(\n---)/m, '$1\nstatus: deleted$2');
  }
  await writeFile(sourceDoc.fullPath, content);

  // target에 redirect_from 추가
  const targetDoc = documents.find((d) => d.path === action.target);
  if (targetDoc) {
    let targetContent = await readFile(targetDoc.fullPath, 'utf-8');
    targetContent = addRedirectInfo(targetContent, action.source);
    await writeFile(targetDoc.fullPath, targetContent);
  }
}

/**
 * 카테고리 메타데이터(_category.json) 생성/수정
 */
async function applyUpdateCategoryMeta(action) {
  const categoryDir = join(WIKI_DIR, action.target);
  validatePath(categoryDir);
  await mkdir(categoryDir, { recursive: true });

  const metaFile = join(categoryDir, '_category.json');
  let existing = {};
  if (existsSync(metaFile)) {
    existing = JSON.parse(await readFile(metaFile, 'utf-8'));
  }
  const merged = { ...existing, ...action.metadata };
  await writeFile(metaFile, JSON.stringify(merged, null, 2));
}

/**
 * frontmatter에 order 필드 설정
 */
async function applySetOrder(action, documents) {
  const doc = documents.find((d) => d.path === action.target);
  if (!doc) {
    throw new Error(`문서를 찾을 수 없음: ${action.target}`);
  }

  let content = await readFile(doc.fullPath, 'utf-8');
  if (/^order:\s/m.test(content)) {
    content = content.replace(/^order:\s.+$/m, `order: ${action.order}`);
  } else {
    // frontmatter 끝에 order 추가
    content = content.replace(/^(---\n[\s\S]*?)(\n---)/m, `$1\norder: ${action.order}$2`);
  }
  await writeFile(doc.fullPath, content);
}

/**
 * 카테고리(디렉토리) 생성
 */
async function applyCreateCategory(action) {
  const categoryPath = join(WIKI_DIR, action.target);

  // Path Traversal 방지: 대상 경로가 WIKI_DIR 내부인지 검증
  validatePath(categoryPath);

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
 * 기존 열린 Issue 목록 조회 (중복 방지용)
 */
async function getExistingIssues() {
  const repo = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;

  if (!repo || !token) return [];

  try {
    const response = await fetch(
      `https://api.github.com/repos/${repo}/issues?state=open&labels=wiki-maintenance&per_page=100`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (!response.ok) return [];

    const issues = await response.json();
    return issues.map((i) => i.title.toLowerCase());
  } catch {
    return [];
  }
}

/**
 * GitHub Issue 생성 (중복 검사 포함)
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

  // 기존 열린 Issue 제목들 조회
  const existingTitles = await getExistingIssues();
  console.log(`📋 기존 열린 wiki-maintenance Issue: ${existingTitles.length}개`);

  const createdIssues = [];
  let skippedCount = 0;

  for (const issue of issues) {
    const fullTitle = `[Wiki Maintainer] ${issue.title}`;

    // 중복 검사: 비슷한 제목의 Issue가 이미 있는지 확인
    const isDuplicate = existingTitles.some((existing) => {
      const newTitle = fullTitle.toLowerCase();
      // 정확히 같거나 80% 이상 유사하면 중복으로 판단
      return existing === newTitle || isSimilarTitle(existing, newTitle);
    });

    if (isDuplicate) {
      console.log(`⏭️ 중복 Issue 건너뜀: ${issue.title}`);
      skippedCount++;
      continue;
    }

    try {
      const response = await fetch(`https://api.github.com/repos/${repo}/issues`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/vnd.github.v3+json',
        },
        body: JSON.stringify({
          title: fullTitle,
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

      // 새로 생성한 Issue도 기존 목록에 추가 (연속 중복 방지)
      existingTitles.push(fullTitle.toLowerCase());
    } catch (error) {
      console.error(`❌ Issue 생성 실패: ${issue.title} - ${error.message}`);
    }
  }

  if (skippedCount > 0) {
    console.log(`ℹ️ 중복으로 ${skippedCount}개 Issue 건너뜀`);
  }

  return createdIssues;
}

/**
 * 두 제목이 유사한지 확인 (간단한 유사도 검사)
 */
function isSimilarTitle(title1, title2) {
  // 공백, 특수문자 제거 후 비교
  const normalize = (str) => str.replace(/[^a-z0-9가-힣]/g, '');
  const t1 = normalize(title1);
  const t2 = normalize(title2);

  // 한쪽이 다른 쪽을 포함하면 유사
  if (t1.includes(t2) || t2.includes(t1)) return true;

  // 공통 단어 비율 확인
  const words1 = title1.split(/\s+/).filter((w) => w.length > 2);
  const words2 = title2.split(/\s+/).filter((w) => w.length > 2);

  if (words1.length === 0 || words2.length === 0) return false;

  const commonWords = words1.filter((w) => words2.some((w2) => w2.includes(w) || w.includes(w2)));
  const similarity = commonWords.length / Math.max(words1.length, words2.length);

  return similarity >= 0.7; // 70% 이상 유사하면 중복
}

/**
 * 분석 리포트 저장
 */
async function saveReport(analysis, results) {
  const report = {
    timestamp: new Date().toISOString(),
    model: getOpenAIConfig().model,
    isDryRun: IS_DRY_RUN,
    analysis: analysis.analysis,
    suggestedStructure: analysis.suggestedStructure,
    results: {
      appliedActions: results.applied.length,
      skippedActions: results.skipped.length,
      dryRunPreviewedActions: results.dryRunPreviewed?.length || 0,
      createdIssues: results.createdIssues?.length || 0,
    },
    actions: {
      applied: results.applied,
      skipped: results.skipped,
      dryRunPreviewed: results.dryRunPreviewed || [],
    },
    createdIssues: results.createdIssues || [],
  };

  if (IS_DRY_RUN) {
    console.log('[DRY RUN] 리포트 저장 건너뜀');
    console.log(`📋 리포트 미리보기:\n${JSON.stringify(report.results, null, 2)}`);
  } else {
    await mkdir(dirname(REPORT_FILE), { recursive: true });
    await writeFile(REPORT_FILE, JSON.stringify(report, null, 2));
    console.log(`📄 리포트 저장: ${REPORT_FILE}`);
  }

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
    const { applied, skipped, dryRunPreviewed } = await applyAutoActions(analysis.actions || [], documents);
    if (IS_DRY_RUN) {
      console.log(`🔍 ${dryRunPreviewed.length}개 미리보기, ⏸️ ${skipped.length}개 보류`);
    } else {
      console.log(`✅ ${applied.length}개 자동 적용, ⏸️ ${skipped.length}개 보류`);
    }

    // 4. Issue 생성 (복잡한 변경 사항)
    const createdIssues = await createGitHubIssues(analysis.issuesForHuman || []);

    // 5. 리포트 저장
    const report = await saveReport(analysis, { applied, skipped, dryRunPreviewed, createdIssues });

    // 6. History 기록 (Dry Run 시 건너뜀)
    if (!IS_DRY_RUN) {
      await recordHistory(report);
    } else {
      console.log('[DRY RUN] 히스토리 기록 건너뜀');
    }

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
