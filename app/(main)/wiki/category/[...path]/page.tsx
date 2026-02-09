import { readFileSync } from 'fs';
import { join } from 'path';
import CategoryPageClient from './CategoryPageClient';

// 정적 빌드 시 wiki-data.json에서 카테고리 경로를 읽어 정적 생성
export const dynamicParams = false;

function collectCategories(items: Array<{ isCategory?: boolean; path?: string; children?: Array<unknown> }>): string[] {
  const result: string[] = [];
  for (const item of items) {
    if (item.isCategory && item.path) {
      result.push(item.path);
      if (item.children) {
        result.push(...collectCategories(item.children as typeof items));
      }
    }
  }
  return result;
}

export function generateStaticParams() {
  try {
    const data = JSON.parse(
      readFileSync(join(process.cwd(), 'public/wiki-data.json'), 'utf-8')
    );
    return collectCategories(data.tree).map((cat: string) => ({
      path: cat.split('/'),
    }));
  } catch {
    return [{ path: ['_'] }];
  }
}

export default function CategoryPage(props: { params: Promise<{ path: string[] }> }) {
  return <CategoryPageClient params={props.params} />;
}
