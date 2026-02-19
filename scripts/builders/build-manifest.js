#!/usr/bin/env node

/**
 * 빌드 매니페스트 관리
 *
 * 각 wiki 문서의 content SHA-256 해시를 계산하고 매니페스트 파일로 관리
 * build-pipeline.js에서 매니페스트를 비교하여 변경된 파일만 재빌드
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { createHash } from 'crypto';
import { findMarkdownFiles } from './build-wiki-data.js';

const WIKI_DIR = join(process.cwd(), 'wiki');
const DATA_DIR = join(process.cwd(), 'public', 'data');
const MANIFEST_FILE = join(DATA_DIR, 'build-manifest.json');

/**
 * 파일 내용의 SHA-256 해시 계산
 * @param {string} content
 * @returns {string}
 */
export function computeHash(content) {
  return createHash('sha256').update(content).digest('hex');
}

/**
 * 매니페스트 로드
 * @returns {Promise<Object>}
 */
export async function loadManifest() {
  if (!existsSync(MANIFEST_FILE)) {
    return { files: {}, lastFullBuild: null };
  }
  try {
    return JSON.parse(await readFile(MANIFEST_FILE, 'utf-8'));
  } catch {
    return { files: {}, lastFullBuild: null };
  }
}

/**
 * 매니페스트 저장
 * @param {Object} manifest
 */
export async function saveManifest(manifest) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(MANIFEST_FILE, JSON.stringify(manifest, null, 2));
}

/**
 * 현재 wiki 파일들의 해시 계산
 * @returns {Promise<Object>} 파일별 해시 맵
 */
export async function computeCurrentHashes() {
  const files = {};

  if (!existsSync(WIKI_DIR)) {
    return files;
  }

  const mdFiles = await findMarkdownFiles(WIKI_DIR);
  for (const { fullPath, relativePath } of mdFiles) {
    const content = await readFile(fullPath, 'utf-8');
    files[relativePath] = {
      hash: computeHash(content),
      lastBuilt: new Date().toISOString(),
    };
  }

  return files;
}

/**
 * 변경된 파일 목록 반환
 * @param {Object} oldManifest
 * @param {Object} currentHashes
 * @returns {{changed: string[], added: string[], removed: string[]}}
 */
export function diffManifest(oldManifest, currentHashes) {
  const changed = [];
  const added = [];

  for (const [path, entry] of Object.entries(currentHashes)) {
    const oldEntry = oldManifest.files[path];
    if (!oldEntry) {
      added.push(path);
    } else if (oldEntry.hash !== entry.hash) {
      changed.push(path);
    }
  }

  const currentPaths = new Set(Object.keys(currentHashes));
  const removed = Object.keys(oldManifest.files).filter(
    (path) => !currentPaths.has(path)
  );

  return { changed, added, removed };
}

// CLI 직접 실행 지원
const isDirectRun = process.argv[1]?.includes('build-manifest');
if (isDirectRun) {
  (async () => {
    console.log('📋 빌드 매니페스트 생성...');
    const currentHashes = await computeCurrentHashes();
    const manifest = {
      files: currentHashes,
      lastFullBuild: new Date().toISOString(),
    };
    await saveManifest(manifest);
    console.log(`✅ 매니페스트 저장: ${Object.keys(currentHashes).length}개 파일`);
  })().catch((err) => {
    console.error('❌ 매니페스트 생성 실패:', err);
    process.exit(1);
  });
}
