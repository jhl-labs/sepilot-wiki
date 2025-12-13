/**
 * Issue 상태 관리 유틸리티
 * GitHub API 호출을 줄이기 위해 Issue 상태를 JSON 파일로 관리
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// Issue 데이터 파일 경로
const DATA_DIR = join(process.cwd(), 'public', 'data');
const ISSUES_FILE = join(DATA_DIR, 'issues.json');

/**
 * Issue 데이터 로드
 * @returns {Promise<{issues: Array, lastUpdated: string}>}
 */
export async function loadIssuesData() {
  try {
    if (!existsSync(ISSUES_FILE)) {
      return { issues: [], lastUpdated: new Date().toISOString() };
    }
    const content = await readFile(ISSUES_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.warn('Issue 데이터 로드 실패, 새로 생성:', error.message);
    return { issues: [], lastUpdated: new Date().toISOString() };
  }
}

/**
 * Issue 데이터 저장
 * @param {object} data - Issue 데이터
 */
export async function saveIssuesData(data) {
  await mkdir(DATA_DIR, { recursive: true });
  data.lastUpdated = new Date().toISOString();
  await writeFile(ISSUES_FILE, JSON.stringify(data, null, 2));
  console.log(`📋 Issue 데이터 저장 완료: ${ISSUES_FILE}`);
}

/**
 * Issue 추가 또는 업데이트
 * @param {object} issueData - Issue 정보
 * @param {number} issueData.number - Issue 번호
 * @param {string} issueData.title - Issue 제목
 * @param {string} issueData.body - Issue 본문
 * @param {string} issueData.state - Issue 상태 (open/closed)
 * @param {Array<string>} issueData.labels - 라벨 목록
 * @param {object} issueData.user - 작성자 정보
 * @param {string} issueData.created_at - 생성일
 * @param {string} issueData.updated_at - 수정일
 * @param {string} issueData.html_url - GitHub URL
 * @param {string} [issueData.documentSlug] - 연결된 문서 slug
 * @param {string} [issueData.documentPath] - 연결된 문서 경로
 */
export async function upsertIssue(issueData) {
  const data = await loadIssuesData();

  const existingIndex = data.issues.findIndex((i) => i.number === issueData.number);

  const issue = {
    id: issueData.id || issueData.number,
    number: issueData.number,
    title: issueData.title,
    body: issueData.body || '',
    state: issueData.state || 'open',
    labels: issueData.labels || [],
    user: issueData.user || { login: 'unknown', avatar_url: '' },
    created_at: issueData.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    html_url: issueData.html_url || '',
    documentSlug: issueData.documentSlug || null,
    documentPath: issueData.documentPath || null,
    comments: issueData.comments || 0,
  };

  if (existingIndex >= 0) {
    // 기존 Issue 업데이트 (일부 필드만 유지)
    const existing = data.issues[existingIndex];
    data.issues[existingIndex] = {
      ...existing,
      ...issue,
      created_at: existing.created_at, // 생성일은 유지
    };
    console.log(`🔄 Issue #${issue.number} 업데이트됨`);
  } else {
    // 새 Issue 추가 (최신순으로 앞에 추가)
    data.issues.unshift(issue);
    console.log(`➕ Issue #${issue.number} 추가됨`);
  }

  await saveIssuesData(data);
  return issue;
}

/**
 * Issue 상태 업데이트
 * @param {number} issueNumber - Issue 번호
 * @param {object} updates - 업데이트할 필드들
 */
export async function updateIssue(issueNumber, updates) {
  const data = await loadIssuesData();
  const index = data.issues.findIndex((i) => i.number === issueNumber);

  if (index >= 0) {
    data.issues[index] = {
      ...data.issues[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    await saveIssuesData(data);
    console.log(`🔄 Issue #${issueNumber} 상태 업데이트됨`);
    return data.issues[index];
  }

  console.warn(`⚠️ Issue #${issueNumber}를 찾을 수 없음`);
  return null;
}

/**
 * Issue 라벨 추가
 * @param {number} issueNumber - Issue 번호
 * @param {Array<string>} labels - 추가할 라벨들
 */
export async function addLabels(issueNumber, labels) {
  const data = await loadIssuesData();
  const index = data.issues.findIndex((i) => i.number === issueNumber);

  if (index >= 0) {
    const existing = data.issues[index].labels.map((l) =>
      typeof l === 'string' ? l : l.name
    );
    const newLabels = labels.filter((l) => !existing.includes(l));

    if (newLabels.length > 0) {
      data.issues[index].labels = [
        ...data.issues[index].labels,
        ...newLabels.map((name) => ({ name, color: getDefaultLabelColor(name) })),
      ];
      data.issues[index].updated_at = new Date().toISOString();
      await saveIssuesData(data);
      console.log(`🏷️ Issue #${issueNumber}에 라벨 추가: ${newLabels.join(', ')}`);
    }
  }
}

/**
 * Issue 라벨 제거
 * @param {number} issueNumber - Issue 번호
 * @param {string} labelName - 제거할 라벨 이름
 */
export async function removeLabel(issueNumber, labelName) {
  const data = await loadIssuesData();
  const index = data.issues.findIndex((i) => i.number === issueNumber);

  if (index >= 0) {
    data.issues[index].labels = data.issues[index].labels.filter((l) => {
      const name = typeof l === 'string' ? l : l.name;
      return name !== labelName;
    });
    data.issues[index].updated_at = new Date().toISOString();
    await saveIssuesData(data);
    console.log(`🏷️ Issue #${issueNumber}에서 라벨 제거: ${labelName}`);
  }
}

/**
 * Issue 상태 변경 (open/closed)
 * @param {number} issueNumber - Issue 번호
 * @param {string} state - 새 상태 (open/closed)
 */
export async function setIssueState(issueNumber, state) {
  return updateIssue(issueNumber, { state });
}

/**
 * Issue에 문서 연결
 * @param {number} issueNumber - Issue 번호
 * @param {string} documentSlug - 문서 slug
 * @param {string} documentPath - 문서 경로
 */
export async function linkDocument(issueNumber, documentSlug, documentPath) {
  return updateIssue(issueNumber, { documentSlug, documentPath });
}

/**
 * 특정 Issue 조회
 * @param {number} issueNumber - Issue 번호
 */
export async function getIssue(issueNumber) {
  const data = await loadIssuesData();
  return data.issues.find((i) => i.number === issueNumber) || null;
}

/**
 * 라벨별 Issue 필터링
 * @param {string} labelName - 라벨 이름
 */
export async function getIssuesByLabel(labelName) {
  const data = await loadIssuesData();
  return data.issues.filter((issue) =>
    issue.labels.some((l) => {
      const name = typeof l === 'string' ? l : l.name;
      return name === labelName;
    })
  );
}

/**
 * 기본 라벨 색상 반환
 * @param {string} labelName - 라벨 이름
 */
function getDefaultLabelColor(labelName) {
  const colors = {
    request: '0e8a16',
    draft: 'fbca04',
    published: '0052cc',
    invalid: 'd93f0b',
    'ai-generated': '5319e7',
    'wiki-maintenance': '1d76db',
  };
  return colors[labelName] || 'ededed';
}

/**
 * GitHub Issue 정보를 가져와서 저장 (초기화 또는 동기화용)
 * @param {object} octokit - GitHub API 클라이언트 (선택)
 */
export async function syncFromGitHub() {
  const repo = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;

  if (!repo || !token) {
    console.log('⚠️ GitHub 정보 없음 - 동기화 건너뜀');
    return null;
  }

  try {
    // request 라벨이 있는 Issue와 없는 Issue 모두 가져오기 위해 두 번 호출
    const allIssues = [];

    // request 라벨이 있는 Issue
    const requestResponse = await fetch(
      `https://api.github.com/repos/${repo}/issues?state=all&per_page=100&labels=request`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (requestResponse.ok) {
      const requestIssues = await requestResponse.json();
      allIssues.push(...requestIssues);
    }

    // draft 라벨이 있는 Issue (request가 없을 수도 있음)
    const draftResponse = await fetch(
      `https://api.github.com/repos/${repo}/issues?state=all&per_page=100&labels=draft`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (draftResponse.ok) {
      const draftIssues = await draftResponse.json();
      // 중복 제거
      for (const issue of draftIssues) {
        if (!allIssues.find((i) => i.id === issue.id)) {
          allIssues.push(issue);
        }
      }
    }

    // published 라벨이 있는 Issue
    const publishedResponse = await fetch(
      `https://api.github.com/repos/${repo}/issues?state=all&per_page=100&labels=published`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (publishedResponse.ok) {
      const publishedIssues = await publishedResponse.json();
      // 중복 제거
      for (const issue of publishedIssues) {
        if (!allIssues.find((i) => i.id === issue.id)) {
          allIssues.push(issue);
        }
      }
    }

    // wiki-maintenance 라벨이 있는 Issue (자동 정비 작업)
    const maintenanceResponse = await fetch(
      `https://api.github.com/repos/${repo}/issues?state=all&per_page=100&labels=wiki-maintenance`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (maintenanceResponse.ok) {
      const maintenanceIssues = await maintenanceResponse.json();
      // 중복 제거
      for (const issue of maintenanceIssues) {
        if (!allIssues.find((i) => i.id === issue.id)) {
          allIssues.push(issue);
        }
      }
    }

    console.log(`📥 GitHub에서 ${allIssues.length}개 Issue 가져옴`);

    const data = { issues: [], lastUpdated: new Date().toISOString() };

    for (const issue of allIssues) {
      data.issues.push({
        id: issue.id,
        number: issue.number,
        title: issue.title,
        body: issue.body || '',
        state: issue.state,
        labels: issue.labels.map((l) => ({
          id: l.id,
          name: l.name,
          color: l.color,
        })),
        user: {
          login: issue.user.login,
          avatar_url: issue.user.avatar_url,
          html_url: issue.user.html_url,
        },
        created_at: issue.created_at,
        updated_at: issue.updated_at,
        html_url: issue.html_url,
        comments: issue.comments,
        documentSlug: null,
        documentPath: null,
      });
    }

    await saveIssuesData(data);
    console.log(`✅ GitHub에서 ${allIssues.length}개 Issue 동기화 완료`);
    return data;
  } catch (error) {
    console.error('❌ GitHub 동기화 실패:', error.message);
    return null;
  }
}
