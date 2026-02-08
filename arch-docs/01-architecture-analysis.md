# SEPilot Wiki 아키텍처 분석 보고서

> **분석 일자**: 2026-02-07
> **분석 대상**: sepilot-wiki v0.4.0
> **분석 범위**: 전체 프로젝트 (src/ 75파일 11,091줄, app/ 35파일 6,749줄, lib/ 17파일 2,723줄, scripts/ 24파일 5,244줄)

---

## 목차

1. [전체 아키텍처 패턴 평가](#1-전체-아키텍처-패턴-평가)
2. [레이어 분리 수준](#2-레이어-분리-수준)
3. [모듈 응집도/결합도](#3-모듈-응집도결합도)
4. [데이터 흐름 아키텍처](#4-데이터-흐름-아키텍처)
5. [상태 관리 전략 평가](#5-상태-관리-전략-평가)
6. [확장 포인트 분석](#6-확장-포인트-분석)
7. [기술 부채 식별](#7-기술-부채-식별)
8. [아키텍처 성숙도](#8-아키텍처-성숙도)
9. [종합 평가 및 권고](#9-종합-평가-및-권고)

---

## 1. 전체 아키텍처 패턴 평가

**현재 수준: 7.5/10**

### 1.1 아키텍처 패턴 분류

SEPilot Wiki는 **모듈러 모놀리스(Modular Monolith)** 패턴을 채택하고 있다. 단일 Next.js 애플리케이션 안에 프레젠테이션, 서버 API, 스케줄러, 웹훅 핸들러가 공존하지만, 각 모듈이 명확한 디렉토리 경계로 분리되어 있다.

```
sepilot-wiki (모놀리스)
├── app/           # Next.js App Router (프레젠테이션 + API Routes)
├── src/           # 공유 컴포넌트/훅/서비스 (Vite 호환 레거시 포함)
├── lib/           # 서버 전용 비즈니스 로직 (스케줄러, 인증, Redis)
├── scripts/       # 빌드/운영 스크립트 (Node.js CLI)
└── wiki/          # 콘텐츠 소스 (마크다운)
```

### 1.2 듀얼 빌드 시스템

이 프로젝트의 가장 독특한 아키텍처 결정은 **듀얼 빌드 시스템**이다.

| 빌드 모드 | 도구 | 출력 | 용도 |
|-----------|------|------|------|
| `static` (GitHub Pages) | Next.js `output: 'export'` | 정적 HTML | 공개 읽기 전용 위키 |
| `standalone` (K8s) | Next.js `output: 'standalone'` | Node.js 서버 | 인증/관리/스케줄러 포함 |
| `vite` (레거시) | Vite + React Router | SPA | 이전 정적 빌드 (폐기 예정) |

`next.config.js`에서 환경변수 기반으로 분기:

```javascript
// next.config.js (19줄)
output: process.env.BUILD_MODE === 'static' ? 'export' : 'standalone',
```

### 1.3 App Router 구조

Next.js 15 App Router를 적절히 활용하고 있다. Route Groups를 통한 레이아웃 분리가 특히 좋은 설계이다.

```
app/
├── layout.tsx              # 루트 레이아웃 (메타데이터, Providers)
├── providers.tsx           # 클라이언트 프로바이더 래퍼
├── (main)/                 # Route Group: 메인 영역
│   ├── layout.tsx          # Header + Sidebar + Footer 레이아웃
│   ├── wiki/[...slug]/     # 동적 위키 페이지 (Server Component 메타데이터)
│   └── ...
├── admin/                  # 관리자 영역 (별도 레이아웃)
├── auth/                   # 인증 영역
└── api/                    # API Routes (webhook, scheduler, health)
```

Server Component에서 메타데이터를 생성하고 Client Component로 렌더링을 위임하는 패턴이 잘 적용되어 있다:

```typescript
// app/(main)/wiki/[...slug]/page.tsx
export async function generateMetadata({ params }: WikiPageProps): Promise<Metadata> {
  const page = await getWikiPage(slug);  // 서버에서 JSON 파일 직접 읽기
  return { title: page.title, description, openGraph: { ... } };
}

export default async function WikiPage({ params }: WikiPageProps) {
  return <WikiPageClient slug={slug} />;  // 클라이언트 컴포넌트에 위임
}
```

### 강점
- 듀얼 빌드가 환경변수 하나로 깔끔하게 전환됨
- App Router의 서버/클라이언트 경계가 적절히 구분됨
- Route Groups로 관리자/인증/메인 영역이 독립적 레이아웃 보유

### 약점
- Vite 빌드 경로가 여전히 남아 있어 `src/App.tsx`(react-router-dom)와 `app/` 사이에 혼란 존재
- 모놀리스 내 스케줄러가 Next.js 서버 프로세스와 생명주기를 공유하여 장애 격리 불가

### 개선 제안
- Vite 빌드 파이프라인과 `src/App.tsx`, `react-router-dom` 의존성 완전 제거
- 스케줄러를 별도 사이드카 컨테이너 또는 K8s CronJob으로 분리하여 장애 격리 확보

---

## 2. 레이어 분리 수준

**현재 수준: 7.0/10**

### 2.1 계층 구조 분석

```
[프레젠테이션 계층]
  app/(main)/**       → Next.js 페이지 컴포넌트 (SSR 메타데이터 + CSR 렌더링)
  src/components/**   → UI 컴포넌트 (layout, wiki, ui, editor, auth, error)
  src/page-components → Vite용 페이지 컴포넌트 (레거시)
  src/styles/**       → CSS 스타일시트

[비즈니스 로직 계층]
  src/hooks/**        → 커스텀 훅 (useWiki, useBookmarks, useRecentPages 등)
  src/context/**      → React Context (Theme, Config, Error, Sidebar, Shortcuts, RecentPages, Bookmarks)
  lib/auth.ts         → NextAuth.js 인증 로직
  lib/webhook/**      → Webhook 이벤트 핸들링

[데이터/인프라 계층]
  src/services/api.ts → 클라이언트 사이드 데이터 로딩 (JSON fetch + TTL 캐시)
  src/services/search.ts → Fuse.js 기반 클라이언트 검색
  lib/wiki.ts         → 서버 사이드 위키 데이터 접근 (파일 시스템)
  lib/redis.ts        → Redis 클라이언트 (싱글톤)
  lib/scheduler/**    → 스케줄러 인프라 (리더 선출, 작업 관리)

[빌드/운영 계층]
  scripts/builders/** → 빌드 시 데이터 변환 (wiki/ → JSON)
  scripts/collectors/** → 시스템 정보 수집기
  scripts/document/** → 문서 생성/발행 자동화
```

### 2.2 계층 간 의존성 방향

의존성 방향은 대체로 올바르다: **프레젠테이션 -> 비즈니스 -> 데이터**

```
WikiPageClient.tsx
  └→ useWiki() (hook)
       └→ fetchWikiPage() (service/api.ts)
            └→ loadWikiData() (JSON fetch + TTL 캐시)
```

하지만 일부 계층 위반이 관찰된다:

```typescript
// src/context/ConfigContext.tsx - Context(비즈니스)가 직접 DOM을 조작
function applyColorScheme(scheme: ColorScheme, isDark: boolean) {
  const root = document.documentElement;
  Object.entries(colorMap).forEach(([key, value]) => {
    root.style.setProperty(prefix + key, value);  // DOM 직접 조작
  });
}
```

ConfigContext가 CSS 변수를 직접 DOM에 주입하는 것은 프레젠테이션 책임이 비즈니스 계층에 침투한 사례이다.

### 2.3 서버/클라이언트 분리

`lib/` 디렉토리는 서버 전용 모듈로 잘 분리되어 있다. `src/`는 클라이언트와 공유 코드가 혼재하지만, `'use client'` 지시어로 경계를 표시하고 있다.

```typescript
// lib/wiki.ts - 서버 전용 (fs 사용)
import { promises as fs } from 'fs';
export async function getWikiData(): Promise<WikiData> {
  const filePath = path.join(getPublicDir(), 'wiki-data.json');
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content);
}

// src/services/api.ts - 클라이언트용 (fetch 사용)
async function loadWikiData() {
  const response = await fetchWithRetry(`${baseUrl}wiki-data.json${cacheBuster}`);
  return await response.json();
}
```

같은 데이터(`wiki-data.json`)에 대해 서버/클라이언트 각각의 접근 경로가 존재하는 것은 의도적인 설계이지만, 로직 중복이 발생한다.

### 강점
- 서버(`lib/`) / 클라이언트(`src/`) / 빌드(`scripts/`) 계층이 디렉토리 수준에서 명확히 분리
- 커스텀 훅이 비즈니스 로직을 캡슐화하여 컴포넌트 단순화
- 서비스 계층에 TTL 캐시가 체계적으로 구현

### 약점
- ConfigContext의 DOM 직접 조작 -- 프레젠테이션 관심사 침투
- `src/services/api.ts`와 `lib/wiki.ts`의 동일 데이터 접근 로직 중복
- `src/page-components/`와 `app/(main)/` 페이지 컴포넌트가 이중 존재

### 개선 제안
- ConfigContext의 DOM 조작을 CSS-in-JS 또는 전용 스타일 유틸리티 훅으로 분리
- 서버/클라이언트 데이터 로더를 추상화하는 공통 인터페이스 도입
- `src/page-components/` 레거시 페이지 완전 제거

---

## 3. 모듈 응집도/결합도

**현재 수준: 7.0/10**

### 3.1 컴포넌트 의존성 맵

```
컴포넌트 그룹 (27개)
├── layout/ (5)   : Layout, Header, Sidebar, Footer, index
├── wiki/ (9)     : MarkdownRenderer, TableOfContents, Breadcrumb, PageMeta,
│                   RevisionHistory, MermaidDiagram, PlotlyChart, Lazy* (2)
├── ui/ (6)       : Button, Input, Badge, Skeleton, VirtualList, CommandPalette
├── editor/ (3)   : MarkdownEditor, MonacoEditor, index
├── auth/ (3)     : AuthButton, index, AuthButton.module.css
├── error/ (3)    : ErrorBoundary, ErrorToast, index
└── standalone (1): WorkflowStatus

Context (7개, Providers.tsx에서 8단계 중첩)
├── SessionProvider (next-auth)
├── QueryClientProvider (react-query)
├── ErrorProvider
├── ThemeProvider
├── ConfigProvider → ThemeContext 의존
├── SidebarProvider
├── ShortcutsProvider → SidebarContext, next/navigation 의존
├── RecentPagesProvider → useRecentPages 훅 의존
└── BookmarksProvider → useBookmarks 훅 의존

훅 (9개)
├── useWiki (11개 쿼리 훅) → api.ts, search.ts
├── useBookmarks → localStorage
├── useRecentPages → localStorage
├── useAutoSave
├── useAnnouncer → 접근성
├── useKeyboardShortcuts → DOM 이벤트
├── useDebounce → 유틸리티
├── useFocusTrap → 접근성
└── useFocusReturn → 접근성
```

### 3.2 응집도 분석

**높은 응집도 (좋은 사례)**

`lib/scheduler/` 모듈은 응집도가 매우 높다. 단일 책임(스케줄 작업 관리)에 집중하며 내부 구조가 잘 분해되어 있다:

```
scheduler/
├── types.ts              # 타입 정의 (JobResult, JobExecution 등)
├── leader-election.ts    # 리더 선출 (SETNX, heartbeat, 감시)
├── scheduler-manager.ts  # 작업 등록/실행/이력 관리
├── jobs/
│   ├── base-job.ts       # 추상 베이스 클래스 (Template Method 패턴)
│   ├── collect-status.ts # 구체 작업: 상태 수집
│   ├── sync-issues.ts    # 구체 작업: 이슈 동기화
│   ├── validate-links.ts # 구체 작업: 링크 검증
│   └── maintain-tree.ts  # 구체 작업: 트리 유지보수
└── index.ts              # 모듈 진입점 (re-export + 초기화 함수)
```

**낮은 응집도 (개선 필요)**

`src/services/api.ts`는 424줄에 달하며 다수의 관심사를 포함한다:
- TTLCache 클래스 정의
- WikiPage, Issue, AIHistory, ActionsStatus 등 7개 이상의 데이터 소스 로딩
- 캐시 버스팅 전략
- Base URL 결정 로직
- 에러 클래스 정의

### 3.3 결합도 분석

**Context 중첩 결합**

`app/providers.tsx`에서 8단계 Provider 중첩은 의도적이지만, 암묵적 결합을 생성한다:

```tsx
// app/providers.tsx - 8단계 Provider 스택
<SessionProvider>          // ---- 인증
  <QueryClientProvider>    // ---- 서버 상태
    <ErrorProvider>        // ---- 에러 관리
      <ThemeProvider>      // ---- 테마
        <ConfigProvider>   // ---- 설정 (ThemeContext 의존!)
          <SidebarProvider> // --- UI 상태
            <ShortcutsProvider> // 단축키 (SidebarContext + next/navigation 의존!)
              <RecentPagesProvider> // 방문 기록
                <BookmarksProvider> // 북마크
```

`ShortcutsProvider`가 `SidebarContext`에 의존하므로 반드시 `SidebarProvider` 내부에 있어야 한다. 이런 순서 의존성이 암묵적이다:

```typescript
// src/context/ShortcutsContext.tsx
export function ShortcutsProvider({ children }: ShortcutsProviderProps) {
  const { toggle: toggleSidebar } = useSidebar();  // SidebarContext 의존!
  const router = useRouter();                        // next/navigation 의존!
  // ...
}
```

**느슨한 결합 (좋은 사례)**

스케줄러 작업은 `BaseJob` 추상 클래스를 통해 느슨하게 결합되어 있다:

```typescript
// lib/scheduler/jobs/base-job.ts
export abstract class BaseJob {
  abstract readonly name: string;
  abstract readonly schedule: string;
  protected abstract execute(): Promise<JobResult>;
  async run(): Promise<JobResult> { /* 공통 래퍼 */ }
  protected async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> { /* 재시도 */ }
}
```

### 강점
- 스케줄러 모듈의 높은 응집도와 Template Method 패턴 활용
- 컴포넌트 그룹이 기능 도메인별로 잘 분류 (wiki, ui, layout, editor, auth, error)
- 훅과 Context의 명확한 역할 분리

### 약점
- `api.ts`(424줄)의 과도한 책임 -- God Service 경향
- Provider 8단계 중첩에서 순서 의존성이 암묵적
- `src/services/` 내 `getBaseUrl()` 함수가 `api.ts`와 `search.ts`에 중복 정의

### 개선 제안
- `api.ts`를 도메인별로 분할: `wiki-api.ts`, `issues-api.ts`, `history-api.ts`, `cache.ts`
- Provider 순서 의존성을 문서화하거나, 의존하는 Provider를 내부에서 합성
- 공통 유틸리티(`getBaseUrl`, `getCacheBuster`)를 `src/utils/api-helpers.ts`로 추출

---

## 4. 데이터 흐름 아키텍처

**현재 수준: 8.0/10**

### 4.1 전체 데이터 파이프라인

```
[소스]              [빌드]                    [서빙]              [렌더링]
wiki/*.md ──────┐
                ├─ build-wiki-data.js ──→ public/wiki-data.json ──┐
guide/*.md ─────┘                         public/guide-data.json  │
                                                                  ├─→ [서버] lib/wiki.ts (fs.readFile)
                ├─ build-search-index.js → public/search-index.json    │     → generateMetadata()
                                                                  │
                                                                  └─→ [클라이언트] src/services/api.ts (fetch)
                                                                       → React Query → useWiki() → 컴포넌트

[외부 이벤트]
GitHub Issues ──→ webhook/github (API Route)
                  ├─→ scripts/document/generate-document.js
                  ├─→ scripts/document/publish-document.js
                  └─→ scripts/issue/mark-invalid.js

[스케줄]
node-cron ──→ scheduler-manager.ts
              ├─→ CollectStatusJob → public/actions-status.json
              ├─→ SyncIssuesJob → public/data/issues.json
              ├─→ ValidateLinksJob
              └─→ MaintainTreeJob
```

### 4.2 빌드 타임 데이터 변환

빌드 스크립트가 마크다운 소스를 JSON으로 변환하는 과정은 정적 사이트 생성기(SSG)의 표준 패턴이다:

```javascript
// scripts/builders/build-wiki-data.js
// 1. wiki/ 디렉토리 재귀 탐색
const mdFiles = await findMarkdownFiles(WIKI_DIR);

// 2. 프론트매터 파싱 + Git 히스토리 수집
const { metadata, body } = parseMarkdownWithFrontmatter(content);
const history = getGitHistory(fullPath);  // git log --follow

// 3. 트리 구조 생성 (중첩 카테고리 지원)
const tree = buildTreeStructure(pages);

// 4. JSON 출력
await writeFile(OUTPUT_FILE, JSON.stringify({ pages, tree }, null, 2));
```

### 4.3 런타임 데이터 흐름

클라이언트 사이드 데이터 흐름은 3중 캐시 계층을 활용한다:

```
[브라우저]
  1단계: React Query 캐시 (staleTime: 5분)
    → queryKey: ['wiki-page', slug]
    → queryFn: fetchWikiPage(slug)

  2단계: TTLCache 인메모리 캐시 (5분)
    → wikiDataCache.get() → 캐시 히트 시 즉시 반환

  3단계: HTTP fetch + 캐시 버스팅
    → fetch(`/wiki-data.json?v=${buildTime}`)
    → 응답 성공 시 TTLCache에 저장
```

```typescript
// src/services/api.ts - 3중 캐시 구현
export async function fetchWikiPage(slug: string): Promise<WikiPage | null> {
    const wikiData = await loadWikiData();  // TTLCache → HTTP 요청
    return wikiData.pages.find((p) => p.slug === slug);
}

// src/hooks/useWiki.ts - React Query 래핑
export function useWikiPage(slug: string) {
  return useQuery({
    queryKey: ['wiki-page', slug],
    queryFn: () => fetchWikiPage(slug),
    staleTime: 5 * 60 * 1000,  // 5분
  });
}
```

### 4.4 검색 데이터 흐름

Fuse.js를 활용한 클라이언트 사이드 전문 검색:

```
search-index.json (빌드 시 생성)
  → loadSearchIndex() (런타임 로드, 싱글톤 캐시)
    → Fuse 인스턴스 생성 (weighted 검색)
      → title(1.0), tags(0.8), excerpt(0.5), content(0.3)
    → applyFilters() (태그, 날짜, 저자 필터)
```

### 강점
- 빌드 타임 데이터 변환으로 런타임 연산 최소화
- 3중 캐시 전략(React Query + TTLCache + HTTP 캐시 버스팅)으로 성능 최적화
- 검색 인덱스를 JSON으로 사전 구축하여 API 서버 없이도 검색 가능
- Git 히스토리를 빌드 시 수집하여 문서 이력 추적 가능

### 약점
- `wiki-data.json`에 모든 문서의 전체 본문이 포함되어 초기 로드 시 대용량 전송 가능
- 검색 인덱스에도 전체 본문(`content`)이 포함되어 인덱스 크기가 큼
- Webhook 핸들러가 `spawn`으로 스크립트를 실행하므로 에러 추적이 어려움

### 개선 제안
- 문서 본문을 별도 파일로 분리하여 페이지별 지연 로딩 구현 (slug 기반 경로)
- 검색 인덱스에서 `content` 필드를 `excerpt`로 대체하여 크기 축소
- Webhook 스크립트 실행을 메시지 큐(Redis Streams 등)로 전환하여 관찰 가능성 확보

---

## 5. 상태 관리 전략 평가

**현재 수준: 6.5/10**

### 5.1 상태 관리 계층

현재 시스템은 세 가지 상태 관리 메커니즘을 혼합 사용한다:

| 메커니즘 | 용도 | 범위 | 데이터 |
|----------|------|------|--------|
| React Query | 서버 상태 | 전역 | 위키 페이지, 이슈, 검색 결과, AI 히스토리 |
| React Context (7개) | UI 상태 + 설정 | 전역 | 테마, 사이드바, 에러, 설정, 단축키, 최근문서, 북마크 |
| localStorage | 영속 상태 | 브라우저 | 테마 선호, 사이드바 너비, 최근 방문, 북마크 |

### 5.2 Context 사용 적절성 분석

**적절한 사용:**

- `ThemeContext`: 전역 테마 설정 -- Context가 적합
- `ErrorContext`: 전역 토스트/에러 관리 -- Context가 적합
- `ConfigContext`: 사이트 설정 -- Context가 적합 (런타임 변경 없음)

**과도한 사용:**

- `RecentPagesContext`와 `BookmarksContext`는 단순히 localStorage 훅을 Context로 래핑한 것:

```typescript
// src/context/RecentPagesContext.tsx - 사실상 훅의 재포장
export function RecentPagesProvider({ children }: RecentPagesProviderProps) {
  const recentPagesHook = useRecentPages();  // 훅 호출
  return (
    <RecentPagesContext.Provider value={recentPagesHook}>  // 그대로 전달
      {children}
    </RecentPagesContext.Provider>
  );
}
```

이 패턴은 모든 컴포넌트 트리에서 접근 가능하게 하지만, 불필요한 리렌더링을 유발할 수 있다. `useRecentPages()` 훅을 직접 호출하면 localStorage가 이미 공유 저장소 역할을 하므로 Context가 불필요하다.

- `ShortcutsContext`는 키보드 단축키를 등록하는 역할과 커맨드 팔레트 상태를 동시에 관리하여 SRP 위반:

```typescript
// ShortcutsContext - 두 가지 관심사 혼합
interface ShortcutsContextType {
  isCommandPaletteOpen: boolean;      // 커맨드 팔레트 UI 상태
  openCommandPalette: () => void;     // 커맨드 팔레트 조작
  shortcuts: Shortcut[];              // 키보드 단축키 등록
}
```

### 5.3 React Query 사용 패턴

React Query의 사용은 잘 구조화되어 있다. `useWiki.ts`에서 11개 쿼리 훅이 일관된 패턴으로 정의:

```typescript
// src/hooks/useWiki.ts - 일관된 쿼리 훅 패턴
export function useWikiPages() {
  return useQuery({ queryKey: ['wiki-pages'], queryFn: fetchWikiPages, staleTime: 5 * 60 * 1000 });
}

export function useWikiPage(slug: string) {
  return useQuery({ queryKey: ['wiki-page', slug], queryFn: () => fetchWikiPage(slug), enabled: !!slug, staleTime: 5 * 60 * 1000 });
}

export function useActionsStatus() {
  return useQuery({
    queryKey: ['actions-status'],
    queryFn: fetchActionsStatus,
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,  // 30초 자동 갱신
  });
}
```

그러나 React Query와 `api.ts`의 `TTLCache`가 캐시 역할을 중복한다. React Query의 `staleTime`이 5분, `TTLCache`도 5분으로 설정되어 사실상 동일 레이어에서 이중 캐싱이 발생한다.

### 5.4 localStorage 사용 패턴

localStorage를 사용하는 4개 모듈이 각각 독립적인 키와 직렬화 전략을 사용:

```
- ThemeContext:        'theme' (단순 문자열)
- SidebarContext:      'sidebar-width' (숫자 문자열)
- useRecentPages:      'wiki-recent-pages' (JSON 배열)
- useBookmarks:        'wiki-bookmarks' (JSON 배열)
```

SSR 호환을 위해 `typeof window === 'undefined'` 체크가 일관되게 적용되어 있는 점은 긍정적이다.

### 강점
- React Query와 커스텀 훅의 조합이 서버 상태 관리에 효과적
- staleTime, enabled 옵션이 적절히 활용됨
- localStorage SSR 호환 처리가 일관됨

### 약점
- React Query + TTLCache 이중 캐싱으로 캐시 무효화 시 불일치 가능
- RecentPagesContext, BookmarksContext는 불필요한 Context 래핑
- ShortcutsContext의 SRP 위반 (단축키 + 커맨드 팔레트 상태 혼합)
- Provider 8단계 중첩으로 인한 잠재적 리렌더링 폭포

### 개선 제안
- `TTLCache`를 제거하고 React Query의 캐싱에 일원화 (queryClient의 캐시를 신뢰)
- RecentPages, Bookmarks를 Context 없이 직접 훅으로 사용 (Zustand 등 경량 스토어 고려)
- ShortcutsContext를 `useCommandPalette()`와 `useShortcutRegistry()`로 분리
- Context 값에 `useMemo`를 적용하여 불필요한 리렌더링 방지

---

## 6. 확장 포인트 분석

**현재 수준: 8.0/10**

### 6.1 스케줄러 시스템

스케줄러는 프로젝트에서 가장 세련된 확장 포인트이다.

**아키텍처:**

```
instrumentation.ts (Next.js 서버 시작 시)
  → initializeScheduler()
    → getAllJobs() → 4개 BaseJob 인스턴스 생성
    → registerJob() → node-cron 태스크 등록
    → startScheduler()
      → connectRedis() (가능한 경우)
      → acquireLeadership() (SETNX + TTL)
      → 모든 태스크 시작
      → setupShutdownHandlers() (SIGTERM/SIGINT)
```

**리더 선출 패턴:**

Redis SETNX를 활용한 심플한 리더 선출이 구현되어 있다:

```typescript
// lib/scheduler/leader-election.ts
// SETNX로 리더 획득 (원자적 연산)
const result = await redis.set(REDIS_KEYS.LEADER, POD_ID, 'EX', ttl, 'NX');

// Heartbeat으로 TTL 갱신 (Lua 스크립트로 원자적 처리)
const script = `
  if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("expire", KEYS[1], ARGV[2])
  else
    return 0
  end
`;

// 리더십 포기 시 자신의 키만 삭제 (Lua 스크립트)
const script = `
  if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
  else
    return 0
  end
`;
```

**확장 방법:** 새 작업 추가가 매우 간단하다:

```typescript
// 1. BaseJob 상속하여 새 작업 구현
class MyNewJob extends BaseJob {
  readonly name = 'my-new-job';
  readonly description = '새로운 작업';
  readonly schedule = '0 */6 * * *';  // 6시간마다
  protected async execute(): Promise<JobResult> { /* 구현 */ }
}

// 2. jobs/index.ts에 등록
export function getAllJobs(): BaseJob[] {
  return [ ..., new MyNewJob() ];
}
```

**Redis 없는 폴백:** Redis가 없을 때 단일 인스턴스 모드로 자동 전환되는 설계가 우수하다:

```typescript
export function isLeader(): boolean {
  if (!isRedisEnabled()) return true;  // Redis 없으면 항상 리더
  return isCurrentLeader;
}
```

### 6.2 Webhook 처리 시스템

Webhook 핸들러는 이벤트 기반 확장 포인트를 제공한다:

```typescript
// lib/webhook/handler.ts - 이벤트-액션 매핑
switch (action) {
  case 'labeled':   // request → 문서 생성, invalid → 검토 표시
  case 'closed':    // draft 라벨 → 문서 발행
  case 'reopened':  // published 라벨 → 발행 취소
}
```

외부 스크립트를 `spawn`으로 실행하는 방식은 유연하지만, 5분 타임아웃과 SIGTERM/SIGKILL 2단계 종료 처리가 구현되어 있다:

```typescript
// 5분 타임아웃
timeoutId = setTimeout(() => {
  child.kill('SIGTERM');
  // SIGTERM 후 10초 대기, 응답 없으면 SIGKILL
  killTimeoutId = setTimeout(() => {
    child.kill('SIGKILL');
  }, 10000);
}, 5 * 60 * 1000);
```

### 6.3 설정 확장 포인트

3개의 설정 파일로 사이트 커스터마이징이 가능:

```
site.config.ts       → 사이트 기본 정보 (제목, 로고, GitHub 연동, 소셜 링크, 푸터)
theme.config.ts      → 테마 설정 (색상, 폰트, 레이아웃, 테두리)
navigation.config.ts → 네비게이션 설정 (메인 메뉴, 사이드바 섹션)
```

### 6.4 추가 문서 소스

환경변수 `EXTRA_WIKI_DIRS`로 외부 문서 소스를 추가할 수 있다:

```javascript
// scripts/builders/build-wiki-data.js
const EXTRA_WIKI_DIRS = process.env.EXTRA_WIKI_DIRS
  ? process.env.EXTRA_WIKI_DIRS.split(',').map(p => p.trim())
  : [];
```

### 강점
- 스케줄러의 Template Method 패턴으로 새 작업 추가가 매우 용이
- 리더 선출의 Redis/단일 인스턴스 자동 전환이 운영 유연성 제공
- 설정 파일 기반 커스터마이징으로 포크 없이 재사용 가능
- Webhook의 이벤트-액션 매핑이 확장 가능한 구조

### 약점
- Webhook 핸들러가 외부 스크립트를 spawn하므로 관찰 가능성 부족
- 새 Webhook 이벤트 추가 시 handler.ts의 수정 필요 (Open-Closed 위반)
- 스케줄러 작업 등록이 코드 수정 필요 (동적 등록 메커니즘 부재)

### 개선 제안
- Webhook 핸들러에 플러그인/미들웨어 패턴 도입 (이벤트-핸들러 레지스트리)
- 스케줄러 작업을 설정 파일에서 동적 로드하는 메커니즘 추가
- Webhook 스크립트 실행 결과를 구조화된 로그(JSON)로 기록

---

## 7. 기술 부채 식별

**현재 수준: 5.5/10 (낮을수록 부채 적음 -- 현재 중간 수준)**

### 7.1 src/(Vite) + app/(Next.js) 이중 구조

가장 큰 기술 부채이다. 두 프레임워크의 진입점과 라우팅 코드가 공존한다:

| 항목 | Vite (레거시) | Next.js (현재) |
|------|--------------|---------------|
| 진입점 | `src/main.tsx` | `app/layout.tsx` |
| 라우터 | `react-router-dom` (BrowserRouter) | Next.js App Router |
| 페이지 | `src/page-components/*.tsx` (7개) | `app/(main)/**/*.tsx` |
| 레이아웃 | `src/components/layout/Layout.tsx` (Outlet) | `app/(main)/layout.tsx` |
| 빌드 | `vite.config.ts` → `dist/` | `next.config.js` → `.next/` |
| Provider | `src/App.tsx` (4단계) | `app/providers.tsx` (8단계) |

`package.json`의 의존성에 `react-router-dom@^7.13.0`이 여전히 포함되어 있으며, 이는 번들 크기에 직접 영향을 미친다.

**영향**: 코드 이해 복잡성 증가, 번들 크기 비대, 새 개발자 온보딩 혼란

### 7.2 번들 크기 문제

`package.json`에 나열된 주요 대형 의존성:

```
mermaid@^11.12.2      → ~1.5MB (gzipped 기준)
plotly.js@^3.3.1      → ~3.5MB
monaco-editor          → ~2.8MB (react 래퍼 포함)
react-syntax-highlighter → ~500KB
```

Lazy 로딩이 구현되어 있지만 (`LazyMermaidDiagram.tsx`, `LazyPlotlyChart.tsx`), 이는 코드 분할만 처리하며 초기 번들에서 완전히 제외되지는 않을 수 있다.

`next.config.js`에서 서버 번들에서 제외:

```javascript
webpack: (config, { isServer }) => {
  if (isServer) {
    config.externals.push('mermaid', 'plotly.js');
  }
  return config;
},
```

그리고 `optimizePackageImports`로 트리 쉐이킹:

```javascript
optimizePackageImports: ['lucide-react', '@tanstack/react-query', 'react-syntax-highlighter'],
```

### 7.3 의존성 관리

`react-router-dom`이 Next.js App Router와 공존하면서 불필요:

```json
// package.json - 레거시 의존성
"react-router-dom": "^7.13.0"  // Vite 빌드용, Next.js에서는 미사용
```

`@types/dompurify`가 dependencies(devDependencies가 아닌)에 포함:

```json
"@types/dompurify": "^3.0.5"  // devDependencies로 이동 필요
```

### 7.4 코드 중복

| 중복 항목 | 위치 1 | 위치 2 |
|-----------|--------|--------|
| `getBaseUrl()` | `src/services/api.ts` | `src/services/search.ts` |
| 위키 데이터 로딩 | `src/services/api.ts` (HTTP) | `lib/wiki.ts` (fs) |
| 레이아웃 컴포넌트 | `src/components/layout/Layout.tsx` | `app/(main)/layout.tsx` |
| 페이지 컴포넌트 | `src/page-components/*.tsx` | `app/(main)/**/*.tsx` |
| Provider 스택 | `src/App.tsx` | `app/providers.tsx` |

### 7.5 타입 안전성

`WikiTree` 인터페이스에 `@deprecated` 표시가 있지만 여전히 사용 중:

```typescript
// src/types/index.ts
/** @deprecated WikiTreeItem 사용을 권장 */
export interface WikiTree {
  title?: string;   // 모든 필드가 optional
  slug?: string;
  name?: string;
  // ...
}
```

이 타입은 `lib/wiki.ts`, `src/services/api.ts` 등에서 반환 타입으로 사용되어 타입 안전성을 저해한다.

### 7.6 테스트 커버리지

테스트 파일이 극소수:

```
src/components/wiki/MarkdownRenderer.test.tsx
src/context/ThemeContext.test.tsx
src/hooks/useWiki.test.tsx
src/config.test.ts
src/utils/index.test.ts
```

75개 소스 파일 중 5개만 테스트가 존재하여 커버리지가 매우 낮다 (약 6.7%).

### 강점
- 기술 부채가 식별 가능한 형태로 존재 (명확한 레거시 경계)
- Lazy 로딩으로 대형 라이브러리의 초기 로드 영향 완화
- 타입 시스템이 deprecated 마킹으로 마이그레이션 방향 제시

### 약점
- Vite 빌드 잔존물이 코드 복잡성을 가중
- 대형 라이브러리(mermaid, plotly.js)가 번들 크기의 대부분 차지
- 테스트 커버리지 극히 낮음
- deprecated WikiTree 타입이 여전히 광범위하게 사용

### 개선 제안 (우선순위순)
1. **높음**: `src/App.tsx`, `src/page-components/`, `react-router-dom` 제거 → 번들 크기 감소 + 복잡성 해소
2. **높음**: 테스트 커버리지를 핵심 모듈(scheduler, webhook, api)에 대해 최소 60%까지 확보
3. **중간**: `WikiTree`를 `WikiTreeItem`으로 완전 마이그레이션
4. **중간**: mermaid, plotly.js를 dynamic import + 별도 chunk로 완전 분리
5. **낮음**: `getBaseUrl()` 등 중복 유틸리티 통합

---

## 8. 아키텍처 성숙도

**현재 수준: 6.5/10 (TOGAF Architecture Maturity Model 기준)**

### 8.1 TOGAF 성숙도 레벨 평가

| 영역 | 레벨 | 평가 |
|------|------|------|
| 아키텍처 거버넌스 | Level 2 (Developing) | CLAUDE.md 기반 규칙 존재, 체계적 검토 부재 |
| 비즈니스 아키텍처 | Level 3 (Defined) | 도메인 모델(Wiki, Issue, AIHistory)이 명확히 정의 |
| 데이터 아키텍처 | Level 3 (Defined) | 타입 시스템 체계적, 데이터 흐름 문서화 가능 |
| 애플리케이션 아키텍처 | Level 2-3 | 모듈 구조 명확하나, 이중 구조로 인한 혼란 |
| 기술 아키텍처 | Level 3 (Defined) | Docker + Helm + CI/CD 파이프라인 구축 |
| 보안 아키텍처 | Level 3 (Defined) | 인증(Keycloak), Webhook 서명, 보안 헤더, RBAC |

### 8.2 C4 모델 관점 분석

**Level 1 - System Context:**

```
[사용자] → [SEPilot Wiki] ← [GitHub API]
                ↕                 ↕
           [Redis]          [Keycloak IdP]
```

외부 시스템과의 통합 경계가 명확하다. GitHub API(Webhook, Issues), Keycloak(인증), Redis(분산 락)가 명확한 인터페이스로 연결된다.

**Level 2 - Container:**

```
[Web Application (Next.js)]
  ├── Static Pages (export) → GitHub Pages
  ├── Server Application (standalone) → Kubernetes
  │     ├── API Routes (/api/*)
  │     ├── Scheduler (node-cron)
  │     └── Middleware (auth)
  └── Build Scripts (Node.js CLI)
```

컨테이너 경계가 빌드 모드에 따라 유동적인 것이 특이하다. 이는 유연성을 제공하지만 아키텍처 다이어그램이 빌드 모드별로 달라지는 단점이 있다.

**Level 3 - Component:**

주요 컴포넌트 간 의존성:

```
[Providers] ──→ [QueryClient] ──→ [useWiki hooks] ──→ [API Service] ──→ [JSON 데이터]
     │                                                       ↑
     ├─→ [ThemeContext] ──→ [ConfigContext]                  │
     ├─→ [ErrorContext] ──→ [ToastContainer]                │
     ├─→ [SidebarContext] ──→ [ShortcutsContext]            │
     └─→ [SessionProvider] ──→ [Middleware]                 │
                                                             │
[Scheduler Manager] ──→ [Leader Election] ──→ [Redis]       │
        │                                                    │
        └─→ [BaseJob implementations] ──────────────────────┘
```

### 8.3 운영 성숙도

**인프라 코드:**
- Docker 멀티스테이지 빌드 (deps → builder → runner)
- Helm Chart (values, deployment, service, ingress, HPA, secret)
- GitHub Actions CI/CD (14개 워크플로우)
- 보안 컨텍스트 (non-root, readOnlyRootFilesystem, seccompProfile)

```yaml
# helm/sepilot-wiki/values.yaml - 보안 설정
securityContext:
  runAsNonRoot: true
  runAsUser: 1001
  allowPrivilegeEscalation: false
  capabilities:
    drop: [ALL]
  readOnlyRootFilesystem: true
  seccompProfile:
    type: RuntimeDefault
```

**관찰 가능성:**
- Health Check API (`/api/health`)
- 스케줄러 실행 이력 (Redis에 저장)
- 구조화된 로그 (`[Webhook]`, `[Scheduler]`, `[Leader]`, `[Job:name]` 접두사)
- 하지만 메트릭 수집(Prometheus), 분산 추적(OpenTelemetry) 미구현

**복원력:**
- Graceful shutdown 핸들러
- 리더 선출 자동 복구 (지수 백오프)
- API 재시도 (fetchWithRetry, BaseJob.executeWithRetry)
- Redis 연결 실패 시 단일 인스턴스 모드 폴백

### 강점
- 운영 인프라가 프로덕션 수준 (Docker, Helm, HPA, 보안 컨텍스트)
- 복원력 패턴이 체계적 (재시도, 폴백, graceful shutdown)
- 보안 아키텍처가 잘 구현 (Keycloak RBAC, Webhook 서명 검증, 보안 헤더)
- 환경변수 검증이 서버 시작 시 자동 실행

### 약점
- 아키텍처 문서화 부재 (ADR, C4 다이어그램 없음)
- 메트릭/분산 추적 미구현
- 이중 빌드 구조로 인해 C4 Level 2가 불안정
- E2E 테스트 인프라는 있으나 실제 테스트 케이스 부족

### 개선 제안
- Architecture Decision Records (ADR) 도입하여 설계 결정 기록
- OpenTelemetry 통합으로 분산 추적 및 메트릭 수집 활성화
- C4 다이어그램을 코드로 관리 (Structurizr DSL 또는 Mermaid)
- 핵심 워크플로우(문서 생성 -> 검토 -> 발행)에 대한 E2E 테스트 작성

---

## 9. 종합 평가 및 권고

### 9.1 종합 점수표

| 평가 항목 | 점수 (10점 만점) | 요약 |
|-----------|:---:|------|
| 전체 아키텍처 패턴 | **7.5** | 듀얼 빌드의 독창성, App Router 적절 활용 |
| 레이어 분리 수준 | **7.0** | 서버/클라이언트 분리 양호, 일부 계층 위반 |
| 모듈 응집도/결합도 | **7.0** | 스케줄러 높은 응집도, api.ts 과도한 책임 |
| 데이터 흐름 아키텍처 | **8.0** | 3중 캐시 전략, 빌드타임 최적화 우수 |
| 상태 관리 전략 | **6.5** | React Query 잘 활용, Context 과다/이중 캐싱 |
| 확장 포인트 | **8.0** | 스케줄러 확장성 우수, Webhook 유연 |
| 기술 부채 수준 | **5.5** | Vite 잔존, 낮은 테스트 커버리지, 대형 번들 |
| 아키텍처 성숙도 | **6.5** | 운영 인프라 우수, 문서화/관찰가능성 부족 |
| **종합** | **7.0** | |

### 9.2 즉시 조치 필요 (Critical)

1. **Vite 레거시 제거**: `src/App.tsx`, `src/page-components/`, `vite.config.ts`, `react-router-dom` 의존성 제거. 예상 번들 크기 감소: ~200KB+
2. **테스트 커버리지 확보**: 최소한 `lib/scheduler/`, `lib/webhook/`, `src/services/api.ts`에 대한 단위 테스트 작성 (목표: 60%)

### 9.3 단기 개선 (1-2 스프린트)

3. **api.ts 분할**: 도메인별 서비스 모듈로 분리 (`wiki-service.ts`, `issues-service.ts`, `history-service.ts`)
4. **TTLCache 제거**: React Query 캐시에 일원화
5. **Context 정리**: RecentPages/Bookmarks Context 제거, 훅 직접 사용
6. **WikiTree 타입 마이그레이션**: deprecated WikiTree를 WikiTreeItem으로 완전 전환

### 9.4 중장기 개선 (분기 단위)

7. **스케줄러 분리**: K8s CronJob 또는 사이드카 패턴으로 Next.js 프로세스에서 분리
8. **관찰 가능성**: OpenTelemetry 통합, Prometheus 메트릭 노출
9. **문서 지연 로딩**: `wiki-data.json`에서 본문을 분리하여 페이지별 로딩
10. **ADR 도입**: 향후 아키텍처 결정을 체계적으로 기록

### 9.5 아키텍처 비전

현재 시스템은 "Smart Monolith"에서 "Modular Application"으로의 전환점에 있다. Vite 레거시 제거와 테스트 확보가 완료되면, 다음 단계로 스케줄러 분리와 관찰 가능성 강화를 통해 운영 우수성을 달성할 수 있는 좋은 기반을 갖추고 있다.

```
현재 상태                    목표 상태
[Monolith + Legacy]    →    [Clean Modular Monolith]    →    [분산 가능 모듈]
  - Vite 잔존                 - Next.js 단일 빌드             - 스케줄러 분리
  - 낮은 테스트               - 60%+ 커버리지                - 관찰 가능성 확보
  - 이중 캐싱                 - React Query 일원화           - 이벤트 기반 통합
```

---

> **작성**: Claude Opus 4.6 (아키텍처 분석)
> **근거**: 소스코드 직접 분석 기반 (151개 파일, 25,807줄)
> **분석 방법론**: TOGAF Architecture Maturity Model + C4 Model + 코드 정적 분석
