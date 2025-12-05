import { config, GITHUB_API_URL } from '../config';
import type { WikiPage, GitHubIssue, WikiTree, AIHistory, AIHistoryEntry } from '../types';
import { formatTitle } from '../utils';

// 빌드 시점에 생성된 정적 wiki 데이터 캐시
let wikiDataCache: { pages: WikiPage[]; tree: WikiTree[] } | null = null;

// 정적 wiki 데이터 로드
async function loadWikiData(): Promise<{ pages: WikiPage[]; tree: WikiTree[] }> {
  if (wikiDataCache) {
    return wikiDataCache;
  }

  try {
    // cache-busting: 브라우저 캐시 우회를 위해 타임스탬프 추가
    const cacheBuster = `?v=${Date.now()}`;
    const response = await fetch(`${import.meta.env.BASE_URL}wiki-data.json${cacheBuster}`);
    if (!response.ok) {
      return { pages: [], tree: [] };
    }
    wikiDataCache = await response.json();
    return wikiDataCache!;
  } catch (error) {
    console.error('Error loading wiki data:', error);
    return { pages: [], tree: [] };
  }
}

// Wiki 페이지 목록 가져오기 (정적 데이터에서)
export async function fetchWikiPages(): Promise<WikiTree[]> {
  const data = await loadWikiData();
  return data.tree;
}

// 기본 가이드 페이지 목록 (정적)
export function getGuidePages(): WikiTree[] {
  return [
    { title: '시작하기', slug: '_guide/getting-started' },
    { title: '테마 커스터마이징', slug: '_guide/customization' },
    { title: 'LLM 워크플로우', slug: '_guide/llm-workflow' },
    { title: '설정 파일 가이드', slug: '_guide/configuration' },
    { title: 'FAQ', slug: '_guide/faq' },
  ];
}

// Wiki 페이지 내용 가져오기 (정적 데이터에서)
export async function fetchWikiPage(slug: string): Promise<WikiPage | null> {
  // 가이드 페이지인 경우
  if (slug.startsWith('_guide/')) {
    const guideSlug = slug.replace('_guide/', '');
    return getGuidePage(guideSlug);
  }

  // 정적 데이터에서 페이지 찾기
  const data = await loadWikiData();
  const page = data.pages.find((p) => p.slug === slug);
  return page || null;
}

// GitHub Issues 가져오기
export async function fetchIssues(label?: string): Promise<GitHubIssue[]> {
  try {
    let url = `${GITHUB_API_URL}/repos/${config.owner}/${config.repo}/issues?state=all&per_page=50`;
    if (label) {
      url += `&labels=${encodeURIComponent(label)}`;
    }

    const response = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      return [];
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching issues:', error);
    return [];
  }
}

// 특정 Issue 가져오기
export async function fetchIssue(issueNumber: number): Promise<GitHubIssue | null> {
  try {
    const response = await fetch(
      `${GITHUB_API_URL}/repos/${config.owner}/${config.repo}/issues/${issueNumber}`,
      {
        headers: {
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching issue:', error);
    return null;
  }
}

// 검색 인덱스 타입
interface SearchIndexItem {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  tags: string[];
  lastModified: string;
  author?: string;
}

// 검색 인덱스 캐시
let searchIndexCache: SearchIndexItem[] | null = null;

// 정적 검색 인덱스 로드
async function loadSearchIndex(): Promise<SearchIndexItem[]> {
  if (searchIndexCache) {
    return searchIndexCache;
  }

  try {
    // cache-busting: 브라우저 캐시 우회를 위해 타임스탬프 추가
    const cacheBuster = `?v=${Date.now()}`;
    const response = await fetch(`${import.meta.env.BASE_URL}search-index.json${cacheBuster}`);
    if (!response.ok) {
      return [];
    }
    searchIndexCache = await response.json();
    return searchIndexCache!;
  } catch (error) {
    console.error('Error loading search index:', error);
    return [];
  }
}

// 검색 기능 (정적 인덱스 기반)
export async function searchWiki(query: string): Promise<WikiPage[]> {
  try {
    const index = await loadSearchIndex();
    const normalizedQuery = query.toLowerCase().trim();
    const queryTerms = normalizedQuery.split(/\s+/);

    // 검색 결과를 점수와 함께 저장
    const scoredResults = index
      .map((item) => {
        let score = 0;
        const titleLower = item.title.toLowerCase();
        const contentLower = item.content.toLowerCase();
        const tagsLower = item.tags.map((t) => t.toLowerCase());

        for (const term of queryTerms) {
          // 제목에서 매칭 (높은 점수)
          if (titleLower.includes(term)) {
            score += 10;
            if (titleLower === term) score += 5; // 정확한 매칭
          }

          // 태그에서 매칭 (중간 점수)
          if (tagsLower.some((tag) => tag.includes(term))) {
            score += 5;
          }

          // 본문에서 매칭 (낮은 점수)
          if (contentLower.includes(term)) {
            score += 1;
            // 매칭 횟수에 따라 추가 점수
            const matches = contentLower.split(term).length - 1;
            score += Math.min(matches, 5) * 0.5;
          }
        }

        return { item, score };
      })
      .filter((result) => result.score > 0)
      .sort((a, b) => b.score - a.score);

    // WikiPage 형태로 변환
    return scoredResults.map((result) => ({
      title: result.item.title,
      slug: result.item.slug,
      content: result.item.excerpt,
      lastModified: result.item.lastModified,
      author: result.item.author,
      tags: result.item.tags,
    }));
  } catch (error) {
    console.error('Error searching wiki:', error);
    return [];
  }
}

// 가이드 페이지 내용 (정적)
function getGuidePage(slug: string): WikiPage {
  const guidePages: Record<string, WikiPage> = {
    'getting-started': {
      title: '시작하기',
      slug: '_guide/getting-started',
      content: `
# 시작하기

SEPilot Wiki를 사용하여 나만의 위키를 만드는 방법을 안내합니다.

## 설치 및 배포

### 1. 템플릿 복제

\`\`\`bash
# GitHub에서 템플릿 복제
gh repo create my-wiki --template jhl-labs/sepilot-wiki --public
cd my-wiki
\`\`\`

### 2. 의존성 설치 및 개발 서버 실행

\`\`\`bash
bun install
bun dev
\`\`\`

### 3. 설정 파일 수정

루트 디렉토리의 설정 파일들을 수정합니다:

- \`site.config.ts\` - 사이트 기본 정보 (타이틀, 로고, 소셜 링크)
- \`theme.config.ts\` - 테마 설정 (색상, 폰트, 레이아웃)
- \`navigation.config.ts\` - 사이드바 메뉴 설정

### 4. GitHub Pages 배포

\`\`\`bash
git add -A && git commit -m "Initial setup"
git push origin main
\`\`\`

GitHub Actions가 자동으로 빌드 후 GitHub Pages에 배포합니다.

## 문서 작성 방식

### 방법 1: 직접 작성
\`/wiki\` 폴더에 마크다운 파일을 직접 추가합니다.

### 방법 2: AI 자동 생성
GitHub Issue에 \`request\` 라벨을 추가하면 AI가 문서 초안을 자동 생성합니다.

## 다음 단계

- [테마 커스터마이징](/wiki/_guide/customization) - 색상, 폰트, 로고 변경
- [LLM 워크플로우](/wiki/_guide/llm-workflow) - AI 문서 생성 과정 이해
- [설정 파일 가이드](/wiki/_guide/configuration) - 상세 설정 옵션
      `,
      lastModified: new Date().toISOString(),
      tags: ['시작하기', '설치', '배포'],
    },
    customization: {
      title: '테마 커스터마이징',
      slug: '_guide/customization',
      content: `
# 테마 커스터마이징

SEPilot Wiki는 Astro와 유사하게 설정 파일을 통해 다양한 커스터마이징을 지원합니다.

## 설정 파일 구조

\`\`\`
project-root/
├── site.config.ts      # 사이트 기본 설정
├── theme.config.ts     # 테마 (색상, 폰트)
├── navigation.config.ts # 네비게이션 메뉴
└── src/styles/custom.css # 커스텀 CSS
\`\`\`

## 사이트 설정 (site.config.ts)

### 기본 정보

\`\`\`typescript
export const siteConfig: SiteConfig = {
  title: 'My Wiki',
  description: 'AI 기반 자동화 위키',

  // GitHub 저장소
  owner: 'your-username',
  repo: 'your-wiki-repo',
  wikiPath: 'wiki',
};
\`\`\`

### 로고 설정

\`\`\`typescript
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
\`\`\`

### Footer 설정

\`\`\`typescript
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
\`\`\`

## 테마 설정 (theme.config.ts)

### 색상 커스터마이징

\`\`\`typescript
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
\`\`\`

### 폰트 설정

\`\`\`typescript
fonts: {
  sans: "'Pretendard', sans-serif",
  mono: "'JetBrains Mono', monospace",
}
\`\`\`

### 레이아웃 설정

\`\`\`typescript
layout: {
  headerHeight: '64px',
  sidebarWidth: '280px',
  contentMaxWidth: '900px',
}
\`\`\`

## 커스텀 CSS

\`src/styles/custom.css\`에서 추가 스타일을 정의할 수 있습니다:

\`\`\`css
/* 헤더 그라데이션 */
.header {
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
}

/* 커스텀 마크다운 스타일 */
.markdown-content h1 {
  border-bottom: 3px solid var(--color-primary);
}
\`\`\`

## 네비게이션 설정 (navigation.config.ts)

사이드바에 커스텀 메뉴를 추가합니다:

\`\`\`typescript
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
\`\`\`

## 지원하는 lucide 아이콘

[lucide.dev/icons](https://lucide.dev/icons)에서 사용 가능한 아이콘 이름을 확인할 수 있습니다.

예: \`Home\`, \`FileText\`, \`BookOpen\`, \`Github\`, \`ExternalLink\`, \`Settings\` 등
      `,
      lastModified: new Date().toISOString(),
      tags: ['테마', '커스터마이징', '설정'],
    },
    'llm-workflow': {
      title: 'LLM 워크플로우',
      slug: '_guide/llm-workflow',
      content: `
# LLM 워크플로우

SEPilot Wiki는 GitHub Actions와 LLM을 연동하여 자동으로 문서를 생성하고 관리합니다.

## 워크플로우 개요

\`\`\`
사용자                  GitHub Actions              LLM
  │                         │                        │
  ├─ Issue 생성 ───────────>│                        │
  │  (request 라벨)         │                        │
  │                         ├─ 컨텍스트 수집 ────────>│
  │                         │  (Issue 본문+댓글)      │
  │                         │                        │
  │                         │<─ 문서 생성 ────────────┤
  │                         │                        │
  │<─ 댓글로 결과 알림 ──────┤                        │
  │                         │                        │
  ├─ 피드백 댓글 ──────────>│                        │
  │                         ├─ 피드백 분석 ──────────>│
  │                         │                        │
  │                         │<─ 문서 수정 ────────────┤
  │                         │                        │
\`\`\`

## 지원하는 이벤트

### 1. request 라벨 추가

Issue에 \`request\` 라벨을 추가하면:

1. AI가 Issue 제목과 본문을 분석
2. 관련 문서 초안 자동 생성
3. \`wiki/\` 폴더에 마크다운 파일 저장
4. Issue에 결과 댓글 추가
5. \`draft\`, \`ai-generated\` 라벨 자동 추가

### 2. invalid 라벨 추가

문서에 오류가 있을 때 \`invalid\` 라벨을 추가하면:

1. AI가 Issue 댓글에서 오류 내용 파악
2. 해당 문서 자동 수정
3. 수정 결과 댓글로 알림

### 3. Maintainer 댓글

Maintainer가 댓글을 달면:

1. AI가 댓글 내용 분석
2. 문서 수정, 삭제, 복구 등 작업 수행
3. 작업 결과 댓글로 알림

### 4. Issue 종료

Issue를 close하면:

1. \`draft\` 라벨 제거
2. 문서가 정식 게시 상태로 전환

## LLM 설정

### 환경 변수

GitHub Repository Secrets에 다음 값을 설정합니다:

\`\`\`
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_API_KEY=your-api-key
OPENAI_MODEL=gpt-4
\`\`\`

### 지원하는 LLM 제공자

OpenAI 호환 API를 사용하는 모든 제공자를 지원합니다:

- OpenAI (GPT-4, GPT-3.5)
- Azure OpenAI
- Anthropic Claude (OpenAI 호환 API 사용 시)
- Local LLM (Ollama, LM Studio 등)

## 컨텍스트 수집

AI는 다음 정보를 수집하여 작업을 수행합니다:

- **Issue 본문**: 사용자의 초기 요청
- **모든 댓글**: 대화 히스토리 및 피드백
- **기존 문서**: 관련 문서가 있으면 해당 내용
- **이전 작업 결과**: 이전에 생성된 문서 경로

이를 통해 AI는 전체 맥락을 이해하고 적절한 작업을 수행합니다.

## 문서 생성 규칙

AI가 생성하는 문서는 다음 규칙을 따릅니다:

- YAML frontmatter 포함 (title, author, tags)
- 한국어로 작성
- 마크다운 형식
- 코드 예시 포함 (해당되는 경우)

### frontmatter 예시

\`\`\`markdown
---
title: 문서 제목
author: SEPilot AI
tags: [태그1, 태그2]
---

# 문서 제목

본문 내용...
\`\`\`

## 워크플로우 파일

\`.github/workflows/issue-handler.yml\`에서 워크플로우를 확인하고 수정할 수 있습니다.

주요 스크립트:

- \`scripts/generate-document.js\` - 새 문서 생성
- \`scripts/process-feedback.js\` - 피드백 처리
- \`scripts/mark-invalid.js\` - 오류 표시 처리
- \`scripts/publish-document.js\` - 문서 발행
      `,
      lastModified: new Date().toISOString(),
      tags: ['LLM', '워크플로우', 'AI', 'GitHub Actions'],
    },
    configuration: {
      title: '설정 파일 가이드',
      slug: '_guide/configuration',
      content: `
# 설정 파일 가이드

SEPilot Wiki의 모든 설정 파일과 옵션을 상세히 설명합니다.

## 설정 파일 목록

| 파일 | 위치 | 용도 |
|------|------|------|
| \`site.config.ts\` | 루트 | 사이트 기본 정보 |
| \`theme.config.ts\` | 루트 | 테마 (색상, 폰트, 레이아웃) |
| \`navigation.config.ts\` | 루트 | 네비게이션 메뉴 |
| \`custom.css\` | src/styles | 커스텀 CSS |
| \`config.ts\` | src | GitHub 저장소 연결 설정 |

## site.config.ts 상세

\`\`\`typescript
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
\`\`\`

## theme.config.ts 상세

### 색상 (colors)

\`\`\`typescript
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
\`\`\`

### 폰트 (fonts)

\`\`\`typescript
interface ThemeFonts {
  sans?: string;     // 본문 폰트
  mono?: string;     // 코드 폰트
  heading?: string;  // 제목 폰트 (미지정시 sans 사용)
}
\`\`\`

### 레이아웃 (layout)

\`\`\`typescript
interface ThemeLayout {
  headerHeight?: string;      // 기본: 64px
  sidebarWidth?: string;      // 기본: 280px
  contentMaxWidth?: string;   // 기본: 900px
  tocWidth?: string;          // 기본: 240px
}
\`\`\`

### 테두리 반경 (borderRadius)

\`\`\`typescript
interface ThemeBorderRadius {
  sm?: string;   // 기본: 0.25rem
  md?: string;   // 기본: 0.5rem
  lg?: string;   // 기본: 0.75rem
  xl?: string;   // 기본: 1rem
}
\`\`\`

## navigation.config.ts 상세

\`\`\`typescript
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
\`\`\`

## GitHub 저장소 설정

### Repository Secrets

GitHub Repository Settings > Secrets에서 설정:

| 변수 | 필수 | 설명 |
|------|------|------|
| \`OPENAI_BASE_URL\` | O | OpenAI 호환 API URL |
| \`OPENAI_API_KEY\` | O | API 키 |
| \`OPENAI_MODEL\` | O | 모델명 (예: gpt-4) |

### GitHub Pages 설정

1. Repository Settings > Pages
2. Source: "GitHub Actions" 선택
3. \`main\` 브랜치 push 시 자동 배포

## 환경 변수

### 빌드 시

\`\`\`bash
GITHUB_TOKEN=...      # GitHub API 토큰 (선택)
\`\`\`

### 개발 시

\`.env\` 파일에 설정:

\`\`\`env
VITE_GITHUB_TOKEN=...  # 개발용 토큰 (선택)
\`\`\`
      `,
      lastModified: new Date().toISOString(),
      tags: ['설정', '가이드', 'TypeScript'],
    },
    faq: {
      title: 'FAQ',
      slug: '_guide/faq',
      content: `
# 자주 묻는 질문

## 일반

### Q: SEPilot Wiki는 무엇인가요?

A: GitHub 저장소 기반의 AI 자동화 위키 시스템입니다. Astro 같은 정적 사이트 생성기처럼 설정 파일을 통해 커스터마이징이 가능하며, GitHub Issue와 LLM을 연동하여 문서를 자동 생성합니다.

### Q: 무료로 사용할 수 있나요?

A: 네, SEPilot Wiki 자체는 오픈소스이며 무료입니다. 다만 LLM API 사용 시 해당 제공자의 요금이 발생할 수 있습니다.

## 설치 및 배포

### Q: 어떤 런타임이 필요한가요?

A: Bun 또는 Node.js 20+를 지원합니다. Bun 사용을 권장합니다.

### Q: 로컬에서 개발할 수 있나요?

A: 네, \`bun dev\` 또는 \`npm run dev\`로 로컬 개발 서버를 실행할 수 있습니다.

### Q: GitHub Pages 외에 다른 호스팅 서비스도 지원하나요?

A: 네, Vite 기반이므로 Vercel, Netlify, Cloudflare Pages 등 모든 정적 호스팅 서비스에서 사용 가능합니다.

## 테마 및 커스터마이징

### Q: 다크 모드를 지원하나요?

A: 네, 라이트/다크/시스템 테마를 지원합니다. \`theme.config.ts\`에서 각 테마의 색상을 설정할 수 있습니다.

### Q: 로고를 이미지로 변경하려면 어떻게 하나요?

A: \`site.config.ts\`에서 다음과 같이 설정합니다:

\`\`\`typescript
logo: {
  type: 'image',
  value: '/logo.png',  // public 폴더 기준
  alt: 'My Logo',
}
\`\`\`

### Q: 폰트를 변경하려면 어떻게 하나요?

A: \`theme.config.ts\`의 \`fonts\` 설정에서 변경합니다. Google Fonts를 사용하려면 \`index.html\`에 폰트 링크를 추가해야 합니다.

## LLM 및 AI 기능

### Q: OpenAI 외에 다른 LLM을 사용할 수 있나요?

A: 네, OpenAI 호환 API를 제공하는 모든 서비스를 사용할 수 있습니다 (Azure OpenAI, Ollama, LM Studio 등).

### Q: AI가 생성한 문서를 수정할 수 있나요?

A: 네, 세 가지 방법이 있습니다:
1. \`/wiki\` 폴더에서 마크다운 파일 직접 수정
2. Issue 댓글로 피드백 작성 (AI가 자동 반영)
3. PR로 변경 제안

### Q: AI 문서 생성이 실패하면 어떻게 하나요?

A: GitHub Actions 로그에서 오류를 확인하세요. 주로 API 키 설정 오류이거나 LLM 서비스 장애일 수 있습니다.

## 문서 관리

### Q: 문서를 직접 수정할 수 있나요?

A: 네, \`/wiki\` 폴더의 마크다운 파일을 직접 수정하거나 PR을 통해 변경할 수 있습니다.

### Q: 문서에 이미지를 추가하려면 어떻게 하나요?

A: \`/public\` 폴더에 이미지를 추가한 후 마크다운에서 참조합니다:

\`\`\`markdown
![이미지 설명](/images/example.png)
\`\`\`

### Q: 검색이 잘 안 되는 것 같아요

A: 검색 인덱스는 빌드 시점에 생성됩니다. 새 문서 추가 후 재배포가 필요합니다.

## 문제 해결

### Q: 빌드가 실패해요

A: 다음을 확인하세요:
1. \`bun install\` 또는 \`npm install\` 실행 여부
2. 설정 파일의 TypeScript 문법 오류
3. Node.js/Bun 버전 호환성

### Q: GitHub Pages에 배포가 안 돼요

A: Repository Settings > Pages에서 Source가 "GitHub Actions"로 설정되어 있는지 확인하세요.

### Q: LLM 응답이 너무 느려요

A: LLM 모델을 더 빠른 것으로 변경하거나 (예: gpt-4 대신 gpt-3.5-turbo), 로컬 LLM 사용을 고려해보세요.
      `,
      lastModified: new Date().toISOString(),
      tags: ['FAQ', '도움말', '문제해결'],
    },
  };

  return guidePages[slug] || {
    title: formatTitle(slug),
    slug: `_guide/${slug}`,
    content: `# ${formatTitle(slug)}\n\n이 페이지는 아직 작성되지 않았습니다.`,
    lastModified: new Date().toISOString(),
  };
}

// AI History 데이터 캐시
let aiHistoryCache: AIHistory | null = null;

// AI History 데이터 로드
export async function fetchAIHistory(): Promise<AIHistory> {
  if (aiHistoryCache) {
    return aiHistoryCache;
  }

  try {
    // cache-busting: 브라우저 캐시 우회를 위해 타임스탬프 추가
    const cacheBuster = `?v=${Date.now()}`;
    const response = await fetch(`${import.meta.env.BASE_URL}data/ai-history.json${cacheBuster}`);
    if (!response.ok) {
      return { entries: [], lastUpdated: new Date().toISOString() };
    }
    aiHistoryCache = await response.json();
    return aiHistoryCache!;
  } catch (error) {
    console.error('Error loading AI history:', error);
    return { entries: [], lastUpdated: new Date().toISOString() };
  }
}

// 특정 문서의 AI History 조회
export async function fetchDocumentAIHistory(slug: string): Promise<AIHistoryEntry[]> {
  const history = await fetchAIHistory();
  return history.entries.filter(entry => entry.documentSlug === slug);
}
