#!/usr/bin/env node

/**
 * GitHub Actions 워크플로우 상태를 수집하여 JSON 파일로 저장하는 스크립트
 * scheduled-collect.yml에서 호출됨
 */

import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const OUTPUT_DIR = join(process.cwd(), 'public');
const OUTPUT_FILE = join(OUTPUT_DIR, 'actions-status.json');

// GitHub API 호출
async function fetchGitHubAPI(endpoint) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY || 'jhl-labs/sepilot-wiki';

  const url = `https://api.github.com/repos/${repo}${endpoint}`;

  const headers = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'sepilot-wiki-collector',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// 워크플로우 실행 상태 수집
async function collectWorkflowRuns() {
  console.log('📊 GitHub Actions 상태 수집 시작...');

  try {
    // 워크플로우 목록 가져오기
    const workflows = await fetchGitHubAPI('/actions/workflows');

    const workflowStatuses = [];

    for (const workflow of workflows.workflows || []) {
      // 각 워크플로우의 최근 실행 가져오기
      const runs = await fetchGitHubAPI(`/actions/workflows/${workflow.id}/runs?per_page=5`);

      const recentRuns = (runs.workflow_runs || []).map((run) => ({
        id: run.id,
        name: run.name,
        status: run.status,
        conclusion: run.conclusion,
        branch: run.head_branch,
        event: run.event,
        createdAt: run.created_at,
        updatedAt: run.updated_at,
        url: run.html_url,
        actor: run.actor?.login,
      }));

      // 가장 최근 실행 상태로 워크플로우 상태 결정
      const latestRun = recentRuns[0];
      let overallStatus = 'unknown';

      if (latestRun) {
        if (latestRun.status === 'completed') {
          overallStatus = latestRun.conclusion || 'unknown';
        } else {
          overallStatus = latestRun.status;
        }
      }

      workflowStatuses.push({
        id: workflow.id,
        name: workflow.name,
        path: workflow.path,
        state: workflow.state,
        overallStatus,
        badgeUrl: workflow.badge_url,
        url: workflow.html_url,
        recentRuns,
      });
    }

    return workflowStatuses;
  } catch (error) {
    console.error('❌ 워크플로우 상태 수집 실패:', error.message);
    return [];
  }
}

// 진행 중인 실행 수집
async function collectInProgressRuns() {
  try {
    const runs = await fetchGitHubAPI('/actions/runs?status=in_progress&per_page=10');

    return (runs.workflow_runs || []).map((run) => ({
      id: run.id,
      workflowName: run.name,
      status: run.status,
      branch: run.head_branch,
      event: run.event,
      createdAt: run.created_at,
      url: run.html_url,
      actor: run.actor?.login,
    }));
  } catch (error) {
    console.error('⚠️ 진행 중 실행 수집 실패:', error.message);
    return [];
  }
}

// 최근 실패한 실행 수집
async function collectFailedRuns() {
  try {
    const runs = await fetchGitHubAPI('/actions/runs?status=failure&per_page=10');

    return (runs.workflow_runs || []).map((run) => ({
      id: run.id,
      workflowName: run.name,
      conclusion: run.conclusion,
      branch: run.head_branch,
      event: run.event,
      createdAt: run.created_at,
      url: run.html_url,
      actor: run.actor?.login,
    }));
  } catch (error) {
    console.error('⚠️ 실패 실행 수집 실패:', error.message);
    return [];
  }
}

async function main() {
  console.log('🚀 Actions 상태 수집 시작...');
  console.log(`   저장소: ${process.env.GITHUB_REPOSITORY || 'jhl-labs/sepilot-wiki'}`);

  const [workflows, inProgress, failed] = await Promise.all([
    collectWorkflowRuns(),
    collectInProgressRuns(),
    collectFailedRuns(),
  ]);

  const status = {
    collectedAt: new Date().toISOString(),
    repository: process.env.GITHUB_REPOSITORY || 'jhl-labs/sepilot-wiki',
    summary: {
      totalWorkflows: workflows.length,
      inProgressCount: inProgress.length,
      recentFailuresCount: failed.length,
    },
    workflows,
    inProgress,
    recentFailures: failed,
  };

  // 출력 폴더 생성
  await mkdir(OUTPUT_DIR, { recursive: true });

  // JSON 파일로 저장
  await writeFile(OUTPUT_FILE, JSON.stringify(status, null, 2));

  console.log('✅ Actions 상태 수집 완료');
  console.log(`   워크플로우: ${workflows.length}개`);
  console.log(`   진행 중: ${inProgress.length}개`);
  console.log(`   최근 실패: ${failed.length}개`);
  console.log(`   출력: ${OUTPUT_FILE}`);
}

main().catch((err) => {
  console.error('❌ 수집 실패:', err);
  process.exit(1);
});
