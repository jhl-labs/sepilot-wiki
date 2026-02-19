#!/usr/bin/env node

/**
 * Sitemap.xml 생성 스크립트
 *
 * 빌드 시 wiki 페이지 목록을 기반으로 sitemap.xml 생성
 * build-pipeline.js에서 호출되거나 독립 실행 가능
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const PUBLIC_DIR = join(process.cwd(), 'public');
const OUTPUT_FILE = join(PUBLIC_DIR, 'sitemap.xml');

// 사이트 기본 URL (GitHub Pages)
function getSiteUrl() {
  // SITE_URL 환경변수 우선
  if (process.env.SITE_URL) {
    return process.env.SITE_URL.replace(/\/$/, '');
  }
  // GitHub repository 정보에서 추론
  const repo = process.env.GITHUB_REPOSITORY || 'owner/sepilot-wiki';
  const [owner] = repo.split('/');
  const repoName = repo.split('/')[1] || 'sepilot-wiki';
  return `https://${owner}.github.io/${repoName}`;
}

/**
 * Sitemap XML 빌드
 * @param {Array} [pages] - 미리 로드된 페이지 배열 (없으면 wiki-meta.json에서 로드)
 */
export async function buildSitemap(pages) {
  console.log('🗺️ Sitemap 빌드 시작...');

  if (!pages) {
    const metaFile = join(PUBLIC_DIR, 'wiki-meta.json');
    if (!existsSync(metaFile)) {
      console.log('⚠️ wiki-meta.json이 없습니다. Sitemap 생성을 건너뜁니다.');
      return;
    }
    const metaData = JSON.parse(await readFile(metaFile, 'utf-8'));
    pages = metaData.pages || [];
  }

  const siteUrl = getSiteUrl();

  const urls = pages.map((page) => {
    const lastmod = page.lastModified
      ? new Date(page.lastModified).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    return `  <url>
    <loc>${siteUrl}/wiki/${page.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
  });

  // 홈 페이지 추가
  urls.unshift(`  <url>
    <loc>${siteUrl}/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

  await mkdir(PUBLIC_DIR, { recursive: true });
  await writeFile(OUTPUT_FILE, xml);

  console.log(`✅ Sitemap 빌드 완료: ${pages.length + 1}개 URL`);
  console.log(`   출력: ${OUTPUT_FILE}`);
}

// CLI 직접 실행 지원
const isDirectRun = process.argv[1]?.includes('build-sitemap');
if (isDirectRun) {
  buildSitemap().catch((err) => {
    console.error('❌ Sitemap 빌드 실패:', err);
    process.exit(1);
  });
}
