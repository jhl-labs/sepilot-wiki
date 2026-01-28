import { promises as fs } from 'fs';
import path from 'path';
import type { WikiPage, WikiTree } from '../src/types';

/**
 * 서버 사이드에서 Wiki 데이터를 로드하는 유틸리티
 * generateMetadata 및 서버 컴포넌트에서 사용
 */

interface WikiData {
  pages: WikiPage[];
  tree: WikiTree[];
}

interface GuideData {
  pages: WikiPage[];
}

// 프로젝트 루트의 public 디렉토리 경로
const getPublicDir = () => path.join(process.cwd(), 'public');

/**
 * 서버에서 wiki-data.json 파일 읽기
 */
export async function getWikiData(): Promise<WikiData> {
  try {
    const filePath = path.join(getPublicDir(), 'wiki-data.json');
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return { pages: [], tree: [] };
  }
}

/**
 * 서버에서 guide-data.json 파일 읽기
 */
export async function getGuideData(): Promise<GuideData> {
  try {
    const filePath = path.join(getPublicDir(), 'guide-data.json');
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return { pages: [] };
  }
}

/**
 * 슬러그로 Wiki 페이지 가져오기 (서버용)
 */
export async function getWikiPage(slug: string): Promise<WikiPage | null> {
  // wiki-data.json에서 먼저 찾기
  const wikiData = await getWikiData();
  const wikiPage = wikiData.pages.find((p) => p.slug === slug);
  if (wikiPage) {
    return wikiPage;
  }

  // guide-data.json에서 찾기
  const guideData = await getGuideData();
  const guideSlug = slug.startsWith('guide/') ? slug.slice(6) : slug;
  const guidePage = guideData.pages.find((p) => p.slug === guideSlug);
  if (guidePage) {
    return { ...guidePage, slug: `guide/${guidePage.slug}` };
  }

  return null;
}

/**
 * Wiki 페이지 목록 가져오기 (서버용)
 */
export async function getWikiPages(): Promise<WikiTree[]> {
  const data = await getWikiData();
  return data.tree.filter(item => {
    if (item.isCategory && (item.path === '_guide' || item.name === '_guide')) return false;
    if (item.slug && item.slug.startsWith('_guide/')) return false;
    return true;
  });
}
