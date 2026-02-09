#!/usr/bin/env node

/**
 * GitHub에서 기존 Issue들을 동기화하여 issues.json 생성
 * 초기 설정 또는 수동 동기화용
 *
 * 사용법:
 * node scripts/sync-issues.js
 *
 * 환경 변수:
 * - GITHUB_TOKEN: GitHub API 토큰
 * - GITHUB_REPOSITORY: owner/repo 형식
 */

import { syncFromGitHub } from '../lib/issues-store.js';

async function main() {
  console.log('🔄 GitHub Issue 동기화 시작...');

  const result = await syncFromGitHub();

  if (result) {
    console.log(`✅ 동기화 완료: ${result.issues.length}개 Issue`);
  } else {
    console.log('⚠️ 동기화 실패 또는 GitHub 정보 없음');
    console.log('   GITHUB_TOKEN과 GITHUB_REPOSITORY 환경 변수를 확인하세요.');
  }
}

main();
