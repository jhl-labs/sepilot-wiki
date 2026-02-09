#!/usr/bin/env node

/**
 * 트렌드 모니터링
 *
 * RSS 피드와 GitHub Releases를 수집하여 Wiki 관련 주제를 감지하고
 * 새 문서 작성 또는 기존 문서 업데이트가 필요한지 판단
 *
 * 트리거: 주 2회 (autonomous-monitor.yml)
 */

import { resolve } from 'path';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { callOpenAI } from '../lib/utils.js';
import { saveReport, createGitHubIssues, getExistingIssues } from '../lib/report-generator.js';
import { addAIHistoryEntry } from '../lib/ai-history.js';
import {
  RSS_FEEDS,
  MONITORED_REPOS,
  RELEVANCE_THRESHOLD,
  MAX_AUTO_ISSUES,
  TREND_LOOKBACK_DAYS,
} from './config.js';

const WIKI_DIR = resolve(process.cwd(), 'wiki');
const IS_DRY_RUN = process.env.DRY_RUN === 'true';

/** RSS XML에서 최근 항목 추출 (간단한 정규식 기반) */
function parseRSSItems(xml, maxItems = 10) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null && items.length < maxItems) {
    const itemXml = match[1];
    const title = itemXml.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, '').trim() || '';
    const link = itemXml.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1]?.trim() || '';
    const pubDate = itemXml.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1]?.trim() || '';
    const description = itemXml.match(/<description[^>]*>([\s\S]*?)<\/description>/i)?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, '').trim().slice(0, 300) || '';

    if (title) {
      items.push({ title, link, pubDate, description });
    }
  }

  return items;
}

/** RSS 피드 수집 */
async function fetchRSSFeeds() {
  const allItems = [];

  for (const feed of RSS_FEEDS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(feed.url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'SEPilot-WikiBot/1.0' },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`⚠️ RSS 실패 (${response.status}): ${feed.name}`);
        continue;
      }

      const xml = await response.text();
      const items = parseRSSItems(xml, 5);

      // 최근 N일 이내 항목만 필터
      const cutoff = Date.now() - TREND_LOOKBACK_DAYS * 24 * 60 * 60 * 1000;
      const recentItems = items.filter((item) => {
        if (!item.pubDate) return true; // 날짜 없으면 포함
        return new Date(item.pubDate).getTime() > cutoff;
      });

      for (const item of recentItems) {
        allItems.push({
          source: feed.name,
          topics: feed.topics,
          ...item,
        });
      }

      console.log(`✅ ${feed.name}: ${recentItems.length}/${items.length}개 항목`);
    } catch (error) {
      console.warn(`⚠️ RSS 수집 실패 (${error.message}): ${feed.name}`);
    }
  }

  return allItems;
}

/** GitHub Releases 수집 */
async function fetchGitHubReleases() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.warn('⚠️ GITHUB_TOKEN 없음, Releases 수집 건너뜀');
    return [];
  }

  const releases = [];

  for (const repo of MONITORED_REPOS) {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${repo}/releases?per_page=3`,
        {
          headers: {
            Accept: 'application/vnd.github.v3+json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) continue;

      const data = await response.json();
      const cutoff = Date.now() - TREND_LOOKBACK_DAYS * 24 * 60 * 60 * 1000;

      for (const release of data) {
        if (new Date(release.published_at).getTime() > cutoff) {
          releases.push({
            source: `GitHub Release: ${repo}`,
            title: `${repo} ${release.tag_name}`,
            link: release.html_url,
            pubDate: release.published_at,
            description: (release.body || '').slice(0, 300),
          });
        }
      }
    } catch (error) {
      console.warn(`⚠️ Release 수집 실패 (${error.message}): ${repo}`);
    }
  }

  return releases;
}

/** 기존 Wiki 문서 목록 로드 */
async function loadExistingDocTitles() {
  const dataFile = resolve(process.cwd(), 'public', 'data', 'wiki-data.json');
  if (!existsSync(dataFile)) return [];

  try {
    const data = JSON.parse(await readFile(dataFile, 'utf-8'));
    return (data.documents || []).map((d) => d.title);
  } catch {
    return [];
  }
}

/** AI로 트렌드 관련성 분석 */
async function analyzeTrendRelevance(items, existingDocs) {
  if (items.length === 0) return [];

  const itemsSummary = items
    .map((item, i) => `[${i}] ${item.source}: "${item.title}" - ${item.description}`)
    .join('\n');

  const systemPrompt = `당신은 기술 Wiki 관리자입니다.
수집된 트렌드 항목들이 Wiki에 얼마나 관련이 있는지 분석합니다.

기존 Wiki 문서 목록:
${existingDocs.join(', ') || '(문서 없음)'}

각 항목에 대해 JSON 배열로 응답하세요:
[
  {
    "index": 0,
    "relevanceScore": 0-100,
    "relatedDocuments": ["관련 기존 문서 제목"],
    "actionNeeded": "new_document" | "update_existing" | "no_action",
    "reason": "판단 근거"
  }
]

판단 기준:
- relevanceScore 60 이상: 액션 필요
- new_document: 관련 문서가 없고 중요한 주제
- update_existing: 기존 문서 내용이 업데이트 필요
- no_action: Wiki와 무관하거나 이미 충분히 다룸`;

  const response = await callOpenAI(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `다음 트렌드 항목들을 분석하세요:\n\n${itemsSummary}` },
    ],
    { temperature: 0.1, maxTokens: 4000, responseFormat: 'json_object' }
  );

  try {
    const cleaned = response.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    // 배열이 아닌 경우 (최상위가 object이면) 배열 추출
    return Array.isArray(parsed) ? parsed : parsed.items || parsed.results || [];
  } catch {
    console.warn('⚠️ 트렌드 분석 JSON 파싱 실패');
    return [];
  }
}

/** 메인 실행 */
async function main() {
  console.log('🔍 트렌드 모니터링 시작...');
  console.log(`   RSS 피드: ${RSS_FEEDS.length}개, GitHub Repos: ${MONITORED_REPOS.length}개`);

  // 1. 데이터 수집 (병렬)
  const [rssItems, releases] = await Promise.all([
    fetchRSSFeeds(),
    fetchGitHubReleases(),
  ]);

  const allItems = [...rssItems, ...releases];
  console.log(`\n📊 수집 완료: RSS ${rssItems.length}건, Releases ${releases.length}건`);

  if (allItems.length === 0) {
    console.log('수집된 항목 없음, 종료');
    await saveReport('trend-report.json', {
      generatedAt: new Date().toISOString(),
      items: [],
      issuesCreated: 0,
    });
    return;
  }

  // 2. 기존 문서 목록 로드
  const existingDocs = await loadExistingDocTitles();

  // 3. AI 관련성 분석
  const analysis = await analyzeTrendRelevance(allItems, existingDocs);

  // 4. 결과 병합
  const trendItems = allItems.map((item, i) => {
    const a = analysis.find((r) => r.index === i) || {};
    return {
      id: `trend-${Date.now()}-${i}`,
      source: item.source,
      title: item.title,
      url: item.link,
      publishedAt: item.pubDate || new Date().toISOString(),
      summary: item.description,
      relevanceScore: a.relevanceScore || 0,
      relatedDocuments: a.relatedDocuments || [],
      actionNeeded: a.actionNeeded || 'no_action',
      reason: a.reason || '',
      issueCreated: null,
    };
  });

  // 5. 액션이 필요한 항목 → Issue 생성
  const actionable = trendItems
    .filter((t) => t.relevanceScore >= RELEVANCE_THRESHOLD && t.actionNeeded !== 'no_action')
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, MAX_AUTO_ISSUES);

  let issuesCreated = 0;

  if (actionable.length > 0 && !IS_DRY_RUN) {
    const existingIssueTitles = await getExistingIssues('wiki-maintenance');

    for (const item of actionable) {
      const label = item.actionNeeded === 'new_document' ? 'request' : 'update-request';
      const prefix = item.actionNeeded === 'new_document' ? '[요청]' : '[업데이트]';
      const issueTitle = `${prefix} ${item.title}`;

      // 중복 확인
      if (existingIssueTitles.includes(issueTitle.toLowerCase())) {
        console.log(`⏭️ 중복 Issue 건너뜀: ${issueTitle}`);
        continue;
      }

      const issueBody = [
        `> 🤖 자동 감지: 트렌드 모니터링`,
        '',
        `**출처**: ${item.source}`,
        `**URL**: ${item.url}`,
        `**관련도**: ${item.relevanceScore}/100`,
        '',
        `## 감지 내용`,
        item.summary,
        '',
        `## 판단 근거`,
        item.reason,
        '',
        item.relatedDocuments.length > 0
          ? `## 관련 기존 문서\n${item.relatedDocuments.map((d) => `- ${d}`).join('\n')}`
          : '',
      ].join('\n');

      try {
        const issues = await createGitHubIssues([
          { title: issueTitle, body: issueBody, labels: [label, 'auto-detected'] },
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

  // 6. 보고서 저장
  const report = {
    generatedAt: new Date().toISOString(),
    config: {
      rssFeeds: RSS_FEEDS.length,
      monitoredRepos: MONITORED_REPOS.length,
      lookbackDays: TREND_LOOKBACK_DAYS,
      relevanceThreshold: RELEVANCE_THRESHOLD,
    },
    summary: {
      totalItems: allItems.length,
      actionableItems: actionable.length,
      issuesCreated,
    },
    items: trendItems,
  };

  await saveReport('trend-report.json', report);

  // 7. AI History 기록
  await addAIHistoryEntry({
    actionType: 'maintain',
    issueNumber: null,
    issueTitle: '트렌드 모니터링',
    documentSlug: null,
    documentTitle: null,
    summary: `트렌드 모니터링: ${allItems.length}건 수집, ${actionable.length}건 감지, ${issuesCreated}건 Issue 생성`,
    trigger: 'scheduled',
  });

  console.log(`\n✅ 트렌드 모니터링 완료`);
  console.log(`   수집: ${allItems.length}건, 액션 필요: ${actionable.length}건, Issue 생성: ${issuesCreated}건`);
}

main().catch((error) => {
  console.error('❌ 트렌드 모니터링 실패:', error.message);
  process.exit(1);
});
