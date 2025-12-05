import type { NavigationConfig } from './src/types';

/**
 * 네비게이션 설정
 *
 * 이 파일에서 사이드바 메뉴와 커스텀 링크를 설정합니다.
 * wiki 폴더의 문서들은 자동으로 '문서' 섹션에 추가됩니다.
 * 여기서는 추가적인 커스텀 섹션과 외부 링크를 정의할 수 있습니다.
 *
 * 아이콘: lucide-react 아이콘 이름 사용 (https://lucide.dev/icons)
 */
export const navigationConfig: NavigationConfig = {
  // 사이드바 섹션 설정
  sidebar: [
    // 외부 링크 섹션 예시
    // {
    //   title: '리소스',
    //   icon: 'ExternalLink',
    //   collapsible: true,
    //   defaultOpen: false,
    //   items: [
    //     {
    //       label: 'GitHub',
    //       href: 'https://github.com/your-username/your-repo',
    //       icon: 'Github',
    //       external: true,
    //     },
    //     {
    //       label: 'Discord 커뮤니티',
    //       href: 'https://discord.gg/your-server',
    //       icon: 'MessageCircle',
    //       external: true,
    //     },
    //     {
    //       label: 'API 문서',
    //       href: 'https://api.your-service.com/docs',
    //       icon: 'FileCode',
    //       external: true,
    //       badge: 'Beta',
    //     },
    //   ],
    // },

    // 중첩 메뉴 예시
    // {
    //   title: '가이드',
    //   icon: 'BookOpen',
    //   collapsible: true,
    //   defaultOpen: false,
    //   items: [
    //     {
    //       label: '기본 사용법',
    //       href: '/wiki/guides/basic',
    //       icon: 'Book',
    //       children: [
    //         { label: '마크다운 작성', href: '/wiki/guides/markdown' },
    //         { label: '이미지 삽입', href: '/wiki/guides/images' },
    //       ],
    //     },
    //     {
    //       label: '고급 기능',
    //       href: '/wiki/guides/advanced',
    //       icon: 'Settings',
    //     },
    //   ],
    // },
  ],

  // 헤더 네비게이션 (선택사항)
  // main: [
  //   {
  //     title: '메인 메뉴',
  //     items: [
  //       { label: '홈', href: '/', icon: 'Home' },
  //       { label: '문서', href: '/wiki', icon: 'FileText' },
  //       { label: 'GitHub', href: 'https://github.com', icon: 'Github', external: true },
  //     ],
  //   },
  // ],
};

export default navigationConfig;
