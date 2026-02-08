# SEPilot Wiki - 요구사항 관점 분석 문서

> 분석일: 2026-02-07
> 대상 버전: v0.4.0
> 스택: React 18 + TypeScript 5 + Next.js 15 + Vite 7 + Bun

---

## 목차

1. [기능 요구사항 충족도](#1-기능-요구사항-충족도)
2. [비기능 요구사항 충족도](#2-비기능-요구사항-충족도)
3. [사용자 스토리 매핑](#3-사용자-스토리-매핑)
4. [요구사항 추적성](#4-요구사항-추적성)
5. [기능 완성도 분석](#5-기능-완성도-분석)
6. [엣지 케이스 처리](#6-엣지-케이스-처리)
7. [국제화(i18n) 및 지역화(l10n)](#7-국제화i18n-및-지역화l10n)
8. [접근성 요구사항](#8-접근성-요구사항)
9. [종합 평가](#9-종합-평가)

---

## 1. 기능 요구사항 충족도

### 종합 점수: 72/100

### 1.1 위키 CRUD

| 기능 | 상태 | 점수 | 설명 |
|------|------|------|------|
| **Read (조회)** | 완성 | 10/10 | 정적 JSON(`wiki-data.json`)에서 페이지 조회, 슬러그 기반 라우팅 완비 |
| **목록 조회** | 완성 | 9/10 | 트리 구조 사이드바, 카테고리/페이지 분리, 폴더 접기/펼치기 지원 |
| **Create (생성)** | 미구현 | 2/10 | UI 에디터(`MonacoEditor`, `MarkdownEditor`) 컴포넌트 존재하나 생성 플로우 미완성. GitHub Issue를 통한 간접 생성만 가능 |
| **Update (수정)** | 미구현 | 2/10 | 에디터 컴포넌트, `useAutoSave` 훅, `validation.ts` 검증 로직 존재하나 실제 수정 API 호출 미구현 |
| **Delete (삭제)** | 미구현 | 0/10 | 삭제 기능 전혀 미구현 |

**근거 코드:**

- 조회: `src/services/api.ts` - `fetchWikiPage(slug)` 함수가 `wiki-data.json`에서 데이터를 로드
```typescript
// src/services/api.ts:263-281
export async function fetchWikiPage(slug: string): Promise<WikiPage | null> {
    const wikiData = await loadWikiData();
    const wikiPage = wikiData.pages.find((p) => p.slug === slug);
    if (wikiPage) return wikiPage;
    // guide-data.json에서도 검색
    const guideData = await loadGuideData();
    ...
}
```

- 에디터(미완성): `src/components/editor/MonacoEditor.tsx`, `src/components/editor/MarkdownEditor.tsx` 파일이 존재하나, 저장/제출 플로우 미연결

### 1.2 검색

| 기능 | 상태 | 점수 | 설명 |
|------|------|------|------|
| **전문 검색** | 완성 | 9/10 | Fuse.js 기반 퍼지 검색, 가중치 설정(title 1.0, tags 0.8, excerpt 0.5, content 0.3) |
| **검색 필터** | 완성 | 8/10 | 태그, 날짜 범위, 저자 필터 구현 (`SearchFilter` 인터페이스) |
| **검색 UX** | 완성 | 9/10 | 디바운스(300ms), 하이라이팅, 컨텍스트 추출, 가상 스크롤(20건 이상), 인기 태그 추천 |
| **커맨드 팔레트** | 완성 | 9/10 | `Cmd+K` 단축키, 페이지/액션 통합 검색, 키보드 네비게이션 |

**근거 코드:**

```typescript
// src/services/search.ts:57-67 - Fuse.js 설정
fuseInstance = new Fuse(searchIndexCache!, {
    includeScore: true,
    threshold: 0.4,
    keys: [
        { name: 'title', weight: 1.0 },
        { name: 'tags', weight: 0.8 },
        { name: 'excerpt', weight: 0.5 },
        { name: 'content', weight: 0.3 }
    ]
});
```

### 1.3 태그 시스템

| 기능 | 상태 | 점수 | 설명 |
|------|------|------|------|
| **태그 목록/통계** | 완성 | 10/10 | 태그 순위, 카운트, 연관 문서 목록 |
| **워드 클라우드** | 완성 | 9/10 | `react-wordcloud` 기반 시각화, 클릭으로 필터링 |
| **태그 필터링** | 완성 | 8/10 | 검색 시 태그 필터 적용 가능 |
| **태그 관리(CRUD)** | 미구현 | 0/10 | 태그 추가/수정/삭제 UI 없음 |

### 1.4 AI 자동화

| 기능 | 상태 | 점수 | 설명 |
|------|------|------|------|
| **AI 히스토리 조회** | 완성 | 9/10 | 타임라인 UI, 액션 타입별 필터, 문서별 히스토리 |
| **Issue 기반 자동 생성** | 완성 | 8/10 | `request` 라벨 -> AI 문서 생성 워크플로우 (GitHub Actions) |
| **AI 문서 수정** | 완성 | 7/10 | `invalid` 라벨 -> AI 수정 트리거 |
| **AI 모델 표시** | 완성 | 8/10 | 히스토리에 사용 모델 정보 포함 |

**근거 코드:**

```typescript
// src/types/index.ts:370-388 - AI 히스토리 타입 정의
export type AIActionType = 'generate' | 'modify' | 'publish' | 'invalid' | 'delete' | 'recover';
export interface AIHistoryEntry {
    actionType: AIActionType;
    trigger: 'request_label' | 'invalid_label' | 'maintainer_comment' | 'issue_close' | 'issue_reopen';
    model?: string;
    ...
}
```

### 1.5 Issues 통합

| 기능 | 상태 | 점수 | 설명 |
|------|------|------|------|
| **Issue 목록 조회** | 완성 | 9/10 | 라벨/상태 필터, 페이지네이션 없이 전체 표시 |
| **Issue -> 문서 연결** | 완성 | 8/10 | `documentSlug` 필드로 연결 |
| **Issue 생성 연동** | 완성 | 9/10 | GitHub Issue 생성 URL 직접 연결 (라벨 자동 설정) |
| **워크플로우 상태** | 완성 | 8/10 | GitHub Actions 실행 상태 표시 (`WorkflowStatus` 컴포넌트) |

### 1.6 인증

| 기능 | 상태 | 점수 | 설명 |
|------|------|------|------|
| **Keycloak OAuth** | 완성 | 8/10 | `next-auth` + Keycloak 프로바이더 |
| **역할 기반 접근 제어** | 부분 완성 | 6/10 | `wiki-editor`, `wiki-admin` 역할 정의, 미들웨어 라우트 보호 |
| **Public/Private 모드** | 완성 | 8/10 | `AUTH_MODE` 환경변수로 전환 가능 |
| **관리자 페이지** | 부분 완성 | 4/10 | `AdminSidebar` 컴포넌트 존재하나 관리 기능 미완성 |

**근거 코드:**

```typescript
// middleware.ts:8-33 - 인증 미들웨어
export default auth((req) => {
    if (process.env.AUTH_MODE === 'public') return;
    const protectedRoutes = [
        /^\/issues/, /^\/ai-history/, /^\/admin/, /^\/edit\//,
    ];
    ...
});
```

```typescript
// src/components/auth/AuthButton.tsx:53-55 - 역할 기반 접근 제어
const isEditor = userRoles.includes('wiki-editor') || userRoles.includes('wiki-admin');
const isAdmin = userRoles.includes('wiki-admin');
```

---

## 2. 비기능 요구사항 충족도

### 종합 점수: 78/100

### 2.1 성능

| 항목 | 상태 | 점수 | 설명 |
|------|------|------|------|
| **TTL 캐시** | 완성 | 9/10 | 데이터 유형별 차등 TTL (위키 5분, Issues 2분, Actions 1분) |
| **Lazy Loading** | 완성 | 9/10 | Mermaid, Plotly 코드 분할 (`React.lazy` + `Suspense`), 이미지 `loading="lazy"` |
| **가상 스크롤** | 완성 | 9/10 | `@tanstack/react-virtual` 기반, 20건 이상 자동 적용, 오버스캔 5 |
| **디바운스** | 완성 | 8/10 | 검색(300ms), 사이드바 저장(300ms), 자동 저장(2000ms) |
| **코드 분할** | 부분 완성 | 6/10 | 무거운 라이브러리만 분할, 페이지 레벨 분할 미적용 |
| **이미지 최적화** | 부분 완성 | 6/10 | `loading="lazy"`, `decoding="async"`, CLS 방지용 `aspect-ratio` 설정, 그러나 Next.js `Image` 미사용 |
| **캐시 버스팅** | 완성 | 8/10 | 정적/동적 데이터 분리, 빌드 시간/시간 간격 기반 캐시 키 |
| **React Query** | 완성 | 9/10 | `staleTime` 설정, `refetchOnWindowFocus: false`, Actions 30초 자동 갱신 |

**근거 코드:**

```typescript
// src/services/api.ts:53-59 - TTL 설정
const CACHE_TTL = {
    WIKI_DATA: 5 * 60 * 1000,     // 5분
    ISSUES: 2 * 60 * 1000,        // 2분
    ACTIONS_STATUS: 1 * 60 * 1000, // 1분
};
```

```typescript
// src/components/wiki/LazyMermaidDiagram.tsx:10-14 - 코드 분할
const MermaidDiagram = lazy(() =>
    import('./MermaidDiagram').then((module) => ({
        default: module.MermaidDiagram,
    }))
);
```

### 2.2 보안

| 항목 | 상태 | 점수 | 설명 |
|------|------|------|------|
| **XSS 방어** | 완성 | 9/10 | `rehype-sanitize` 플러그인으로 마크다운 HTML 살균 |
| **외부 링크 보호** | 완성 | 9/10 | `rel="noopener noreferrer"` 일관 적용 |
| **CSRF 방어** | 부분 완성 | 5/10 | Next.js 기본 보호만 의존, 명시적 CSRF 토큰 미구현 |
| **Content Security Policy** | 미구현 | 2/10 | CSP 헤더 설정 없음 |
| **환경변수 관리** | 완성 | 8/10 | `.env` 파일 기반, `NEXT_PUBLIC_` 접두사로 클라이언트/서버 구분 |
| **입력 검증** | 완성 | 8/10 | `validation.ts`에서 마크다운, 제목, 슬러그 검증 |
| **정규식 안전성** | 완성 | 8/10 | `escapeRegExp()` 유틸리티로 ReDoS 방어 |

**근거 코드:**

```typescript
// src/components/wiki/MarkdownRenderer.tsx:59-60 - XSS 방어
<ReactMarkdown
    remarkPlugins={[remarkGfm]}
    rehypePlugins={[rehypeRaw, rehypeSanitize]}
```

```typescript
// src/utils/index.ts:251-253 - 정규식 이스케이프
export function escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
```

### 2.3 반응형 디자인

| 항목 | 상태 | 점수 | 설명 |
|------|------|------|------|
| **미디어 쿼리** | 완성 | 8/10 | 33개 `@media` 규칙, 8개 CSS 파일에 분산 |
| **모바일 검색** | 완성 | 9/10 | 모바일 전용 검색 오버레이 (`mobile-search-overlay`) |
| **사이드바 반응형** | 완성 | 9/10 | 1024px 미만 자동 닫힘, 오버레이 모드, 리사이즈 핸들(데스크톱) |
| **테이블 반응형** | 완성 | 7/10 | `table-wrapper`로 수평 스크롤 처리 |

---

## 3. 사용자 스토리 매핑

### 3.1 일반 사용자 (Reader)

| 사용자 스토리 | 상태 | 완성도 |
|-------------|------|--------|
| 위키 문서를 읽을 수 있다 | 완성 | 100% |
| 문서 목차(TOC)로 빠르게 이동할 수 있다 | 완성 | 100% |
| 문서를 검색할 수 있다 | 완성 | 95% |
| 태그로 문서를 탐색할 수 있다 | 완성 | 90% |
| 다크/라이트 테마를 전환할 수 있다 | 완성 | 100% |
| 모바일에서 문서를 볼 수 있다 | 완성 | 90% |
| 코드 블록을 복사할 수 있다 | 완성 | 95% |
| Mermaid 다이어그램을 볼 수 있다 | 완성 | 90% |
| 문서 수정을 요청할 수 있다 | 완성 | 85% |
| 문서 버전 히스토리를 볼 수 있다 | 완성 | 90% |
| 오프라인에서 문서를 볼 수 있다 | 미구현 | 0% |
| 북마크/즐겨찾기를 관리할 수 있다 | 부분 완성 | 30% |

### 3.2 관리자 (Admin)

| 사용자 스토리 | 상태 | 완성도 |
|-------------|------|--------|
| 문서를 직접 생성/수정/삭제할 수 있다 | 미구현 | 10% |
| Issue를 통해 AI 문서 생성을 트리거할 수 있다 | 완성 | 90% |
| AI 작업 히스토리를 모니터링할 수 있다 | 완성 | 90% |
| GitHub Actions 상태를 확인할 수 있다 | 완성 | 85% |
| 사용자 권한을 관리할 수 있다 | 미구현 | 5% |
| 관리자 대시보드를 사용할 수 있다 | 미구현 | 10% |
| 문서 통계를 확인할 수 있다 | 부분 완성 | 40% |

### 3.3 AI 에이전트

| 사용자 스토리 | 상태 | 완성도 |
|-------------|------|--------|
| `request` 라벨 Issue에서 문서를 자동 생성한다 | 완성 | 90% |
| `invalid` 라벨로 문서를 자동 수정한다 | 완성 | 85% |
| 작업 이력을 `ai-history.json`에 기록한다 | 완성 | 90% |
| cron 스케줄로 시스템 정보를 수집한다 | 완성 | 85% |
| 문서 트리 구조를 자동 유지보수한다 | 완성 | 85% |
| PR 리뷰를 자동 수행한다 | 완성 | 80% |

---

## 4. 요구사항 추적성

### 4.1 코드 구현 <-> 기능 매핑

| 요구사항 | 구현 파일 | 매핑 상태 |
|---------|----------|----------|
| 위키 조회 | `src/services/api.ts`, `src/page-components/WikiPage.tsx` | 완전 매핑 |
| 검색 | `src/services/search.ts`, `src/page-components/SearchPage.tsx` | 완전 매핑 |
| 태그 | `src/services/api.ts (fetchWikiTags)`, `src/page-components/TagsPage.tsx` | 완전 매핑 |
| Issues 통합 | `src/services/api.ts (fetchIssues)`, `src/page-components/IssuesPage.tsx` | 완전 매핑 |
| AI 히스토리 | `src/services/api.ts (fetchAIHistory)`, `src/page-components/AIHistoryPage.tsx` | 완전 매핑 |
| 인증 | `middleware.ts`, `src/components/auth/AuthButton.tsx`, `lib/auth.ts` | 부분 매핑 |
| 문서 생성/수정 | `src/components/editor/*`, `src/hooks/useAutoSave.ts`, `src/utils/validation.ts` | **컴포넌트만 존재, 플로우 미연결** |
| 문서 삭제 | 없음 | **미구현** |
| 관리자 기능 | `src/components/admin/AdminSidebar.tsx` | **스캐폴드만 존재** |
| 오프라인 지원 | 없음 | **미구현** |

### 4.2 미구현 항목 상세

| 항목 | 존재하는 코드 | 누락된 부분 |
|------|-------------|------------|
| 문서 CRUD | 에디터 컴포넌트, 유효성 검증, 자동 저장 훅 | API 호출, 라우트, 제출 플로우 |
| 관리자 대시보드 | `AdminSidebar.tsx` | 대시보드 페이지, 통계, 설정 관리 |
| 사용자 관리 | 역할 정의 (`wiki-editor`, `wiki-admin`) | 역할 할당/수정 UI |
| 문서 비교(diff) | `WikiRevision` 타입 (additions/deletions) | diff 뷰어 컴포넌트 |
| 문서 내보내기/가져오기 | 없음 | 전체 미구현 |

---

## 5. 기능 완성도 분석

### 5.1 페이지별 완성도

| 페이지 | 완성도 | 점수 | 상세 |
|--------|--------|------|------|
| **HomePage** | 완성 | 9/10 | 히어로, 기능 소개, 최근 문서/요청, CTA, 로딩/에러 상태 |
| **WikiPage** | 완성 | 9/10 | 마크다운 렌더링, TOC, 브레드크럼, 버전 히스토리, 초안/오류 표시 |
| **SearchPage** | 완성 | 9/10 | 퍼지 검색, 하이라이팅, 태그 추천, 가상 스크롤 |
| **IssuesPage** | 완성 | 8/10 | 필터(라벨/상태), 워크플로우 상태, 문서 연결 |
| **TagsPage** | 완성 | 9/10 | 워드 클라우드, 태그 클라우드, 순위 목록, 상세 문서 목록 |
| **AIHistoryPage** | 완성 | 8/10 | 타임라인, 필터, 문서별/전체 모드 |
| **NotFoundPage** | 완성 | 8/10 | 404 UI, 홈/검색 네비게이션 |
| **편집 페이지** | 미구현 | 1/10 | 에디터 컴포넌트만 존재, 라우트 미연결 |
| **관리자 페이지** | 미구현 | 1/10 | 사이드바만 존재 |

### 5.2 컴포넌트별 완성도

| 컴포넌트 | 완성도 | 점수 | 상세 |
|---------|--------|------|------|
| **MarkdownRenderer** | 완성 | 9/10 | GFM, 코드 하이라이팅, Mermaid, Plotly, 내부/외부 링크, 이미지 에러 핸들링 |
| **Layout** | 완성 | 9/10 | Skip link, 시맨틱 구조, ErrorBoundary |
| **Header** | 완성 | 9/10 | 검색, 테마, GitHub, 인증, 반응형 |
| **Sidebar** | 완성 | 9/10 | 트리 구조, 리사이즈, 폴더 상태 저장, 커스텀 섹션 |
| **ErrorBoundary** | 완성 | 9/10 | 전역/섹션 레벨, HOC, 폴백 UI |
| **ErrorToast** | 완성 | 9/10 | 4가지 타입, 액션 버튼, 자동 제거, 최대 5개 |
| **VirtualList** | 완성 | 9/10 | 컨테이너/윈도우 모드, 접근성 속성 |
| **CommandPalette** | 완성 | 9/10 | 페이지/액션 검색, 키보드 네비게이션, 포커스 트랩 |
| **MonacoEditor** | 부분 완성 | 5/10 | 에디터 로드, 그러나 저장/프리뷰 연결 미완성 |

---

## 6. 엣지 케이스 처리

### 종합 점수: 70/100

| 항목 | 상태 | 점수 | 구현 내용 |
|------|------|------|----------|
| **네트워크 에러** | 완성 | 9/10 | `fetchWithRetry` (지수 백오프 + 지터), `ApiServiceError` 구조화, 재시도 버튼 |
| **Rate Limiting** | 완성 | 9/10 | `Retry-After` 헤더 파싱, 429 응답 자동 재시도 |
| **404 데이터** | 완성 | 8/10 | `wiki-data.json` 미존재 시 빈 배열 반환, 개별 페이지 미존재 시 "문서 요청" CTA |
| **빈 상태 (Empty State)** | 완성 | 9/10 | 모든 목록 컴포넌트에 빈 상태 UI 구현 |
| **로딩 상태** | 완성 | 9/10 | Skeleton 컴포넌트, 다양한 프리셋 (searchResult, document 등) |
| **캐시 만료** | 완성 | 8/10 | TTLCache 클래스로 자동 만료 및 재요청 |
| **대량 데이터** | 완성 | 8/10 | VirtualList (20건 이상 자동 적용), 검색 결과 가상화 |
| **오프라인 지원** | 미구현 | 0/10 | Service Worker 미구현 |
| **클립보드 API 실패** | 완성 | 8/10 | `navigator.clipboard` 실패 시 `document.execCommand('copy')` 폴백 |
| **이미지 로드 실패** | 완성 | 7/10 | `onError` 핸들러로 대체 UI 표시 |
| **localStorage 실패** | 완성 | 8/10 | try-catch로 감싸 실패 시 무시 (테마, 사이드바, 드래프트) |
| **Hydration 에러** | 완성 | 8/10 | `isMounted` 상태로 클라이언트 전용 렌더링, 테마 아이콘 모두 렌더 후 CSS 전환 |

**근거 코드:**

```typescript
// src/utils/retry.ts:56-71 - 지수 백오프 + 지터
function calculateDelay(attempt, initialDelay, maxDelay, backoffMultiplier) {
    const exponentialDelay = initialDelay * Math.pow(backoffMultiplier, attempt - 1);
    const boundedDelay = Math.min(exponentialDelay, maxDelay);
    const jitter = 0.5 + Math.random(); // 지터 추가
    return Math.floor(boundedDelay * jitter);
}
```

```typescript
// src/components/wiki/MarkdownRenderer.tsx:232-253 - 클립보드 폴백
const handleCopy = async () => {
    try {
        await navigator.clipboard.writeText(children);
    } catch {
        // 폴백: document.execCommand('copy')
        const textarea = document.createElement('textarea');
        textarea.value = children;
        ...
    }
};
```

---

## 7. 국제화(i18n) 및 지역화(l10n)

### 종합 점수: 35/100

| 항목 | 상태 | 점수 | 설명 |
|------|------|------|------|
| **i18n 프레임워크** | 미구현 | 0/10 | `react-i18next`, `next-intl` 등 미도입. 모든 UI 문자열이 하드코딩 |
| **한국어 지원** | 완성 | 10/10 | 모든 UI가 한국어로 작성됨 |
| **날짜 지역화** | 완성 | 8/10 | `date-fns/locale/ko`를 사용한 한국어 날짜 포맷팅 |
| **다국어 전환** | 미구현 | 0/10 | 언어 전환 UI 없음 |
| **RTL 지원** | 미구현 | 0/10 | RTL 레이아웃 고려 없음 |
| **숫자/통화 포맷** | 미구현 | 2/10 | `toLocaleDateString('ko-KR')` 일부 사용, 체계적 포맷팅 없음 |

**현재 상태 요약:**
- UI 문자열이 컴포넌트에 직접 하드코딩되어 있어, 다국어 지원을 위해서는 전면적인 리팩토링 필요
- `date-fns`의 `locale` 설정이 한국어로 고정

**하드코딩 예시:**

```typescript
// src/page-components/HomePage.tsx:59
<h3>스마트 문서화</h3>
<p>AI가 자동으로 문서를 생성하고 유지보수합니다</p>

// src/page-components/NotFoundPage.tsx:9-11
<h1>404</h1>
<h2>페이지를 찾을 수 없습니다</h2>
<p>요청하신 페이지가 존재하지 않거나 이동되었습니다.</p>
```

### 개선 방향

1. `next-intl` 또는 `react-i18next` 도입
2. 모든 UI 문자열을 번역 키로 교체
3. `messages/ko.json`, `messages/en.json` 등 리소스 파일 분리
4. `date-fns` locale을 동적으로 설정

---

## 8. 접근성 요구사항

### 종합 점수: 74/100

### 8.1 WCAG 2.1 AA 준수 항목

| 기준 | 항목 | 상태 | 점수 | 구현 내용 |
|------|------|------|------|----------|
| 1.1.1 | 비텍스트 콘텐츠 | 부분 완성 | 7/10 | 아이콘에 `aria-hidden="true"`, 이미지에 `alt` 속성, 그러나 일부 장식 아이콘에 누락 |
| 1.3.1 | 정보와 관계 | 완성 | 8/10 | 시맨틱 HTML (`header`, `nav`, `main`, `aside`, `footer`), ARIA role 적용 |
| 1.3.2 | 의미 있는 순서 | 완성 | 8/10 | 논리적 DOM 순서, 시각적 순서와 일치 |
| 1.4.3 | 최소 대비 | 확인 필요 | 6/10 | CSS 변수로 색상 관리, 그러나 대비율 검증 미실시 |
| 2.1.1 | 키보드 접근 | 완성 | 9/10 | 모든 인터랙티브 요소 키보드 접근 가능, 단축키 시스템 |
| 2.1.2 | 키보드 트랩 없음 | 완성 | 9/10 | `useFocusTrap` - Escape로 탈출, Tab 순환 |
| 2.4.1 | 블록 건너뛰기 | 완성 | 10/10 | Skip link ("본문으로 바로 가기") 구현 |
| 2.4.2 | 페이지 제목 | 부분 완성 | 6/10 | 정적 제목만 설정, 페이지별 동적 제목 미구현 |
| 2.4.3 | 포커스 순서 | 완성 | 8/10 | 논리적 탭 순서, `tabIndex` 적절 사용 |
| 2.4.7 | 포커스 표시 | 완성 | 8/10 | `:focus-visible` 스타일 정의 |
| 3.2.1 | 포커스 시 변경 없음 | 완성 | 8/10 | 포커스만으로 컨텍스트 변경 없음 |
| 4.1.2 | 이름, 역할, 값 | 완성 | 8/10 | `aria-label`, `aria-expanded`, `aria-haspopup`, `role` 적절 사용 |

**근거 코드:**

```typescript
// src/components/layout/Layout.tsx:28-34 - Skip link + 시맨틱 구조
<a href="#main-content" className="skip-link">
    본문으로 바로 가기
</a>
<Header />
<Sidebar />
<main id="main-content" role="main" aria-label="주요 콘텐츠">
```

```typescript
// src/hooks/useFocusTrap.ts - 포커스 트랩
// Tab 순환, Escape 탈출, 자동 포커스, 포커스 복원
```

```typescript
// src/hooks/useAnnouncer.ts - 스크린리더 알림
// ARIA live region을 통한 동적 콘텐츠 변경 알림
function getOrCreateAnnouncer(): HTMLElement {
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    announcer.setAttribute('role', 'status');
}
```

### 8.2 WCAG 2.1 AAA 준수 항목

| 기준 | 항목 | 상태 | 점수 | 설명 |
|------|------|------|------|------|
| 1.4.6 | 향상된 대비 (7:1) | 확인 필요 | 4/10 | 대비율 테스트 미실시 |
| 1.4.8 | 시각적 표현 | 부분 완성 | 5/10 | 줄 간격 설정, 그러나 텍스트 크기 조절 UI 없음 |
| 2.3.2 | 3회 이하 번쩍임 | 완성 | 8/10 | `prefers-reduced-motion: reduce` 적용 (일부 컴포넌트) |
| 2.4.9 | 링크 목적 (단독) | 부분 완성 | 6/10 | 대부분 의미 있는 링크 텍스트, 일부 "전체 보기" 등 모호 |

### 8.3 접근성 전용 구현 현황

| 기능 | 파일 | 설명 |
|------|------|------|
| Skip Link | `Layout.tsx` | `#main-content`로 이동 |
| ARIA Live Region | `useAnnouncer.ts` | 동적 알림 (polite/assertive) |
| Focus Trap | `useFocusTrap.ts` | 모달에서 포커스 가두기 |
| Focus Return | `useFocusReturn.ts` | 모달 닫힐 때 이전 포커스 복원 |
| 키보드 단축키 | `useKeyboardShortcuts.ts` | Mac/Windows 크로스 플랫폼 지원 |
| 가상 리스트 접근성 | `VirtualList.tsx` | `aria-posinset`, `aria-setsize`, `role="list/listitem"` |
| 토스트 접근성 | `ErrorToast.tsx` | `role="alert"`, `aria-live="polite"` |

### 개선 방향

1. 색상 대비율 자동 검증 (axe-core 등)
2. 페이지별 동적 `<title>` 설정
3. 모든 아이콘에 `aria-hidden` 또는 대체 텍스트 일관 적용
4. `prefers-reduced-motion` 적용 범위 확대
5. 스크린리더 테스트 (NVDA, VoiceOver)

---

## 9. 종합 평가

### 9.1 영역별 점수 요약

| 영역 | 점수 | 평가 |
|------|------|------|
| 기능 요구사항 충족도 | **72/100** | Read/Search/Tag/AI 우수, CRUD 미완성이 큰 감점 요인 |
| 비기능 요구사항 충족도 | **78/100** | 성능 최적화 우수, CSP 등 보안 헤더 미비 |
| 사용자 스토리 매핑 | **70/100** | 읽기 사용자 95%, 관리자 40%, AI 에이전트 87% |
| 요구사항 추적성 | **75/100** | 읽기 기능 완전 매핑, 쓰기 기능 미연결 |
| 기능 완성도 | **73/100** | 7개 페이지 중 5개 완성, 2개 미구현 |
| 엣지 케이스 처리 | **70/100** | 네트워크/에러 처리 우수, 오프라인 지원 없음 |
| 국제화(i18n) | **35/100** | 한국어 단일 언어, i18n 프레임워크 미도입 |
| 접근성(a11y) | **74/100** | 기본 WCAG AA 상당 부분 준수, AAA는 부분적 |

### 9.2 총점

| 항목 | 가중치 | 점수 | 가중 점수 |
|------|--------|------|----------|
| 기능 요구사항 | 25% | 72 | 18.0 |
| 비기능 요구사항 | 20% | 78 | 15.6 |
| 사용자 스토리 | 15% | 70 | 10.5 |
| 요구사항 추적성 | 10% | 75 | 7.5 |
| 기능 완성도 | 10% | 73 | 7.3 |
| 엣지 케이스 | 8% | 70 | 5.6 |
| 국제화 | 5% | 35 | 1.75 |
| 접근성 | 7% | 74 | 5.18 |
| **총점** | **100%** | - | **71.4/100** |

### 9.3 핵심 강점

1. **읽기 경험 최적화**: TTL 캐시, 가상 스크롤, 코드 분할, Skeleton 로딩 등으로 뛰어난 읽기 UX
2. **AI 자동화 파이프라인**: Issue 기반 자동 문서 생성/수정, 히스토리 추적이 잘 설계됨
3. **검색 품질**: Fuse.js 퍼지 검색, 필터링, 커맨드 팔레트, 하이라이팅 등 종합적인 검색 기능
4. **에러 처리**: 구조화된 에러 타입, 재시도 전략, 토스트 알림, ErrorBoundary 계층
5. **접근성 기반**: Skip link, 포커스 트랩/복원, 스크린리더 알림 등 기본 접근성 인프라 구축

### 9.4 핵심 개선 필요 사항

| 우선순위 | 항목 | 현재 | 목표 | 예상 공수 |
|---------|------|------|------|----------|
| **P0** | 문서 CRUD 완성 | 에디터 컴포넌트만 존재 | 생성/수정/삭제 플로우 완성 | L (2-3주) |
| **P0** | CSP 헤더 설정 | 미구현 | `next.config.js`에서 CSP 설정 | S (1-2일) |
| **P1** | 관리자 대시보드 | 스캐폴드만 | 사용자/문서/통계 관리 | L (2-3주) |
| **P1** | 페이지별 동적 title | 정적 title | `useEffect`로 동적 설정 | S (1-2일) |
| **P2** | i18n 프레임워크 도입 | 하드코딩 | `next-intl` + 한/영 리소스 | XL (4-6주) |
| **P2** | 오프라인 지원 | 미구현 | Service Worker + 캐시 전략 | L (2-3주) |
| **P2** | 색상 대비 검증 | 미검증 | axe-core 자동 테스트 | M (1주) |
| **P3** | 페이지 레벨 코드 분할 | 미적용 | `React.lazy` 페이지 분할 | M (1주) |
| **P3** | Next.js Image 최적화 | 기본 `<img>` | `next/image` 전환 | M (1주) |

---

*본 문서는 소스코드 정적 분석 기반으로 작성되었습니다. 런타임 동작 및 실제 사용성 테스트 결과는 반영되지 않았습니다.*
