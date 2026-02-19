#!/usr/bin/env node

/**
 * 빌드 성능 메트릭 수집
 *
 * 빌드 시간, 페이지 수, 정적 자산 크기, 번들 크기 추적
 * 저장: public/data/build-metrics.json
 */

import { readFile, writeFile, mkdir, readdir, stat } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const DATA_DIR = join(process.cwd(), 'public', 'data');
const METRICS_FILE = join(DATA_DIR, 'build-metrics.json');
const PUBLIC_DIR = join(process.cwd(), 'public');
const DIST_DIR = join(process.cwd(), 'dist');
const OUT_DIR = join(process.cwd(), 'out');

/** 최대 기록 수 */
const MAX_ENTRIES = 100;

/**
 * 디렉토리 크기 재귀 계산
 */
async function getDirSize(dir) {
  if (!existsSync(dir)) return 0;
  let totalSize = 0;
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      totalSize += await getDirSize(fullPath);
    } else {
      const fileStat = await stat(fullPath);
      totalSize += fileStat.size;
    }
  }
  return totalSize;
}

/**
 * 특정 확장자 파일 크기 합계
 */
async function getFilesSizeByExt(dir, extensions) {
  if (!existsSync(dir)) return 0;
  let totalSize = 0;
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      totalSize += await getFilesSizeByExt(fullPath, extensions);
    } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
      const fileStat = await stat(fullPath);
      totalSize += fileStat.size;
    }
  }
  return totalSize;
}

/**
 * 빌드 메트릭 수집 및 기록
 *
 * @param {Object} [opts]
 * @param {number} [opts.buildDurationMs] - 빌드 소요 시간 (ms)
 * @param {number} [opts.pageCount] - 빌드된 페이지 수
 */
export async function collectBuildMetrics(opts = {}) {
  console.log('📊 빌드 메트릭 수집 시작...');

  // 빌드 출력 디렉토리 감지
  const buildDir = existsSync(OUT_DIR) ? OUT_DIR : existsSync(DIST_DIR) ? DIST_DIR : null;

  // 페이지 수 (wiki-meta.json에서)
  let pageCount = opts.pageCount || 0;
  const metaFile = join(PUBLIC_DIR, 'wiki-meta.json');
  if (!pageCount && existsSync(metaFile)) {
    try {
      const meta = JSON.parse(await readFile(metaFile, 'utf-8'));
      pageCount = meta.pages?.length || 0;
    } catch {
      // 무시
    }
  }

  const metric = {
    timestamp: new Date().toISOString(),
    buildDurationMs: opts.buildDurationMs || null,
    pageCount,
    publicDirSize: await getDirSize(PUBLIC_DIR),
    buildDirSize: buildDir ? await getDirSize(buildDir) : null,
    jsSize: buildDir ? await getFilesSizeByExt(buildDir, ['.js']) : null,
    cssSize: buildDir ? await getFilesSizeByExt(buildDir, ['.css']) : null,
  };

  // 기존 데이터 로드
  let data = { entries: [], lastUpdated: null };
  if (existsSync(METRICS_FILE)) {
    try {
      data = JSON.parse(await readFile(METRICS_FILE, 'utf-8'));
    } catch {
      // 무시
    }
  }

  data.entries.push(metric);
  if (data.entries.length > MAX_ENTRIES) {
    data.entries = data.entries.slice(-MAX_ENTRIES);
  }
  data.lastUpdated = new Date().toISOString();

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(METRICS_FILE, JSON.stringify(data, null, 2));

  const formatBytes = (b) => {
    if (b == null) return '-';
    if (b > 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)}MB`;
    if (b > 1024) return `${(b / 1024).toFixed(0)}KB`;
    return `${b}B`;
  };

  console.log(`✅ 빌드 메트릭 수집 완료`);
  console.log(`   페이지: ${pageCount}개`);
  console.log(`   public/: ${formatBytes(metric.publicDirSize)}`);
  if (buildDir) {
    console.log(`   빌드 출력: ${formatBytes(metric.buildDirSize)}`);
    console.log(`   JS: ${formatBytes(metric.jsSize)}, CSS: ${formatBytes(metric.cssSize)}`);
  }

  return metric;
}

// CLI 직접 실행
const isDirectRun = process.argv[1]?.includes('collect-build-metrics');
if (isDirectRun) {
  collectBuildMetrics().catch((err) => {
    console.error('❌ 빌드 메트릭 수집 실패:', err);
    process.exit(1);
  });
}
