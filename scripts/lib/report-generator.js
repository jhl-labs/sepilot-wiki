/**
 * 보고서 생성 및 Issue 생성 공통 모듈
 * JSON 보고서 저장 + Issue 생성의 공통 패턴 추출
 */

import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';

const DATA_DIR = join(process.cwd(), 'public', 'data');
const IS_DRY_RUN = process.env.DRY_RUN === 'true';

/**
 * JSON 보고서 저장
 * @param {string} filename - 파일명 (예: 'freshness-report.json')
 * @param {Object} data - 저장할 데이터
 * @returns {Promise<string>} 저장된 파일 경로
 */
export async function saveReport(filename, data) {
  const filepath = join(DATA_DIR, filename);

  if (IS_DRY_RUN) {
    console.log(`[DRY RUN] 리포트 저장 건너뜀: ${filepath}`);
    console.log(`📋 리포트 미리보기:\n${JSON.stringify(data, null, 2).slice(0, 500)}...`);
    return filepath;
  }

  await mkdir(dirname(filepath), { recursive: true });
  await writeFile(filepath, JSON.stringify(data, null, 2));
  console.log(`📄 리포트 저장: ${filepath}`);

  return filepath;
}

/**
 * 마크다운 보고서 저장
 * @param {string} filepath - 전체 파일 경로
 * @param {string} content - 마크다운 내용
 * @returns {Promise<string>} 저장된 파일 경로
 */
export async function saveMarkdownReport(filepath, content) {
  if (IS_DRY_RUN) {
    console.log(`[DRY RUN] 마크다운 보고서 저장 건너뜀: ${filepath}`);
    return filepath;
  }

  await mkdir(dirname(filepath), { recursive: true });
  await writeFile(filepath, content);
  console.log(`📄 마크다운 보고서 저장: ${filepath}`);

  return filepath;
}

/**
 * 기존 열린 Issue 목록 조회 (중복 방지용)
 * @param {string} label - 필터링할 라벨
 * @returns {Promise<string[]>} 기존 Issue 제목 목록 (소문자)
 */
export async function getExistingIssues(label = 'wiki-maintenance') {
  const repo = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;

  if (!repo || !token) return [];

  try {
    const response = await fetch(
      `https://api.github.com/repos/${repo}/issues?state=open&labels=${label}&per_page=100`,
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
 * 두 제목이 유사한지 확인
 * @param {string} title1
 * @param {string} title2
 * @returns {boolean}
 */
function isSimilarTitle(title1, title2) {
  const normalize = (str) => str.replace(/[^a-z0-9가-힣]/g, '');
  const t1 = normalize(title1);
  const t2 = normalize(title2);

  if (t1.includes(t2) || t2.includes(t1)) return true;

  const words1 = title1.split(/\s+/).filter((w) => w.length > 2);
  const words2 = title2.split(/\s+/).filter((w) => w.length > 2);

  if (words1.length === 0 || words2.length === 0) return false;

  const commonWords = words1.filter((w) =>
    words2.some((w2) => w2.includes(w) || w.includes(w2))
  );
  const similarity = commonWords.length / Math.max(words1.length, words2.length);

  return similarity >= 0.7;
}

/**
 * GitHub Issue 일괄 생성 (중복 검사 포함)
 * @param {Array} issues - Issue 배열 [{ title, body, labels }]
 * @param {Object} options - 옵션
 * @param {string} [options.titlePrefix] - 제목 접두사 (예: '[Wiki Maintenance]')
 * @param {string[]} [options.defaultLabels] - 기본 라벨
 * @param {string} [options.footer] - Issue 본문 하단 추가 텍스트
 * @returns {Promise<Array>} 생성된 Issue 목록
 */
export async function createGitHubIssues(issues, options = {}) {
  const {
    titlePrefix = '[Wiki Maintenance]',
    defaultLabels = ['wiki-maintenance'],
    footer = '\n\n---\n*이 Issue는 자동으로 생성되었습니다.*',
  } = options;

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

  // 기존 Issue 제목들 조회
  const existingTitles = await getExistingIssues(defaultLabels[0]);
  console.log(`📋 기존 열린 ${defaultLabels[0]} Issue: ${existingTitles.length}개`);

  const createdIssues = [];
  let skippedCount = 0;

  for (const issue of issues) {
    const fullTitle = `${titlePrefix} ${issue.title}`;

    // 중복 검사
    const isDuplicate = existingTitles.some((existing) => {
      const newTitle = fullTitle.toLowerCase();
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
          body: issue.body + footer,
          labels: issue.labels || defaultLabels,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      createdIssues.push({ number: data.number, url: data.html_url, title: issue.title });
      console.log(`📌 Issue 생성: #${data.number} - ${issue.title}`);

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
 * GitHub Issue에 댓글 추가
 * @param {number} issueNumber - Issue 번호
 * @param {string} body - 댓글 내용
 * @returns {Promise<boolean>} 성공 여부
 */
export async function addIssueComment(issueNumber, body) {
  const repo = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;

  if (!repo || !token) {
    console.log('⚠️ GitHub 정보 없음 - 댓글 추가 건너뜀');
    return false;
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${repo}/issues/${issueNumber}/comments`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/vnd.github.v3+json',
        },
        body: JSON.stringify({ body }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    console.log(`💬 Issue #${issueNumber}에 댓글 추가됨`);
    return true;
  } catch (error) {
    console.error(`❌ 댓글 추가 실패: Issue #${issueNumber} - ${error.message}`);
    return false;
  }
}
