/**
 * 공통 유틸리티 함수
 */

/**
 * 슬러그를 사람이 읽기 쉬운 제목으로 변환
 * @example formatTitle('hello-world') => 'Hello World'
 * @example formatTitle('api_docs') => 'Api Docs'
 */
export function formatTitle(slug: string): string {
  return slug
    .replace(/-/g, ' ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * 제목을 URL-safe 슬러그로 변환
 * @example slugify('Hello World') => 'hello-world'
 * @example slugify('API 문서') => 'api-문서'
 */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/**
 * 날짜를 상대적 시간으로 표시
 * @example formatRelativeTime(new Date()) => '방금 전'
 */
export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const target = typeof date === 'string' ? new Date(date) : date;
  const diffMs = now.getTime() - target.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  if (diffDay < 7) return `${diffDay}일 전`;

  return target.toLocaleDateString('ko-KR');
}

/**
 * 마크다운에서 순수 텍스트만 추출
 */
export function extractPlainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, '') // 코드 블록 제거
    .replace(/`[^`]+`/g, '') // 인라인 코드 제거
    .replace(/!\[.*?\]\(.*?\)/g, '') // 이미지 제거
    .replace(/\[([^\]]+)\]\(.*?\)/g, '$1') // 링크에서 텍스트만
    .replace(/<[^>]+>/g, '') // HTML 태그 제거
    .replace(/^#+\s*/gm, '') // 헤더 기호 제거
    .replace(/[*_~]{1,3}([^*_~]+)[*_~]{1,3}/g, '$1') // 굵게/기울임 제거
    .replace(/^>\s*/gm, '') // 인용문 기호 제거
    .replace(/^[-*+]\s+/gm, '') // 리스트 기호 제거
    .replace(/^\d+\.\s+/gm, '') // 숫자 리스트 제거
    .replace(/^[-*_]{3,}$/gm, '') // 구분선 제거
    .replace(/\|/g, ' ') // 테이블 구분자 제거
    .replace(/\n{2,}/g, '\n') // 여러 줄바꿈 정리
    .trim();
}

/**
 * 문자열을 지정된 길이로 자르고 말줄임표 추가
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength).trim() + '...';
}
