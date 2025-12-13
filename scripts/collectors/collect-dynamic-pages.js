#!/usr/bin/env node

/**
 * 동적 페이지 생성 Collector 실행기
 *
 * 모든 등록된 Collector를 실행하여 wiki 페이지를 동적으로 생성합니다.
 *
 * 사용법:
 *   node scripts/collect-dynamic-pages.js          # 모든 Collector 실행
 *   node scripts/collect-dynamic-pages.js k8s-nodes  # 특정 Collector만 실행
 *
 * 환경변수:
 *   COLLECTORS: 실행할 Collector 이름 (쉼표 구분)
 *               예: COLLECTORS=k8s-nodes,k8s-pods
 */

import { createCollectors, getCollectorByName } from './collectors/index.js';

async function main() {
  console.log('🚀 동적 페이지 수집 시작...\n');
  const startTime = Date.now();

  // 실행할 Collector 결정
  let collectorsToRun = [];

  // 커맨드라인 인자로 특정 Collector 지정
  const args = process.argv.slice(2);
  if (args.length > 0) {
    for (const name of args) {
      const collector = getCollectorByName(name);
      if (collector) {
        collectorsToRun.push(collector);
      } else {
        console.warn(`⚠️ 알 수 없는 Collector: ${name}`);
      }
    }
  }
  // 환경변수로 지정
  else if (process.env.COLLECTORS) {
    const names = process.env.COLLECTORS.split(',').map(s => s.trim());
    for (const name of names) {
      const collector = getCollectorByName(name);
      if (collector) {
        collectorsToRun.push(collector);
      } else {
        console.warn(`⚠️ 알 수 없는 Collector: ${name}`);
      }
    }
  }
  // 기본: 모든 Collector 실행
  else {
    collectorsToRun = createCollectors();
  }

  if (collectorsToRun.length === 0) {
    console.log('실행할 Collector가 없습니다.');
    return;
  }

  console.log(`📋 실행할 Collector: ${collectorsToRun.map(c => c.name).join(', ')}`);

  // 각 Collector 실행
  const results = [];
  for (const collector of collectorsToRun) {
    const success = await collector.run();
    results.push({ name: collector.name, success });
  }

  // 결과 요약
  const elapsed = Date.now() - startTime;
  const succeeded = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log('\n' + '='.repeat(50));
  console.log('📊 수집 결과 요약');
  console.log('='.repeat(50));
  console.log(`   전체: ${results.length}개`);
  console.log(`   성공: ${succeeded}개`);
  console.log(`   실패: ${failed}개`);
  console.log(`   소요 시간: ${elapsed}ms`);

  if (failed > 0) {
    console.log('\n❌ 실패한 Collector:');
    for (const r of results.filter(r => !r.success)) {
      console.log(`   - ${r.name}`);
    }
    process.exit(1);
  }

  console.log('\n✅ 모든 동적 페이지 수집 완료!');
}

main().catch((err) => {
  console.error('❌ 수집 실패:', err);
  process.exit(1);
});
