import type { Metadata } from 'next';
import { getWikiPage } from '@/lib/wiki';
import { WikiPageClient } from './WikiPageClient';
import { extractPlainText, truncate } from '@/src/utils';

interface WikiPageProps {
  params: Promise<{ slug: string[] }>;
}

// 동적 메타데이터 생성
export async function generateMetadata({ params }: WikiPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const slug = resolvedParams.slug?.join('/') || 'home';
  const page = await getWikiPage(slug);

  if (!page) {
    return {
      title: '페이지를 찾을 수 없습니다',
      description: '요청하신 문서가 존재하지 않거나 삭제되었습니다.',
    };
  }

  // 콘텐츠에서 설명 추출 (첫 160자)
  const description = page.description || truncate(extractPlainText(page.content), 160);
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'SEPilot Wiki';

  return {
    title: page.title,
    description,
    keywords: page.tags?.join(', '),
    authors: page.author ? [{ name: page.author }] : undefined,
    openGraph: {
      title: page.title,
      description,
      type: 'article',
      siteName,
      publishedTime: page.createdAt,
      modifiedTime: page.updatedAt,
      tags: page.tags,
    },
    twitter: {
      card: 'summary',
      title: page.title,
      description,
    },
  };
}

export default async function WikiPage({ params }: WikiPageProps) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug?.join('/') || 'home';

  return <WikiPageClient slug={slug} />;
}
