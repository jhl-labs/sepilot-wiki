---
title: 설정 파일 가이드
tags: [설정, 가이드, TypeScript]
redirect_from:
  - guide-configuration-guide
  - guide-configuration
  - _guide-configuration
---

# 설정 파일 가이드

SEPilot Wiki의 모든 설정 파일과 옵션을 상세히 설명합니다.

## 설정 파일 목록

| 파일 | 위치 | 용도 |
|------|------|------|
| `site.config.ts` | 루트 | 사이트 기본 정보 |
| `theme.config.ts` | 루트 | 테마 (색상, 폰트, 레이아웃) |
| `navigation.config.ts` | 루트 | 네비게이션 메뉴 |
| `custom.css` | src/styles | 커스텀 CSS |
| `config.ts` | src | GitHub 저장소 연결 설정 |

## site.config.ts 상세

```typescript
interface SiteConfig {
  // 필수
  title: string;          // 사이트 제목
  description: string;    // SEO 설명
  owner: string;          // GitHub 사용자명/조직명
  repo: string;           // 저장소 이름
  wikiPath: string;       // wiki 폴더 경로 (기본: 'wiki')

  // 선택
  logo?: {
    type: 'text' | 'image' | 'icon';
    value: string;
    alt?: string;
  };
  favicon?: string;       // 파비콘 경로
  social?: {
    github?: string;
    twitter?: string;
    discord?: string;
    website?: string;
  };
  footer?: {
    enabled?: boolean;
    copyright?: {
      enabled?: boolean;
      text?: string;
      startYear?: number;
    };
    links?: { label: string; url: string }[];
    showPoweredBy?: boolean;
  };
}
```

## theme.config.ts 상세

### 색상 (colors)

```typescript
interface ColorScheme {
  primary: string;           // 메인 브랜드 색상
  primaryHover?: string;     // hover 시 색상
  background: string;        // 배경색
  backgroundSecondary?: string;
  backgroundTertiary?: string;
  text: string;              // 기본 텍스트 색상
  textSecondary?: string;
  textMuted?: string;
  border?: string;           // 테두리 색상
  accent?: string;           // 강조 색상
  success?: string;          // 성공 상태
  warning?: string;          // 경고 상태
  error?: string;            // 오류 상태
  info?: string;             // 정보 상태
}
```

### 폰트 (fonts)

```typescript
interface ThemeFonts {
  sans?: string;     // 본문 폰트
  mono?: string;     // 코드 폰트
  heading?: string;  // 제목 폰트 (미지정시 sans 사용)
}
```

### 레이아웃 (layout)

```typescript
interface ThemeLayout {
  headerHeight?: string;      // 기본: 64px
  sidebarWidth?: string;      // 기본: 280px
  contentMaxWidth?: string;   // 기본: 900px
  tocWidth?: string;          // 기본: 240px
}
```

### 테두리 반경 (borderRadius)

```typescript
interface ThemeBorderRadius {
  sm?: string;   // 기본: 0.25rem
  md?: string;   // 기본: 0.5rem
  lg?: string;   // 기본: 0.75rem
  xl?: string;   // 기본: 1rem
}
```

## navigation.config.ts 상세

```typescript
interface NavigationConfig {
  sidebar?: SidebarSection[];
}

interface SidebarSection {
  title: string;              // 섹션 제목
  icon?: string;              // lucide 아이콘 이름
  collapsible?: boolean;      // 접을 수 있는지 (기본: true)
  defaultOpen?: boolean;      // 기본 열림 상태 (기본: true)
  items: SidebarNavItem[];
}

interface SidebarNavItem {
  label: string;              // 메뉴 텍스트
  href: string;               // 링크 URL
  icon?: string;              // lucide 아이콘 이름
  external?: boolean;         // 외부 링크 여부
  badge?: string;             // 배지 텍스트 (예: 'Beta', 'New')
  children?: SidebarNavItem[]; // 하위 메뉴
}
```

## GitHub 저장소 설정

### Repository Secrets

GitHub Repository Settings > Secrets에서 설정:

| 변수 | 필수 | 설명 |
|------|------|------|
| `OPENAI_BASE_URL` | O | OpenAI 호환 API URL |
| `OPENAI_API_KEY` | O | API 키 |
| `OPENAI_MODEL` | O | 모델명 (예: gpt-4) |

### GitHub Pages 설정

1. Repository Settings > Pages
2. Source: "GitHub Actions" 선택
3. `main` 브랜치 push 시 자동 배포

## 환경 변수

### 빌드 시

```bash
GITHUB_TOKEN=...      # GitHub API 토큰 (선택)
```

### 개발 시

`.env` 파일에 설정:

```env
VITE_GITHUB_TOKEN=...  # 개발용 토큰 (선택)
```
