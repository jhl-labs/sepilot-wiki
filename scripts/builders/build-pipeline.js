#!/usr/bin/env node

/**
 * 통합 빌드 파이프라인
 *
 * build-wiki-data, build-search-index, build-sitemap을 하나의 프로세스에서 실행
 * 디스크 I/O 중복 제거: 파싱된 pages 배열을 메모리 내에서 공유
 * 매니페스트 기반 변경 감지 + health-status 갱신
 */

import { buildWikiData, buildGuideData } from './build-wiki-data.js';
import { buildSearchIndex } from './build-search-index.js';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const PUBLIC_DIR = join(process.cwd(), 'public');
const DATA_DIR = join(PUBLIC_DIR, 'data');

/**
 * 통합 빌드 파이프라인 실행
 *
 * 1. 매니페스트 변경 감지 (선택적)
 * 2. Wiki 데이터 빌드 (JSON 파일 생성)
 * 3. Guide 데이터 빌드
 * 4. 검색 인덱스 빌드 (메모리에서 pages 데이터 공유)
 * 5. Sitemap 빌드 (존재하는 경우)
 * 6. Health Status 갱신
 */
async function runBuildPipeline() {
  const pipelineStart = Date.now();
  console.log('🔧 통합 빌드 파이프라인 시작...\n');

  // Step 1: Wiki 데이터 빌드
  console.log('━━━ Step 1/5: Wiki 데이터 빌드 ━━━');
  await buildWikiData();

  // Step 2: Guide 데이터 빌드
  console.log('\n━━━ Step 2/5: Guide 데이터 빌드 ━━━');
  await buildGuideData();

  // Step 3: 검색 인덱스 빌드 (빌드된 JSON에서 로드하여 공유)
  console.log('\n━━━ Step 3/5: 검색 인덱스 빌드 ━━━');
  let wikiPages = [];
  let guidePages = [];

  const wikiDataFile = join(PUBLIC_DIR, 'wiki-data.json');
  if (existsSync(wikiDataFile)) {
    const wikiData = JSON.parse(await readFile(wikiDataFile, 'utf-8'));
    wikiPages = wikiData.pages || [];
  }

  const guideDataFile = join(PUBLIC_DIR, 'guide-data.json');
  if (existsSync(guideDataFile)) {
    const guideData = JSON.parse(await readFile(guideDataFile, 'utf-8'));
    guidePages = (guideData.pages || []).map((page) => ({
      ...page,
      slug: `guide/${page.slug}`,
    }));
  }

  await buildSearchIndex({ wikiPages, guidePages });

  // Step 4: Sitemap 빌드 (파일이 존재하는 경우)
  console.log('\n━━━ Step 4/5: Sitemap 빌드 ━━━');
  try {
    const { buildSitemap } = await import('./build-sitemap.js');
    await buildSitemap(wikiPages);
  } catch {
    console.log('ℹ️ Sitemap 빌드 건너뜀 (모듈 없음)');
  }

  // Step 5: 매니페스트 + Health Status 갱신
  console.log('\n━━━ Step 5/5: 매니페스트 및 Health Status 갱신 ━━━');
  try {
    const { computeCurrentHashes, saveManifest } = await import('./build-manifest.js');
    const currentHashes = await computeCurrentHashes();
    await saveManifest({
      files: currentHashes,
      lastFullBuild: new Date().toISOString(),
    });
    console.log(`   📋 매니페스트 갱신: ${Object.keys(currentHashes).length}개 파일`);
  } catch {
    console.log('ℹ️ 매니페스트 갱신 건너뜀');
  }

  // Health Status 갱신
  try {
    await updateHealthStatus(wikiPages.length);
    console.log('   🏥 Health Status 갱신 완료');
  } catch {
    console.log('ℹ️ Health Status 갱신 건너뜀');
  }

  const totalMs = Date.now() - pipelineStart;

  // 빌드 메트릭 기록
  try {
    const { collectBuildMetrics } = await import('../collectors/collect-build-metrics.js');
    await collectBuildMetrics({
      buildDurationMs: totalMs,
      pageCount: wikiPages.length,
    });
  } catch {
    console.log('ℹ️ 빌드 메트릭 기록 건너뜀');
  }

  console.log(`\n🎉 통합 빌드 파이프라인 완료 (${(totalMs / 1000).toFixed(1)}초)`);
  console.log(`   Wiki: ${wikiPages.length}개 문서`);
  console.log(`   Guide: ${guidePages.length}개 문서`);
}

/**
 * Health Status 갱신
 * @param {number} pageCount - 빌드된 페이지 수
 */
async function updateHealthStatus(pageCount) {
  await mkdir(DATA_DIR, { recursive: true });
  const healthFile = join(DATA_DIR, 'health-status.json');

  // error-log.json에서 최근 24시간 에러 수 집계
  let recentErrors = 0;
  const errorLogFile = join(DATA_DIR, 'error-log.json');
  if (existsSync(errorLogFile)) {
    try {
      const errorLog = JSON.parse(await readFile(errorLogFile, 'utf-8'));
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      recentErrors = (errorLog.entries || []).filter(
        (e) => e.timestamp > oneDayAgo
      ).length;
    } catch {
      // 무시
    }
  }

  // agent-metrics.json에서 평균 점수 계산
  let avgScore = null;
  const metricsFile = join(DATA_DIR, 'agent-metrics.json');
  if (existsSync(metricsFile)) {
    try {
      const metrics = JSON.parse(await readFile(metricsFile, 'utf-8'));
      const reviewerStats = metrics.summary?.reviewer;
      if (reviewerStats?.avgReviewScore != null) {
        avgScore = reviewerStats.avgReviewScore;
      }
    } catch {
      // 무시
    }
  }

  // overall 상태 결정
  let overall = 'healthy';
  if (recentErrors >= 10) overall = 'unhealthy';
  else if (recentErrors >= 3) overall = 'degraded';

  const healthStatus = {
    overall,
    checks: {
      'build-pipeline': {
        lastSuccess: new Date().toISOString(),
        status: 'ok',
      },
      'agent-pipeline': {
        lastSuccess: new Date().toISOString(),
        avgScore,
        status: avgScore != null && avgScore < 60 ? 'warning' : 'ok',
      },
    },
    pageCount,
    recentErrors,
    updatedAt: new Date().toISOString(),
  };

  await writeFile(healthFile, JSON.stringify(healthStatus, null, 2));
}

runBuildPipeline().catch((err) => {
  console.error('❌ 통합 빌드 파이프라인 실패:', err);
  process.exit(1);
});
