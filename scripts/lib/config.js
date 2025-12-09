/**
 * site.config.ts에서 설정을 읽어오는 유틸리티
 * Node.js 스크립트에서 사용
 */

import { readFileSync } from 'fs';
import { join } from 'path';

// site.config.ts 파일을 파싱하여 설정 추출
function parseSiteConfig() {
  const configPath = join(process.cwd(), 'site.config.ts');
  const content = readFileSync(configPath, 'utf-8');

  // 간단한 파싱: 주요 필드만 추출
  const config = {};

  // owner 추출
  const ownerMatch = content.match(/owner:\s*['"]([^'"]+)['"]/);
  if (ownerMatch) config.owner = ownerMatch[1];

  // repo 추출
  const repoMatch = content.match(/repo:\s*['"]([^'"]+)['"]/);
  if (repoMatch) config.repo = repoMatch[1];

  // title 추출
  const titleMatch = content.match(/title:\s*['"]([^'"]+)['"]/);
  if (titleMatch) config.title = titleMatch[1];

  // wikiPath 추출
  const wikiPathMatch = content.match(/wikiPath:\s*['"]([^'"]+)['"]/);
  if (wikiPathMatch) config.wikiPath = wikiPathMatch[1];

  // github 설정 추출 (GHES 지원)
  const githubSection = content.match(/github:\s*\{([^}]+)\}/s);
  if (githubSection) {
    config.github = {};
    const baseUrlMatch = githubSection[1].match(/baseUrl:\s*['"]([^'"]+)['"]/);
    if (baseUrlMatch) config.github.baseUrl = baseUrlMatch[1];

    const apiUrlMatch = githubSection[1].match(/apiUrl:\s*['"]([^'"]+)['"]/);
    if (apiUrlMatch) config.github.apiUrl = apiUrlMatch[1];

    const rawUrlMatch = githubSection[1].match(/rawUrl:\s*['"]([^'"]+)['"]/);
    if (rawUrlMatch) config.github.rawUrl = rawUrlMatch[1];
  }

  return config;
}

// 설정 캐시
let cachedConfig = null;

/**
 * 사이트 설정을 가져옵니다.
 * @returns {Object} 사이트 설정 객체
 */
export function getSiteConfig() {
  if (!cachedConfig) {
    cachedConfig = parseSiteConfig();
  }
  return cachedConfig;
}

/**
 * GitHub 관련 설정을 가져옵니다.
 * 환경 변수가 있으면 우선 사용하고, 없으면 site.config.ts에서 읽습니다.
 */
export function getGitHubConfig() {
  const siteConfig = getSiteConfig();
  const github = siteConfig.github || {};

  // 환경 변수 우선, 없으면 site.config.ts, 없으면 기본값
  return {
    // owner/repo: 환경 변수 GITHUB_REPOSITORY (owner/repo 형식) 또는 site.config.ts
    owner: process.env.GITHUB_REPOSITORY?.split('/')[0] || siteConfig.owner,
    repo: process.env.GITHUB_REPOSITORY?.split('/')[1] || siteConfig.repo,
    repository: process.env.GITHUB_REPOSITORY || `${siteConfig.owner}/${siteConfig.repo}`,

    // GitHub URLs
    baseUrl: process.env.GITHUB_SERVER_URL || github.baseUrl || 'https://github.com',
    apiUrl: process.env.GITHUB_API_URL || github.apiUrl || 'https://api.github.com',
    rawUrl: github.rawUrl || 'https://raw.githubusercontent.com',

    // Token
    token: process.env.GITHUB_TOKEN || process.env.GH_TOKEN,
  };
}

export default { getSiteConfig, getGitHubConfig };
