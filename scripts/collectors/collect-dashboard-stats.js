#!/usr/bin/env node

/**
 * 대시보드 통계 수집 스크립트
 * ai-history.json, issues.json, wiki-meta.json을 분석하여
 * dashboard-stats.json으로 통합 통계 생성
 *
 * dashboard-collect.yml에서 매시간 호출됨
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const PUBLIC_DIR = join(process.cwd(), 'public');
const DATA_DIR = join(PUBLIC_DIR, 'data');
const OUTPUT_FILE = join(DATA_DIR, 'dashboard-stats.json');

/**
 * JSON 파일을 안전하게 읽기 (없으면 기본값 반환)
 */
async function readJsonSafe(filepath, defaultValue) {
  try {
    if (!existsSync(filepath)) return defaultValue;
    const content = await readFile(filepath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.warn(`⚠️ ${filepath} 읽기 실패: ${error.message}`);
    return defaultValue;
  }
}

/**
 * 기간별 활동 통계 계산
 */
function calculateActivityForPeriod(entries, since) {
  const filtered = entries.filter((e) => new Date(e.timestamp) >= since);

  const stats = {
    aiActions: filtered.length,
    documentsCreated: filtered.filter((e) => e.actionType === 'generate').length,
    documentsModified: filtered.filter((e) =>
      ['modify', 'publish', 'recover', 'invalid'].includes(e.actionType)
    ).length,
    tavilyApiCalls: 0,
    tavilyResults: 0,
    estimatedTokens: 0,
    totalPipelineDurationMs: 0,
  };

  for (const entry of filtered) {
    const pipeline = entry.changes?.pipeline;
    if (!pipeline) continue;

    // tavilyUsage 필드가 있는 경우 (신규 형식)
    if (pipeline.tavilyUsage) {
      stats.tavilyApiCalls += pipeline.tavilyUsage.apiCalls || 0;
      stats.tavilyResults += pipeline.tavilyUsage.totalResults || 0;
    } else if (pipeline.researchSources) {
      // 하위호환: researchSources 수로 추정 (소스당 ~1 API 호출)
      const estimatedCalls = Math.ceil(pipeline.researchSources / 3);
      stats.tavilyApiCalls += estimatedCalls;
      stats.tavilyResults += pipeline.researchSources;
    }

    // estimatedTokens 필드가 있는 경우 (신규 형식)
    if (pipeline.estimatedTokens?.estimated) {
      stats.estimatedTokens += pipeline.estimatedTokens.estimated;
    } else if (pipeline.totalDurationMs && pipeline.steps) {
      // 하위호환: LLM 단계 duration으로 추정
      const TOKEN_PER_MS = 0.05;
      for (const step of pipeline.steps) {
        if (['outline', 'write', 'review', 'refine'].includes(step.step)) {
          stats.estimatedTokens += Math.round(step.durationMs * TOKEN_PER_MS);
        }
      }
    }

    if (pipeline.totalDurationMs) {
      stats.totalPipelineDurationMs += pipeline.totalDurationMs;
    }
  }

  return stats;
}

/**
 * 최근 활동 목록 생성 (최대 20건)
 */
function buildRecentActivity(entries, maxItems = 20) {
  return entries.slice(0, maxItems).map((entry) => {
    const pipeline = entry.changes?.pipeline;
    let tavilyApiCalls = 0;
    let estimatedTokens = null;

    if (pipeline) {
      if (pipeline.tavilyUsage) {
        tavilyApiCalls = pipeline.tavilyUsage.apiCalls || 0;
      } else if (pipeline.researchSources) {
        tavilyApiCalls = Math.ceil(pipeline.researchSources / 3);
      }

      if (pipeline.estimatedTokens?.estimated) {
        estimatedTokens = pipeline.estimatedTokens.estimated;
      } else if (pipeline.totalDurationMs && pipeline.steps) {
        const TOKEN_PER_MS = 0.05;
        estimatedTokens = 0;
        for (const step of pipeline.steps) {
          if (['outline', 'write', 'review', 'refine'].includes(step.step)) {
            estimatedTokens += Math.round(step.durationMs * TOKEN_PER_MS);
          }
        }
      }
    }

    return {
      timestamp: entry.timestamp,
      actionType: entry.actionType,
      issueNumber: entry.issueNumber || null,
      documentTitle: entry.documentTitle || entry.issueTitle || '',
      model: entry.model || '',
      durationMs: pipeline?.totalDurationMs || null,
      tavilyApiCalls,
      estimatedTokens,
    };
  });
}

/**
 * 모델별 통계 집계
 */
function aggregateModelStats(entries) {
  const models = {};

  for (const entry of entries) {
    const model = entry.model || 'unknown';
    if (!models[model]) {
      models[model] = {
        totalActions: 0,
        totalEstimatedTokens: 0,
        totalDurationMs: 0,
        actionCount: 0,
      };
    }

    models[model].totalActions++;

    const pipeline = entry.changes?.pipeline;
    if (pipeline) {
      if (pipeline.estimatedTokens?.estimated) {
        models[model].totalEstimatedTokens += pipeline.estimatedTokens.estimated;
      } else if (pipeline.totalDurationMs && pipeline.steps) {
        const TOKEN_PER_MS = 0.05;
        for (const step of pipeline.steps) {
          if (['outline', 'write', 'review', 'refine'].includes(step.step)) {
            models[model].totalEstimatedTokens += Math.round(step.durationMs * TOKEN_PER_MS);
          }
        }
      }

      if (pipeline.totalDurationMs) {
        models[model].totalDurationMs += pipeline.totalDurationMs;
        models[model].actionCount++;
      }
    }
  }

  // avgDurationMs 계산 및 내부 필드 정리
  const result = {};
  for (const [model, stats] of Object.entries(models)) {
    result[model] = {
      totalActions: stats.totalActions,
      totalEstimatedTokens: stats.totalEstimatedTokens,
      avgDurationMs: stats.actionCount > 0 ? Math.round(stats.totalDurationMs / stats.actionCount) : 0,
    };
  }

  return result;
}

async function main() {
  console.log('📊 대시보드 통계 수집 시작...');

  // 데이터 소스 로드
  const [aiHistory, issuesData, wikiMeta, wikiData] = await Promise.all([
    readJsonSafe(join(DATA_DIR, 'ai-history.json'), { entries: [] }),
    readJsonSafe(join(DATA_DIR, 'issues.json'), { issues: [] }),
    readJsonSafe(join(PUBLIC_DIR, 'wiki-meta.json'), null),
    readJsonSafe(join(PUBLIC_DIR, 'wiki-data.json'), { pages: [] }),
  ]);

  const entries = aiHistory.entries || [];
  const issues = issuesData.issues || [];

  // 문서 메타: wiki-meta.json 우선, 없으면 wiki-data.json 폴백
  const pages = wikiMeta ? (wikiMeta.pages || []) : (wikiData.pages || []);

  // 기간 기준 시각
  const now = new Date();
  const since1h = new Date(now.getTime() - 1 * 60 * 60 * 1000);
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // 개요 통계
  const totalDocuments = pages.length;
  const publishedDocuments = pages.filter((p) => p.status === 'published' || (!p.isDraft && !p.isInvalid)).length;
  const draftDocuments = pages.filter((p) => p.status === 'draft' || p.isDraft).length;
  const openRequests = issues.filter((i) => i.state === 'open').length;
  const closedRequests = issues.filter((i) => i.state === 'closed').length;

  // 통계 객체 구성
  const stats = {
    collectedAt: now.toISOString(),
    overview: {
      totalDocuments,
      publishedDocuments,
      draftDocuments,
      openRequests,
      closedRequests,
      totalAIActions: entries.length,
    },
    activity: {
      last1h: calculateActivityForPeriod(entries, since1h),
      last24h: calculateActivityForPeriod(entries, since24h),
      last7d: calculateActivityForPeriod(entries, since7d),
    },
    recentActivity: buildRecentActivity(entries),
    models: aggregateModelStats(entries),
  };

  // 출력 디렉토리 생성
  await mkdir(DATA_DIR, { recursive: true });

  // JSON 파일 저장
  await writeFile(OUTPUT_FILE, JSON.stringify(stats, null, 2));

  console.log('✅ 대시보드 통계 수집 완료');
  console.log(`   전체 문서: ${totalDocuments}개 (발행: ${publishedDocuments}, 초안: ${draftDocuments})`);
  console.log(`   요청: 진행 중 ${openRequests}개, 완료 ${closedRequests}개`);
  console.log(`   AI 활동: 전체 ${entries.length}건`);
  console.log(`   출력: ${OUTPUT_FILE}`);
}

main().catch((err) => {
  console.error('❌ 대시보드 통계 수집 실패:', err);
  process.exit(1);
});
