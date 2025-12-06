---
title: 테마 커스터마이징
tags: [테마, 커스터마이징, 설정]
---

# 테마 커스터마이징

SEPilot Wiki는 Astro와 유사하게 설정 파일을 통해 다양한 커스터마이징을 지원합니다.

## 설정 파일 구조

```
project-root/
├── site.config.ts      # 사이트 기본 설정
├── theme.config.ts     # 테마 (색상, 폰트)
├── navigation.config.ts # 네비게이션 메뉴
└── src/styles/custom.css # 커스텀 CSS
```

## 사이트 설정 (site.config.ts)

### 기본 정보

```typescript
export const siteConfig: SiteConfig = {
  title: 'My Wiki',
  description: 'AI 기반 자동화 위키',

  // GitHub 저장소
  owner: 'jhl-labs',
  repo: 'sepilot-wiki',
  wikiPath: 'wiki',
};
```

### 로고 설정

```typescript
// 텍스트 로고
logo: {
  type: 'text',
  value: 'My Wiki',
}

// 이미지 로고
logo: {
  type: 'image',
  value: '/logo.png',
  alt: 'My Wiki Logo',
}

// 아이콘 로고 (lucide-react)
logo: {
  type: 'icon',
  value: 'BookOpen',
}
```

### Footer 설정

```typescript
footer: {
  enabled: true,
  copyright: {
    enabled: true,
    text: 'My Company. All rights reserved.',
    startYear: 2024,  // © 2024-2025 형식
  },
  links: [
    { label: 'GitHub', url: 'https://github.com/...' },
  ],
  showPoweredBy: true,
}
```

## 테마 설정 (theme.config.ts)

### 색상 커스터마이징

```typescript
export const themeConfig: ThemeConfig = {
  colors: {
    light: {
      primary: '#3b82f6',      // 메인 브랜드 색상
      background: '#ffffff',
      text: '#0f172a',
      accent: '#8b5cf6',
    },
    dark: {
      primary: '#60a5fa',
      background: '#0f172a',
      text: '#f8fafc',
      accent: '#a78bfa',
    },
  },
};
```

### 폰트 설정

```typescript
fonts: {
  sans: "'Pretendard', sans-serif",
  mono: "'JetBrains Mono', monospace",
}
```

### 레이아웃 설정

```typescript
layout: {
  headerHeight: '64px',
  sidebarWidth: '280px',
  contentMaxWidth: '900px',
}
```

## 커스텀 CSS

`src/styles/custom.css`에서 추가 스타일을 정의할 수 있습니다:

```css
/* 헤더 그라데이션 */
.header {
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
}

/* 커스텀 마크다운 스타일 */
.markdown-content h1 {
  border-bottom: 3px solid var(--color-primary);
}
```

## 네비게이션 설정 (navigation.config.ts)

사이드바에 커스텀 메뉴를 추가합니다:

```typescript
export const navigationConfig: NavigationConfig = {
  sidebar: [
    {
      title: '리소스',
      icon: 'ExternalLink',
      collapsible: true,
      defaultOpen: false,
      items: [
        {
          label: 'GitHub',
          href: 'https://github.com/...',
          icon: 'Github',
          external: true,
        },
        {
          label: 'API 문서',
          href: '/wiki/api',
          icon: 'FileCode',
          badge: 'Beta',
        },
      ],
    },
  ],
};
```

## 지원하는 lucide 아이콘

[lucide.dev/icons](https://lucide.dev/icons)에서 사용 가능한 아이콘 이름을 확인할 수 있습니다.

예: `Home`, `FileText`, `BookOpen`, `Github`, `ExternalLink`, `Settings` 등
