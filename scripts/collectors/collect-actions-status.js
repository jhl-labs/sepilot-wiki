#!/usr/bin/env node

/**
 * GitHub Actions 워크플로우 상태를 수집하여 JSON 파일로 저장하는 스크립트
 * scheduled-collect.yml에서 호출됨
 */

import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { getGitHubConfig } from '../lib/config.js';

const OUTPUT_DIR = join(process.cwd(), 'public');
const OUTPUT_FILE = join(OUTPUT_DIR, 'actions-status.json');

// GitHub 설정 로드
const githubConfig = getGitHubConfig();

// GitHub API 호출 (URL 검증 포함)
async function fetchGitHubAPI(endpoint) {
  const url = `${githubConfig.apiUrl}/repos/${githubConfig.repository}${endpoint}`;

  // API URL 검증: github.com 도메인만 허용 (서브도메인 포함, 유사 도메인 차단)
  const parsedUrl = new URL(url);
  const hostname = parsedUrl.hostname;
  const isGitHub = hostname === 'github.com' || hostname === 'api.github.com' ||
    (hostname.endsWith('.github.com') && hostname.indexOf('.') !== hostname.lastIndexOf('.'));
  const isGHContent = hostname === 'githubusercontent.com' ||
    (hostname.endsWith('.githubusercontent.com') && hostname.indexOf('.') !== hostname.lastIndexOf('.'));
  if (!isGitHub && !isGHContent) {
    throw new Error(`허용되지 않은 API 호스트: ${hostname}`);
  }

  const headers = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'sepilot-wiki-collector',
  };

  if (githubConfig.token) {
    headers.Authorization = `Bearer ${githubConfig.token}`;
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

      // 평균 실행 시간 및 실패율 계산
      const completedRuns = recentRuns.filter((r) => r.status === 'completed');
      const durations = [];
      for (const run of completedRuns) {
        if (run.createdAt && run.updatedAt) {
          const duration = new Date(run.updatedAt) - new Date(run.createdAt);
          if (duration > 0) durations.push(duration);
        }
      }
      const avgDurationMs = durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : null;
      const failureRate = completedRuns.length > 0
        ? Math.round((completedRuns.filter((r) => r.conclusion === 'failure').length / completedRuns.length) * 100)
        : null;

      // 가장 자주 실패하는 step 추적 (최근 실패 실행에서)
      let mostFailedStep = null;
      const failedRun = recentRuns.find((r) => r.conclusion === 'failure');
      if (failedRun) {
        try {
          const jobs = await fetchGitHubAPI(`/actions/runs/${failedRun.id}/jobs`);
          const failedJob = (jobs.jobs || []).find((j) => j.conclusion === 'failure');
          if (failedJob) {
            const failedStep = (failedJob.steps || []).find((s) => s.conclusion === 'failure');
            mostFailedStep = failedStep?.name || failedJob.name;
          }
        } catch {
          // step 정보 가져오기 실패 시 무시
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
        avgDurationMs,
        failureRate,
        mostFailedStep,
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
  console.log(`   저장소: ${githubConfig.repository}`);
  console.log(`   API URL: ${githubConfig.apiUrl}`);

  const [workflows, inProgress, failed] = await Promise.all([
    collectWorkflowRuns(),
    collectInProgressRuns(),
    collectFailedRuns(),
  ]);

  const status = {
    collectedAt: new Date().toISOString(),
    repository: githubConfig.repository,
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
