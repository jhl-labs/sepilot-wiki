import type { SiteConfig } from './src/types';

/**
 * 사이트 기본 설정
 *
 * 이 파일에서 위키의 기본 정보를 설정합니다.
 * - title: 사이트 제목 (브라우저 탭, 헤더에 표시)
 * - description: 사이트 설명 (SEO, 메타 태그에 사용)
 * - logo: 로고 설정 (텍스트, 이미지, 아이콘 중 선택)
 * - favicon: 파비콘 경로
 * - owner/repo: GitHub 저장소 정보
 * - wikiPath: 위키 문서가 저장된 폴더 경로
 * - social: 소셜 링크
 * - footer: 푸터 설정
 */
export const siteConfig: SiteConfig = {
  // 사이트 기본 정보
  title: 'SEPilot Wiki',
  description: 'AI 기반 자동화 위키 시스템',

  // 로고 설정
  // type: 'text' | 'image' | 'icon'
  // - text: value에 텍스트 입력 (예: 'My Wiki')
  // - image: value에 이미지 경로 입력 (예: '/logo.png')
  // - icon: value에 lucide 아이콘 이름 입력 (예: 'BookOpen')
  logo: {
    type: 'text',
    value: 'SEPilot Wiki',
  },

  // 파비콘 경로 (public 폴더 기준)
  favicon: '/favicon.ico',

  // GitHub 저장소 정보
  owner: 'jhl-labs',
  repo: 'sepilot-wiki',
  wikiPath: 'wiki',

  // 소셜 링크 (선택사항)
  social: {
    github: 'https://github.com/your-username',
    // twitter: 'https://twitter.com/your-username',
    // discord: 'https://discord.gg/your-server',
    // website: 'https://your-website.com',
  },

  // 푸터 설정 (선택사항)
  footer: {
    enabled: true, // 푸터 표시 여부

    // Copyright 설정
    copyright: {
      enabled: true, // Copyright 표시 여부
      text: 'SEPilot Wiki. All rights reserved.', // Copyright 문구 (© 연도는 자동 추가)
      startYear: 2024, // 시작 연도 (현재 연도와 다르면 "2024-2025" 형식으로 표시)
    },

    // 푸터 링크
    links: [
      { label: 'GitHub', url: 'https://github.com/jhl-labs' },
      // { label: 'Twitter', url: 'https://twitter.com/your-username' },
    ],

    showPoweredBy: true, // 'Powered by SEPilot Wiki' 표시 여부
  },
};

export default siteConfig;
