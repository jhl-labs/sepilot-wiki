#!/usr/bin/env node

/**
 * 외부 변경 감지
 *
 * Wiki 문서에 참조된 외부 URL의 변경/삭제를 추적
 * 콘텐츠 해시 비교를 통해 변화를 감지하고
 * 문서 업데이트가 필요한 경우 자동으로 알림
 *
 * 트리거: 주 2회 (autonomous-monitor.yml)
 */

import { resolve } from 'path';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { createHash } from 'crypto';
import { saveReport, createGitHubIssues, getExistingIssues } from '../lib/report-generator.js';
import { addAIHistoryEntry } from '../lib/ai-history.js';
import { loadAllDocuments } from '../lib/document-scanner.js';
import { extractUrls } from '../lib/web-fetcher.js';
import { MAX_AUTO_ISSUES } from './config.js';

const WIKI_DIR = resolve(process.cwd(), 'wiki');
const SNAPSHOT_FILE = resolve(process.cwd(), 'public', 'data', 'url-snapshots.json');
const IS_DRY_RUN = process.env.DRY_RUN === 'true';

/** fetch 타임아웃 (ms) */
const FETCH_TIMEOUT = 10000;

/** 한 번에 체크할 최대 URL 수 */
const MAX_URLS_TO_CHECK = 30;

/** 건너뛸 URL 패턴 */
const SKIP_PATTERNS = [
  /^https?:\/\/api\.github\.com/i,
  /\.(png|jpg|jpeg|gif|svg|webp|ico|bmp|mp4|pdf|zip)(\?|$)/i,
  // SSRF 방지: 내부/프라이빗 IP 대역 차단
  /^https?:\/\/localhost/i,
  /^https?:\/\/127\./i,
  /^https?:\/\/10\./i,
  /^https?:\/\/172\.(1[6-9]|2\d|3[01])\./i,
  /^https?:\/\/192\.168\./i,
  /^https?:\/\/169\.254\./i,  // 클라우드 메타데이터
  /^https?:\/\/0\./i,
  /^https?:\/\/\[::1\]/i,     // IPv6 루프백
];

/**
 * 기존 스냅샷 로드
 * @returns {Promise<Object[]>}
 */
async function loadSnapshots() {
  if (!existsSync(SNAPSHOT_FILE)) return [];

  try {
    const data = JSON.parse(await readFile(SNAPSHOT_FILE, 'utf-8'));
    return data.snapshots || [];
  } catch {
    return [];
  }
}

/**
 * 문서에서 외부 URL 추출
 * @returns {Array<{url: string, documentSlug: string}>}
 */
async function collectDocumentUrls() {
  const docs = await loadAllDocuments({ wikiDir: WIKI_DIR });
  const urlMap = [];

  for (const doc of docs) {
    const urls = extractUrls(doc.content || '');
    const filtered = urls.filter((url) => !SKIP_PATTERNS.some((p) => p.test(url)));

    for (const url of filtered) {
      urlMap.push({
        url,
        documentSlug: doc.slug || doc.path.replace('.md', ''),
      });
    }
  }

  // URL별로 중복 제거 (첫 번째 문서만 기록)
  const seen = new Set();
  return urlMap.filter((item) => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}

/**
 * URL 콘텐츠 해시 생성
 * @param {string} url
 * @returns {Promise<{contentHash: string, status: string}>}
 */
async function checkUrl(url) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'SEPilot-WikiBot/1.0' },
      redirect: 'follow',
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        contentHash: '',
        status: response.status >= 400 && response.status < 500 ? 'broken' : 'error',
      };
    }

    const text = await response.text();
    // 본문 핵심 부분만 해시 (날짜/시간 등의 동적 요소 제외)
    const cleaned = text
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 10000);

    const contentHash = createHash('sha256').update(cleaned).digest('hex');

    return { contentHash, status: 'ok' };
  } catch (error) {
    if (error.name === 'AbortError') {
      return { contentHash: '', status: 'timeout' };
    }
    return { contentHash: '', status: 'error' };
  }
}

/** 메인 실행 */
async function main() {
  console.log('🔍 외부 변경 감지 시작...');

  // 1. 문서에서 URL 수집
  const docUrls = await collectDocumentUrls();
  console.log(`   문서 URL: ${docUrls.length}개 발견`);

  if (docUrls.length === 0) {
    console.log('URL 없음, 종료');
    return;
  }

  // 2. 기존 스냅샷 로드
  const existingSnapshots = await loadSnapshots();
  const snapshotMap = new Map(existingSnapshots.map((s) => [s.url, s]));

  // 3. 체크할 URL 선정 (최대 개수 제한)
  const urlsToCheck = docUrls.slice(0, MAX_URLS_TO_CHECK);
  console.log(`   체크 대상: ${urlsToCheck.length}개`);

  // 4. URL 체크 (병렬, 5개씩)
  const results = [];
  const batchSize = 5;

  for (let i = 0; i < urlsToCheck.length; i += batchSize) {
    const batch = urlsToCheck.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (item) => {
        const check = await checkUrl(item.url);
        const existing = snapshotMap.get(item.url);

        let status = check.status;
        if (status === 'ok' && existing && existing.contentHash && check.contentHash !== existing.contentHash) {
          status = 'changed';
        }

        return {
          url: item.url,
          documentSlug: item.documentSlug,
          contentHash: check.contentHash,
          status,
          lastChecked: new Date().toISOString(),
          previousHash: existing?.contentHash || null,
        };
      })
    );
    results.push(...batchResults);
  }

  // 5. 변경/깨진 URL 집계
  const changed = results.filter((r) => r.status === 'changed');
  const broken = results.filter((r) => r.status === 'broken');
  const timeout = results.filter((r) => r.status === 'timeout');

  console.log(`\n📊 결과: 정상 ${results.filter((r) => r.status === 'ok').length}, 변경 ${changed.length}, 깨짐 ${broken.length}, 타임아웃 ${timeout.length}`);

  // 6. 변경/깨진 URL → Issue 생성
  let issuesCreated = 0;
  const alertItems = [...changed, ...broken].slice(0, MAX_AUTO_ISSUES);

  if (alertItems.length > 0 && !IS_DRY_RUN) {
    const existingIssueTitles = await getExistingIssues('wiki-maintenance');

    for (const item of alertItems) {
      const issueTitle = `[URL ${item.status === 'broken' ? '깨짐' : '변경'}] ${item.documentSlug} 문서 참조 URL 확인 필요`;

      if (existingIssueTitles.includes(issueTitle.toLowerCase())) continue;

      const issueBody = [
        `> 🤖 자동 감지: 외부 URL 변경 감지`,
        '',
        `**문서**: \`wiki/${item.documentSlug}.md\``,
        `**URL**: ${item.url}`,
        `**상태**: ${item.status === 'broken' ? '❌ 접근 불가' : '🔄 내용 변경됨'}`,
        '',
        item.status === 'changed'
          ? '해당 URL의 내용이 변경되었습니다. 문서에 반영된 정보가 여전히 정확한지 확인이 필요합니다.'
          : '해당 URL에 접근할 수 없습니다. 대체 URL을 찾거나 참조를 제거해야 할 수 있습니다.',
      ].join('\n');

      try {
        const issues = await createGitHubIssues([
          { title: issueTitle, body: issueBody, labels: ['update-request', 'auto-detected'] },
        ]);

        if (issues.length > 0) {
          item.issueCreated = issues[0].number;
          issuesCreated++;
        }
      } catch (error) {
        console.warn(`⚠️ Issue 생성 실패: ${error.message}`);
      }
    }
  }

  // 7. 스냅샷 저장
  const snapshots = results.map((r) => ({
    url: r.url,
    documentSlug: r.documentSlug,
    contentHash: r.contentHash,
    status: r.status === 'changed' ? 'ok' : r.status, // 감지 후에는 ok로 리셋
    lastChecked: r.lastChecked,
  }));

  // 체크하지 않은 기존 스냅샷도 유지
  const checkedUrls = new Set(results.map((r) => r.url));
  for (const existing of existingSnapshots) {
    if (!checkedUrls.has(existing.url)) {
      snapshots.push(existing);
    }
  }

  await saveReport('url-snapshots.json', {
    lastChecked: new Date().toISOString(),
    totalUrls: snapshots.length,
    snapshots,
  });

  // 8. AI History 기록
  await addAIHistoryEntry({
    actionType: 'maintain',
    issueNumber: null,
    issueTitle: 'URL 변경 감지',
    documentSlug: null,
    documentTitle: null,
    summary: `URL 변경 감지: ${results.length}개 체크, ${changed.length}개 변경, ${broken.length}개 깨짐, ${issuesCreated}건 Issue`,
    trigger: 'scheduled',
  });

  console.log(`\n✅ 외부 변경 감지 완료 (Issue ${issuesCreated}건 생성)`);
}

main().catch((error) => {
  console.error('❌ 외부 변경 감지 실패:', error.message);
  process.exit(1);
});
