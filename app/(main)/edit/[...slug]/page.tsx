import EditPageClient from './EditPageClient';

// 정적 빌드(GitHub Pages) 호환 - 실제 라우팅은 클라이언트 사이드에서 처리
export const dynamicParams = false;
export function generateStaticParams() {
  return [{ slug: ['_'] }];
}

export default function EditWikiPage() {
  return <EditPageClient />;
}
