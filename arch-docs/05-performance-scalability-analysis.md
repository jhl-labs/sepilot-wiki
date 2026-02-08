# SEPilot Wiki - 성능 및 확장성 관점 분석 문서

## 1. 문서 개요

| 항목 | 내용 |
|------|------|
| 프로젝트 | SEPilot Wiki v0.4.0 |
| 분석 대상 | React + TypeScript + Next.js / Vite 이중 프레임워크 위키 시스템 |
| 분석 기준 | 프론트엔드 성능, 백엔드 확장성, 데이터 파이프라인, 번들 최적화 |
| 분석 일자 | 2026-02-07 |
| 분석 방법 | 코드 정적 분석 기반 예측 |

---

## 2. 프론트엔드 성능 분석

### 2.1 번들 크기 분석

#### 2.1.1 주요 대형 의존성

| 의존성 | 예상 크기 (gzip) | 로딩 전략 | 소스 파일 |
|--------|------------------|-----------|-----------|
| plotly.js ^3.3.1 | ~1,000KB | React.lazy + Suspense | `LazyPlotlyChart.tsx` |
| mermaid ^11.12.2 | ~500KB | React.lazy + Suspense | `LazyMermaidDiagram.tsx` |
| @monaco-editor/react ^4.7.0 | ~800KB | 에디터 페이지에서만 로드 | 관리자 전용 기능 |
| react-syntax-highlighter ^16.1.0 | ~150KB | optimizePackageImports 적용 | Prism ESM import 사용 |
| @tanstack/react-query ^5.0.0 | ~40KB | manualChunks `query` 분리 | 핵심 의존성 |
| react-markdown ^10.1.0 | ~30KB | manualChunks `markdown` 분리 | 핵심 의존성 |
| fuse.js ^7.1.0 | ~25KB | 검색 시 로드 | `search.ts` |
| ioredis ^5.8.2 | ~50KB | 서버 전용 | `lib/redis.ts` |
| lucide-react ^0.555.0 | 트리쉐이킹 | optimizePackageImports 적용 | 아이콘별 개별 import |
| @cp949/react-wordcloud ^1.0.1 | ~20KB | 해당 페이지에서만 로드 | 태그 통계 |

#### 2.1.2 코드 분할 전략

**Next.js 빌드 (`next.config.js`):**

```javascript
// 트리 쉐이킹 최적화 대상
experimental: {
  optimizePackageImports: [
    'lucide-react',
    '@tanstack/react-query',
    'react-syntax-highlighter',
  ],
},

// 서버 번들에서 클라이언트 전용 라이브러리 제외
webpack: (config, { isServer }) => {
  if (isServer) {
    config.externals.push('mermaid', 'plotly.js');
  }
},
```

**Lazy Loading 컴포넌트:**

- `LazyMermaidDiagram.tsx`: `React.lazy(() => import('./MermaidDiagram'))` + `MermaidSkeleton` (minHeight: 200px)
- `LazyPlotlyChart.tsx`: `React.lazy(() => import('./PlotlyChart'))` + `PlotlySkeleton` (minHeight: 250px)
- 각각 `Suspense` + `Skeleton` 폴백으로 CLS 방지

**Vite 빌드 (`vite.config.ts`) - manualChunks:**

```
vendor: react, react-dom, react-router-dom
query: @tanstack/react-query
markdown: react-markdown, react-syntax-highlighter
```

#### 2.1.3 번들 크기 평가

| 항목 | 점수 | 평가 |
|------|------|------|
| 코드 분할 전략 | 8/10 | Lazy loading + manualChunks + optimizePackageImports 적절히 구성 |
| 트리 쉐이킹 | 7/10 | lucide-react, @tanstack/react-query 최적화, plotly.js는 부분 import 미적용 |
| 대형 라이브러리 격리 | 9/10 | plotly (~3.5MB raw), mermaid (~1.5MB raw), monaco (~2.8MB raw) 모두 동적 로드 |
| 서버 번들 최적화 | 8/10 | mermaid, plotly.js 서버 측 외부화 |
| 초기 번들 크기 | 6/10 | wiki-data.json 전체 본문 포함이 주요 병목 |

**예상 초기 번들 크기 (gzip 기준):**

- JavaScript: ~180-220KB (vendor + query + 앱 코드)
- CSS: ~15-25KB
- wiki-data.json: 문서 수에 비례 (50개 문서 기준 ~200-500KB)

---

### 2.2 캐싱 전략 분석

#### 2.2.1 3중 캐시 아키텍처

```
[사용자 요청]
     |
     v
[React Query 캐시] ---- staleTime 기반 메모리 캐시 (providers.tsx)
     |                   기본: refetchOnWindowFocus: false, retry: 1
     v  (캐시 미스)
[TTLCache 인스턴스] ---- TTL 기반 인-프로세스 캐시 (api.ts)
     |                   단일 엔트리 저장 구조
     v  (캐시 미스)
[HTTP fetch + 캐시 버스팅] -- fetchWithRetry로 네트워크 요청
     |
     v
[CDN/브라우저 캐시] ---- 쿼리 문자열 기반 캐시 무효화
```

#### 2.2.2 TTLCache 구현 분석 (`api.ts`)

```typescript
class TTLCache<T> {
  private cache: CacheEntry<T> | null = null;  // 단일 엔트리만 저장
  private ttl: number;

  get(): T | null {
    if (!this.cache) return null;
    if (Date.now() - this.cache.timestamp > this.ttl) {
      this.cache = null;  // 만료 시 즉시 삭제
      return null;
    }
    return this.cache.data;
  }
}
```

**특징:**
- 단일 엔트리 저장 구조 -- 슬러그별 세분화 캐싱 불가
- `invalidate()` 메서드 존재하나 외부 호출 코드 부재 (수동 무효화 미사용)
- LRU/LFU 정책 없음 (단일 엔트리이므로 불필요)

#### 2.2.3 캐시 TTL 설정 상세

| 데이터 유형 | TTLCache TTL (`api.ts`) | React Query staleTime (`useWiki.ts`) | 캐시 버스터 전략 |
|-------------|------------------------|--------------------------------------|-----------------|
| Wiki 데이터 | 5분 (`CACHE_TTL.WIKI_DATA`) | 5분 | `getCacheBuster('static')` -- 빌드 타임 기반 |
| 가이드 데이터 | 5분 (`CACHE_TTL.GUIDE_DATA`) | 5분 | `getCacheBuster('static')` -- 빌드 타임 기반 |
| Issues | 2분 (`CACHE_TTL.ISSUES`) | 2분 | `getCacheBuster('dynamic', 2min)` -- 2분 간격 |
| AI 히스토리 | 3분 (`CACHE_TTL.AI_HISTORY`) | 5분 | `getCacheBuster('dynamic', 3min)` -- 3분 간격 |
| Actions 상태 | 1분 (`CACHE_TTL.ACTIONS_STATUS`) | 30초 + 30초 refetchInterval | `getCacheBuster('dynamic', 1min)` -- 1분 간격 |
| 검색 인덱스 | 모듈 레벨 캐시 (`searchIndexCache`) | 1분 | `Date.now()` -- 매번 새로운 키 |
| 태그 | - | 5분 | React Query만 |

#### 2.2.4 캐시 버스팅 메커니즘 (`getCacheBuster`)

```typescript
function getCacheBuster(type: 'static' | 'dynamic', intervalMs = 60000): string {
  if (type === 'static') {
    // 빌드 시간 사용 -> 같은 빌드 내 CDN 캐시 활용 가능
    return process.env.NEXT_PUBLIC_BUILD_TIME || new Date().toISOString().slice(0, 10);
  }
  // 동적 데이터: 지정된 간격으로 캐시 키 변경
  return String(Math.floor(Date.now() / intervalMs));
}
```

#### 2.2.5 캐싱 평가

| 항목 | 점수 | 평가 |
|------|------|------|
| 캐시 계층 설계 | 6/10 | TTLCache + React Query 역할 중복 |
| TTL 적절성 | 8/10 | 데이터 특성별 차별화된 TTL, APP_CONFIG에서 중앙 관리 |
| 캐시 무효화 | 6/10 | 빌드 타임/시간 기반 전략은 적절, 수동 무효화 미사용 |
| 메모리 효율성 | 5/10 | TTLCache가 전체 데이터를 메모리에 보관, 단일 엔트리 제한 |

**알려진 이슈:**

1. **TTLCache와 React Query 동일 TTL**: 둘 다 5분으로 설정되어 TTLCache가 실질적으로 불필요한 구간 발생. React Query staleTime 내에서는 TTLCache에 접근하지 않음
2. **검색 인덱스 `Date.now()` 캐시 버스터** (`search.ts` 48행): 빌드 시점에 생성되는 정적 파일임에도 매번 새로운 네트워크 요청 발생
3. **Actions 상태 TTL 불일치**: TTLCache 1분, React Query staleTime 30초. 30초마다 refetch가 발생하지만 TTLCache에서 최대 1분 동안 stale 데이터 반환 가능 (fetchActionsStatus에서 fetchWithRetry 미사용도 비일관성)

---

### 2.3 렌더링 성능 분석

#### 2.3.1 Provider 중첩 구조 (`app/providers.tsx`)

```
<SessionProvider>                    -- 1단계: NextAuth 세션
  <QueryClientProvider>              -- 2단계: React Query (staleTime 5분, retry 1)
    <ErrorProvider>                  -- 3단계: 에러 상태 관리
      <ThemeProvider>                -- 4단계: 테마 (다크/라이트)
        <ConfigProvider>             -- 5단계: 앱 설정
          <SidebarProvider>          -- 6단계: 사이드바 상태
            <ShortcutsProvider>      -- 7단계: 키보드 단축키
              <RecentPagesProvider>  -- 8단계: 최근 페이지 기록
                <BookmarksProvider>  -- 9단계: 북마크 관리
                  {children}
                  <CommandPalette /> -- 전역 명령 팔레트
                  <ToastContainer /> -- 전역 토스트 알림
                </BookmarksProvider>
```

**영향 분석:**
- 9단계 Provider 중첩은 초기 렌더링 시 각 Context의 초기화 비용 발생
- 대부분의 Provider가 `'use client'` 컴포넌트이므로 Server Components 이점 제한
- Provider 상태 변경 시 하위 트리 전체 리렌더링 위험 (특히 ThemeProvider, SidebarProvider)

**QueryClient 설정:**

```typescript
const [queryClient] = useState(() =>
  new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,  // 탭 전환 시 불필요한 요청 방지
        retry: 1,                     // 실패 시 1회만 재시도
        staleTime: 5 * 60 * 1000,    // 5분간 fresh 상태 유지
      },
    },
  })
);
```

#### 2.3.2 마크다운 렌더링 파이프라인

```
마크다운 문자열
     |
     v
[ReactMarkdown] --- remarkGfm, rehypeRaw, rehypeSanitize
     |
     +--> code 블록 --> mermaid? --> LazyMermaidDiagram (동적 로드, ~500KB)
     |               --> plotly?  --> LazyPlotlyChart (동적 로드, ~1000KB)
     |               --> 기타     --> SyntaxHighlighter (Prism, ~150KB)
     +--> img 태그   --> loading="lazy" + decoding="async" + aspect-ratio 16/9
     +--> a 태그     --> 내부 Link / 외부 링크 분기
     +--> heading    --> generateHeadingId로 앵커 생성
```

#### 2.3.3 가상 스크롤 (`VirtualList.tsx`)

```typescript
const virtualizer = useVirtualizer({
  count: items.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => estimateSize,
  overscan,                          // 기본값: 5
  getItemKey: getItemKey ? (index) => getItemKey(items[index], index) : undefined,
});
```

| 설정 항목 | 값 | 설명 |
|-----------|-----|------|
| 라이브러리 | `@tanstack/react-virtual` | 경량 가상화 라이브러리 |
| overscan | 5 | 뷰포트 밖에 미리 렌더링할 아이템 수 |
| 기본 높이 | 400px | 컨테이너 기본 높이 |
| 접근성 | role="list", aria-posinset, aria-setsize | 스크린리더 지원 |
| 위치 방식 | `transform: translateY()` | absolute 위치 + translateY |

**WindowVirtualList도 제공**: 페이지 전체 스크롤에 반응하는 윈도우 기반 가상 스크롤 변형

#### 2.3.4 디바운스 설정 (`APP_CONFIG` + `useDebounce.ts`)

| 용도 | 지연 시간 | 출처 |
|------|-----------|------|
| 검색 입력 | 300ms | `APP_CONFIG.search.debounce` |
| 사이드바 localStorage 저장 | 300ms | `APP_CONFIG.sidebar.saveDebounce` |
| 자동 저장 | 2000ms | `APP_CONFIG.autoSave.delay` |
| 콘텐츠 검증 | 500ms | `useAutoSave.ts` 내부 setTimeout |

#### 2.3.5 이미지 최적화

- `loading="lazy"` + `decoding="async"`: 네이티브 지연 로딩
- `aspect-ratio: 16/9`: 크기 미지정 이미지의 CLS 방지
- `onError` 핸들러: 로드 실패 시 대체 UI 표시
- Next.js 정적 빌드 시 `images.unoptimized = true` (Image 최적화 비활성화)

#### 2.3.6 렌더링 성능 평가

| 항목 | 점수 | 평가 |
|------|------|------|
| 초기 렌더링 | 6/10 | 9단계 Provider 중첩, wiki-data.json 전체 본문 포함이 병목 |
| 목록 렌더링 | 8/10 | VirtualList + WindowVirtualList로 대량 아이템 효율 처리 |
| 마크다운 렌더링 | 7/10 | 대형 라이브러리 lazy 로드, 대형 문서 파싱 비용 존재 |
| 사용자 입력 응답 | 9/10 | 적절한 디바운스 + APP_CONFIG 중앙 관리 |
| 이미지 처리 | 7/10 | native lazy loading 적용, Next.js Image 미사용 |

---

### 2.4 Core Web Vitals 예측 분석

#### 2.4.1 LCP (Largest Contentful Paint)

**예측값: 1.8-3.2초** (네트워크 환경에 따라 변동)

| 요인 | 영향 | 상세 |
|------|------|------|
| wiki-data.json 로딩 | 높음 | 전체 문서 본문 포함, 50개 기준 ~200-500KB |
| JavaScript 번들 파싱 | 중간 | ~200KB gzip, 코드 분할로 완화 |
| fetchWithRetry 오버헤드 | 낮음 | 성공 시 추가 비용 없음, 실패 시 지수 백오프 지연 |
| Server Components | 긍정적 | Next.js standalone 빌드 시 SSR 활용 |

#### 2.4.2 INP (Interaction to Next Paint)

**예측값: 50-150ms** (양호)

| 요인 | 영향 | 상세 |
|------|------|------|
| 디바운스 적용 | 긍정적 | 검색 300ms, 자동저장 2000ms |
| React Query 캐시 | 긍정적 | staleTime 5분 내 즉시 응답 |
| SyntaxHighlighter 파싱 | 부정적 | Prism 하이라이팅 메인 스레드 동기 실행 |
| Fuse.js 검색 | 부정적 | 전체 content 포함 시 대량 문서에서 지연 |

#### 2.4.3 CLS (Cumulative Layout Shift)

**예측값: 0.05-0.15** (개선 필요)

| 요인 | 영향 | 상세 |
|------|------|------|
| Skeleton UI | 긍정적 | Sidebar, 검색 결과에 스켈레톤 제공 |
| Lazy 컴포넌트 폴백 | 긍정적 | Mermaid minHeight 200px, Plotly minHeight 250px |
| 이미지 aspect-ratio | 긍정적 | 16/9 기본값으로 CLS 방지 |
| 동적 사이드바 | 부정적 | 모바일 오버레이, 데스크톱 리사이즈 가능 |

#### 2.4.4 Core Web Vitals 종합 점수

| 지표 | 예측값 | 등급 | 목표 |
|------|--------|------|------|
| LCP | 1.8-3.2s | 보통~주의 | < 2.5s |
| INP | 50-150ms | 양호 | < 200ms |
| CLS | 0.05-0.15 | 양호~주의 | < 0.1 |

---

## 3. 백엔드 성능 분석

### 3.1 네트워크 복원력 (`retry.ts`)

#### 3.1.1 지수 백오프 + 지터 알고리즘

```typescript
function calculateDelay(attempt, initialDelay, maxDelay, backoffMultiplier): number {
  const exponentialDelay = initialDelay * Math.pow(backoffMultiplier, attempt - 1);
  const boundedDelay = Math.min(exponentialDelay, maxDelay);
  const jitter = 0.5 + Math.random();  // 0.5x ~ 1.5x 범위
  return Math.floor(boundedDelay * jitter);
}
```

**기본 설정:**

| 항목 | 값 | 설명 |
|------|-----|------|
| maxRetries | 3 | 최대 재시도 횟수 |
| initialDelay | 1000ms | 초기 대기 시간 |
| maxDelay | 30000ms | 최대 대기 시간 |
| backoffMultiplier | 2 | 지수 배율 |
| 지터 범위 | 0.5x ~ 1.5x | Thundering Herd 방지 |

**재시도 대기 시간 예측 (지터 중앙값 기준):**

| 시도 | 기본 지연 | 지터 적용 범위 |
|------|-----------|---------------|
| 1차 | 1000ms | 500-1500ms |
| 2차 | 2000ms | 1000-3000ms |
| 3차 | 4000ms | 2000-6000ms |

#### 3.1.2 Rate Limiting 대응 (`fetchWithRetry`)

```typescript
// 429 응답 시 Retry-After 헤더 확인
if (response.status === 429) {
  const retryAfterMs = getRetryAfterMs(response);
  if (retryAfterMs) {
    rateLimitDelay = Math.min(retryAfterMs, 60000);  // 최대 60초
  }
}
```

- Retry-After 헤더를 초 단위 및 HTTP-date 형식 모두 지원
- 최대 대기 시간 60초로 제한
- GitHub API Rate Limiting (429) 대응에 특화

#### 3.1.3 API 호출별 재시도 설정 (`api.ts`)

| API 호출 | maxRetries | initialDelay | fetchWithRetry 사용 |
|----------|------------|--------------|---------------------|
| loadWikiData | 2 | 500ms | O |
| loadGuideData | 2 | 500ms | O |
| loadIssuesData | 2 | 500ms | O |
| loadAIHistory | 2 | 500ms | O |
| fetchActionsStatus | - | - | X (일반 fetch) |

**주목할 점**: `fetchActionsStatus`만 일반 `fetch`를 사용하며, 실패 시 `null` 반환으로 graceful degradation 처리. 이는 Actions 상태가 비필수 데이터임을 반영.

#### 3.1.4 네트워크 복원력 평가

| 항목 | 점수 | 평가 |
|------|------|------|
| 재시도 전략 | 9/10 | 지수 백오프 + 지터, Rate Limiting 대응 |
| 에러 분류 | 8/10 | recoverable 플래그로 재시도 가능 여부 구분 |
| Graceful Degradation | 8/10 | Actions 상태 등 비필수 데이터 null 반환 |
| 에러 로깅 | 7/10 | createLogger 기반, 구조화된 로깅 |

### 3.2 분산 스케줄러 (`lib/scheduler/`)

#### 3.2.1 스케줄러 아키텍처

```
[Next.js 서버 시작]
     |
     v
[instrumentation.ts] -- register() 호출 (NEXT_RUNTIME === 'nodejs')
     |
     v  (3초 지연 후)
[initializeScheduler()]
     |
     +--> shouldEnableScheduler() 확인 (BUILD_MODE, SCHEDULER_ENABLED)
     +--> connectRedis() (선택적)
     +--> acquireLeadership() (Redis SETNX)
     +--> 작업 등록 및 시작
```

#### 3.2.2 등록된 스케줄 작업

| 작업 | 스케줄 | 설명 |
|------|--------|------|
| CollectStatusJob | `collect-status` | 시스템 상태 수집 |
| SyncIssuesJob | `*/10 * * * *` (10분) | GitHub Issue 동기화 |
| ValidateLinksJob | `validate-links` | 문서 링크 유효성 검사 |
| MaintainTreeJob | `maintain-tree` | 트리 구조 유지보수 |

#### 3.2.3 리더 선출 메커니즘 (`leader-election.ts`)

```
[Redis SETNX 기반 리더 선출]
     |
     +--> 성공: Heartbeat 시작 (10초 간격, TTL 30초)
     |         --> Lua 스크립트로 원자적 TTL 갱신
     |         --> 실패 시 지수 백오프로 재획득 (최대 60초)
     |
     +--> 실패: Leader Watch 시작 (10초 간격 폴링)
               --> 리더 부재 감지 시 acquireLeadership() 호출
```

**Redis 키 설정:**

| 키 | 용도 | TTL |
|-----|------|-----|
| `sepilot-wiki:scheduler:leader` | 리더 ID 저장 | 30초 (Heartbeat 갱신) |
| `sepilot-wiki:scheduler:history` | 실행 이력 | 최대 100건 (LTRIM) |
| `sepilot-wiki:scheduler:job:{name}:lastRun` | 작업별 마지막 실행 | 7일 |

**Redis 미사용 시 폴백:**
- `isRedisEnabled() === false`이면 `isLeader()`가 항상 `true` 반환
- 단일 인스턴스 모드로 자동 전환
- **주의**: 다중 Pod 환경에서 Redis 없이 배포하면 모든 Pod에서 스케줄러 중복 실행

#### 3.2.4 작업 재시도 (`BaseJob.executeWithRetry`)

```typescript
protected async executeWithRetry<T>(fn, options = {}) {
  const { maxRetries = 3, delayMs = 1000, backoff = true } = options;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try { return await fn(); }
    catch (error) {
      if (attempt === maxRetries) throw error;
      const delay = backoff ? delayMs * Math.pow(2, attempt - 1) : delayMs;
      await this.sleep(delay);
    }
  }
}
```

- 프론트엔드 `withRetry`와 별도의 구현 (지터 없음)
- BaseJob 상속으로 모든 스케줄 작업에 재시도 기능 제공

#### 3.2.5 스케줄러 성능 평가

| 항목 | 점수 | 평가 |
|------|------|------|
| 리더 선출 | 8/10 | Redis SETNX + Lua 스크립트 원자적 처리 |
| Heartbeat | 8/10 | 10초 간격, TTL 30초, 지수 백오프 복구 |
| Graceful Shutdown | 9/10 | SIGTERM/SIGINT 처리, 리더십 포기 + Redis 연결 종료 |
| 폴백 전략 | 6/10 | Redis 없이 동작하나 다중 인스턴스 시 중복 실행 위험 |
| 작업 모니터링 | 7/10 | Redis 기반 실행 이력, API 상태 조회 지원 |

---

## 4. 데이터 파이프라인 분석

### 4.1 빌드 시점 데이터 생성

#### 4.1.1 파이프라인 흐름

```
[빌드 트리거]
     |
     v
[build-wiki-data.js]
     +--> wiki/ 폴더 재귀 스캔 (findMarkdownFiles)
     +--> EXTRA_WIKI_DIRS 환경변수로 추가 소스 지원
     +--> 프론트매터 파싱 (parseMarkdownWithFrontmatter)
     +--> Git 히스토리 수집 (git log --follow, 최대 20건)
     +--> 각 커밋 변경 통계 (git show --stat)
     +--> 트리 구조 생성 (buildTreeStructure, 중첩 카테고리 지원)
     +--> public/wiki-data.json 출력
     +--> public/guide-data.json 출력
     |
     v
[build-search-index.js]
     +--> wiki-data.json + guide-data.json 로드
     +--> extractPlainText()로 마크다운 태그 제거
     +--> createExcerpt() (처음 200자)
     +--> public/search-index.json 출력 (전체 content 포함)
     +--> public/search-index.xml 출력
```

#### 4.1.2 빌드 성능 병목

| 단계 | 비용 | 상세 |
|------|------|------|
| `findMarkdownFiles` | O(n) | 재귀 디렉토리 스캔, n = 파일 수 |
| `getGitHistory` | O(n * 20) | 파일당 최대 20개 커밋, `execSync` 동기 호출 |
| `git show --stat` | O(n * 20) | 각 커밋의 변경 통계, 추가 `execSync` 호출 |
| `buildTreeStructure` | O(n log n) | 중첩 카테고리 정렬 |
| JSON 직렬화 | O(total_size) | `JSON.stringify(data, null, 2)` 포맷팅 포함 |

**주요 이슈**: `getGitHistory`에서 파일당 최대 21번의 `execSync` 호출 (1 git log + 20 git show). 문서 100개 기준 최대 2,100번의 프로세스 생성.

#### 4.1.3 검색 인덱스 구조

```json
// search-index.json 항목 구조
{
  "title": "문서 제목",
  "slug": "category/document-name",
  "content": "전체 평문 텍스트 (마크다운 태그 제거)",  // <- 병목
  "excerpt": "처음 200자...",
  "tags": ["tag1", "tag2"],
  "lastModified": "2026-02-07T...",
  "author": "author-name"
}
```

**문제점**: `content` 필드에 전체 본문이 포함되어 인덱스 크기가 wiki-data.json에 근접

#### 4.1.4 데이터 파이프라인 평가

| 항목 | 점수 | 평가 |
|------|------|------|
| 파이프라인 설계 | 7/10 | 빌드 시점 사전 처리로 런타임 부하 제거 |
| Git 히스토리 수집 | 4/10 | execSync 동기 호출 다수, 병렬화 미적용 |
| 검색 인덱스 효율 | 4/10 | 전체 content 포함으로 인덱스 비대화 |
| 확장성 | 5/10 | 문서 수 증가 시 빌드 시간 선형 증가 |
| 부가 출력 | 6/10 | XML + JSON 이중 생성 (XML은 사용처 불명확) |

---

## 5. 검색 성능 분석

### 5.1 검색 아키텍처

```
[사용자 입력] -- useDebounce(300ms)
     |
     v
[useSearch / useSearchWithFilter] -- React Query (staleTime 1분)
     |                               enabled: query.length >= 2
     v
[searchWiki(query, filter)]
     |
     v
[loadSearchIndex()] -- 최초 호출 시 fetch, 이후 모듈 캐시
     |
     +--> [Fuse.js 인스턴스 초기화] (threshold: 0.4)
     |
     v
[fuse.search(query)] -- 가중치 기반 퍼지 검색
     |
     v
[applyFilters(results, filter)] -- tags, dateFrom, dateTo, author
     |
     v
[결과 변환] -- content -> excerpt로 교체하여 반환
```

### 5.2 Fuse.js 설정 분석

```typescript
fuseInstance = new Fuse(searchIndexCache, {
  includeScore: true,
  threshold: 0.4,      // 40% 이내의 차이만 허용
  keys: [
    { name: 'title',   weight: 1.0 },   // 제목 최우선
    { name: 'tags',    weight: 0.8 },   // 태그 높은 가중치
    { name: 'excerpt', weight: 0.5 },   // 요약 중간
    { name: 'content', weight: 0.3 },   // 전체 본문 낮은 가중치
  ]
});
```

**성능 영향**: `content` 키가 weight 0.3으로 포함되어 전체 본문 대상 검색. 문서 수 증가 시 Fuse.js의 시간 복잡도 O(n * m) (n = 문서 수, m = 검색 키 수 * 평균 토큰 수)에 직접적 영향.

### 5.3 검색 성능 예측

| 문서 수 | 인덱스 크기 예상 | Fuse.js 초기화 | 검색 응답 시간 | 사용 가능 여부 |
|---------|-----------------|---------------|---------------|---------------|
| 10개 | ~50KB | < 10ms | < 5ms | 양호 |
| 50개 | ~250KB | ~30ms | ~15ms | 양호 |
| 200개 | ~1MB | ~100ms | ~50ms | 경계 |
| 500개 | ~2.5MB | ~300ms | ~150ms | 주의 |
| 1000개 | ~5MB | ~800ms | ~400ms | 사용 불가 |

### 5.4 검색 성능 평가

| 항목 | 점수 | 평가 |
|------|------|------|
| 검색 정확도 | 8/10 | 가중치 기반 퍼지 검색 + 다중 필터 지원 |
| 검색 속도 | 6/10 | 전체 content 포함으로 인덱스 비대화 |
| 메모리 사용 | 5/10 | 전체 본문이 클라이언트 메모리에 상주 |
| 초기 로드 | 4/10 | 별도 네트워크 요청 필요 + `Date.now()` 캐시 버스터 |
| 필터링 | 8/10 | 태그, 날짜 범위, 저자 필터 조합 지원 |

**핵심 병목:**

1. `search-index.json`에 전체 `content` 포함 -- Fuse.js 초기화와 검색 모두에 영향
2. `Date.now()` 캐시 버스터 -- 정적 파일인데도 브라우저 캐시 미활용
3. 메인 스레드 동기 실행 -- UI 블로킹 위험 (Web Worker 미사용)

---

## 6. 서버 확장성 분석

### 6.1 Kubernetes 배포 아키텍처

```
[Ingress (nginx)]
      |
      v
[Service (ClusterIP:80 -> targetPort:3000)]
      |
      v
[Deployment (Pod x N)] --- HPA 자동 스케일링
      |
      +--> Next.js standalone 서버 (:3000)
      |    +--> /api/health (헬스체크)
      |    +--> /api/admin/* (관리자 기능)
      |
      +--> 스케줄러 (node-cron 기반)
      |    +--> Redis 리더 선출로 단일 실행 보장
      |
      +--> Redis 연결 (선택적)
           +--> 리더 선출, 실행 이력, 작업 상태
```

### 6.2 Docker 이미지 최적화 (`docker/Dockerfile`)

```
Stage 1: deps     (oven/bun:1-alpine) -- bun install --frozen-lockfile
Stage 2: builder  (oven/bun:1-alpine) -- build:wiki + build:search + next build
Stage 3: runner   (node:20-alpine)    -- standalone 출력만 복사
```

**최적화 포인트:**
- 3단계 멀티스테이지 빌드로 최종 이미지 크기 최소화
- standalone 출력 사용으로 불필요한 node_modules 제거
- `NEXT_TELEMETRY_DISABLED=1` 설정
- non-root 사용자 (nextjs:1001) 실행
- HEALTHCHECK 내장 (30초 간격, wget 기반)

### 6.3 수평 자동 스케일링 (HPA)

| 설정 | 기본값 (`values.yaml`) | 프로덕션 권장 |
|------|----------------------|-------------|
| autoscaling.enabled | false | true |
| minReplicas | 1 | 2 |
| maxReplicas | 5 | 10 |
| CPU 목표 | 80% | 70% |
| 메모리 목표 | 80% | 80% |

**리소스 설정:**

| 항목 | 기본 요청 | 기본 제한 | 프로덕션 권장 요청 | 프로덕션 권장 제한 |
|------|-----------|-----------|-------------------|------------------|
| CPU | 100m | 500m | 200m | 1000m |
| 메모리 | 256Mi | 512Mi | 512Mi | 1Gi |

### 6.4 보안 컨텍스트

```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1001
  runAsGroup: 1001
  allowPrivilegeEscalation: false
  capabilities:
    drop: [ALL]
  readOnlyRootFilesystem: true
  seccompProfile:
    type: RuntimeDefault
```

### 6.5 헬스체크 설정

| 프로브 | 경로 | 초기 지연 | 주기 | 타임아웃 | 실패 임계 |
|--------|------|-----------|------|----------|-----------|
| Liveness | /api/health | 10초 | 30초 | 10초 | 3회 |
| Readiness | /api/health | 5초 | 10초 | 5초 | 3회 |

### 6.6 확장성 평가

| 항목 | 점수 | 평가 |
|------|------|------|
| 수평 스케일링 | 8/10 | HPA + CPU/메모리 기반, 기본값 적절 |
| Docker 이미지 | 9/10 | 3단계 멀티스테이지, standalone 출력 |
| 리더 선출 | 8/10 | Redis SETNX + Lua, Heartbeat + Watch |
| 보안 설정 | 9/10 | readOnlyRootFS, 비루트, seccomp, capabilities drop |
| Graceful Shutdown | 9/10 | SIGTERM/SIGINT, 리더십 포기, Redis 연결 종료 |
| 모니터링 | 6/10 | 헬스체크 존재, 메트릭 수집(Prometheus) 미구현 |

---

## 7. 병목 지점 식별

### 7.1 심각도 높음 (Critical)

#### B1: wiki-data.json 전체 본문 포함

| 항목 | 상세 |
|------|------|
| 영향 | 초기 로드 시간, LCP, 메모리 사용량 |
| 현상 | `build-wiki-data.js`에서 모든 문서의 `content` + `history` 필드를 하나의 JSON에 포함 |
| 규모 예측 | 문서 100개, 평균 5KB/문서 = ~500KB JSON (gzip ~150KB) |
| 근본 원인 | 목록 조회와 상세 조회가 동일한 데이터 소스 사용 |
| 개선 방향 | 목록용 데이터(title, slug, tags, excerpt)와 상세 데이터(content, history)를 분리 |

#### B2: 검색 인덱스에 전체 content 포함

| 항목 | 상세 |
|------|------|
| 영향 | 인덱스 다운로드 시간, Fuse.js 초기화/검색 시간, 클라이언트 메모리 |
| 현상 | `build-search-index.js`에서 `extractPlainText(content)` 결과를 전체 저장 |
| 규모 예측 | wiki-data.json과 유사한 크기 |
| 근본 원인 | Fuse.js keys에 content (weight 0.3) 포함 |
| 개선 방향 | content를 excerpt(200자)로 대체, 또는 서버 사이드 전문 검색 도입 |

#### B3: Git 히스토리 수집 동기 실행

| 항목 | 상세 |
|------|------|
| 영향 | 빌드 시간 |
| 현상 | 파일당 최대 21번 `execSync` 호출 (1 git log + 20 git show --stat) |
| 규모 예측 | 문서 100개 기준 최대 2,100번 프로세스 생성 |
| 근본 원인 | `execSync`로 순차 실행, 병렬화 미적용 |
| 개선 방향 | `execFile` 비동기 호출 + `Promise.allSettled` 병렬 처리 |

### 7.2 심각도 중간 (Medium)

#### B4: React Query + TTLCache 이중 캐싱

| 항목 | 상세 |
|------|------|
| 영향 | 코드 복잡도, 디버깅 어려움 |
| 현상 | 동일 TTL(5분)로 두 계층이 같은 데이터를 이중 캐싱 |
| 개선 방향 | TTLCache를 제거하고 React Query 단독 사용, 또는 TTLCache를 서버 전용으로 제한 |

#### B5: SyntaxHighlighter 메인 스레드 실행

| 항목 | 상세 |
|------|------|
| 영향 | 대형 코드 블록에서 INP 증가 |
| 현상 | Prism 하이라이팅이 메인 스레드에서 동기적으로 실행 |
| 개선 방향 | shiki 등 서버 렌더링 가능 하이라이터로 교체, 또는 Web Worker 오프로딩 |

#### B6: Provider 중첩 과다

| 항목 | 상세 |
|------|------|
| 영향 | 초기 렌더링 비용, Context 변경 시 리렌더링 범위 |
| 현상 | 9단계 Provider 중첩, 모두 'use client' 컴포넌트 |
| 개선 방향 | 관련 Provider 통합 (예: Sidebar + RecentPages + Bookmarks), Context 분리 최적화 |

#### B7: 검색 인덱스 캐시 버스터

| 항목 | 상세 |
|------|------|
| 영향 | 검색 인덱스의 브라우저 캐시 미활용 |
| 현상 | `search.ts` 48행에서 `Date.now()` 기반 캐시 버스터 사용 |
| 개선 방향 | `getCacheBuster('static')` 방식으로 교체 (빌드 타임 기반) |

### 7.3 심각도 낮음 (Low)

#### B8: Fuse.js 메인 스레드 실행

| 항목 | 상세 |
|------|------|
| 영향 | 문서 수 증가 시 검색 응답 지연 |
| 개선 방향 | Web Worker로 분리 |

#### B9: Actions 상태 fetch 비일관성

| 항목 | 상세 |
|------|------|
| 영향 | 코드 일관성, 잠재적 에러 처리 누락 |
| 현상 | 다른 API 호출은 fetchWithRetry 사용, Actions만 일반 fetch |
| 개선 방향 | fetchWithRetry 통일 또는 의도적 차이를 코드 주석으로 명시 |

#### B10: XML 검색 인덱스 이중 생성

| 항목 | 상세 |
|------|------|
| 영향 | 빌드 시간 미미한 증가, 불필요한 파일 생성 |
| 현상 | `build-search-index.js`에서 JSON + XML 모두 생성, XML 사용처 불명확 |
| 개선 방향 | XML 생성 제거 또는 sitemap용으로 활용 |

---

## 8. 확장 한계점 분석

### 8.1 문서 규모별 한계

| 규모 | 문서 수 | wiki-data.json | 검색 인덱스 | 빌드 시간 예측 | 예상 문제 |
|------|---------|---------------|-------------|---------------|-----------|
| 소규모 | < 50 | < 250KB | < 250KB | < 30초 | 문제 없음 |
| 중규모 | 50-200 | 250KB-1MB | 250KB-1MB | 1-3분 | LCP 2.5초 초과 가능 |
| 대규모 | 200-500 | 1-2.5MB | 1-2.5MB | 3-10분 | 초기 로드 심각, Fuse.js 초기화 지연 |
| 초대규모 | 500+ | 2.5MB+ | 2.5MB+ | 10분+ | 사용 불가 수준, 아키텍처 변경 필요 |

### 8.2 동시 사용자 한계 (standalone 모드)

| Pod 수 | 예상 동시 접속 | 요구 사항 | 주의 사항 |
|--------|---------------|-----------|-----------|
| 1 | ~100 | Redis 선택적 | 단일 장애점, 스케줄러 중단 시 복구 지연 |
| 2 | ~200 | Redis 필수 | 리더 선출 필요, Anti-Affinity 권장 |
| 5 | ~500 | Redis 필수 | 리더 전환 지연 ~10초 (leaderWatch 간격) |
| 10 | ~1000 | Redis 클러스터 권장 | 네트워크 대역폭 주의, Redis 가용성 중요 |

### 8.3 기능별 확장 한계

| 기능 | 현재 한계 | 근본 원인 | 해결 방향 |
|------|-----------|-----------|-----------|
| 검색 | ~500 문서 | 클라이언트 사이드 전문 검색 (Fuse.js) | Meilisearch, Elasticsearch 도입 |
| 문서 목록 | ~200 문서 | 전체 데이터 단일 JSON | 페이지네이션 API + 개별 파일 분리 |
| 에디터 | 1명 동시 편집 | localStorage 기반 드래프트 | CRDT + WebSocket 실시간 협업 |
| 리비전 히스토리 | 빌드 시 수집 | `execSync` 동기 호출 | API 기반 실시간 조회 |
| 스케줄러 | Redis 의존 | 단일 Redis 노드 | Redis Sentinel/Cluster |

---

## 9. 최적화 로드맵

### Phase 1: 즉시 적용 가능 (1-2주)

| 우선순위 | 작업 | 예상 효과 | 난이도 | 관련 병목 |
|----------|------|-----------|--------|-----------|
| P0 | wiki-data.json에서 content 필드 분리 | LCP 30-50% 개선, 초기 로드 크기 60-80% 감소 | 중 | B1 |
| P0 | search-index.json의 content를 excerpt로 교체 | 인덱스 크기 60-80% 감소 | 하 | B2 |
| P1 | 검색 인덱스 캐시 버스터를 `getCacheBuster('static')`으로 변경 | 불필요한 네트워크 요청 제거 | 하 | B7 |
| P1 | TTLCache와 React Query 역할 정리 | 코드 복잡도 감소, 캐시 동작 예측성 향상 | 하 | B4 |
| P1 | Actions 상태 fetch 일관성 확보 | fetchWithRetry 통일 또는 의도 문서화 | 하 | B9 |

### Phase 2: 단기 최적화 (1-2개월)

| 우선순위 | 작업 | 예상 효과 | 난이도 | 관련 병목 |
|----------|------|-----------|--------|-----------|
| P1 | 문서 상세 데이터 개별 파일 분리 (`/data/pages/{slug}.json`) | 초기 로드 80% 감소, 개별 문서 캐싱 가능 | 중 | B1 |
| P1 | Fuse.js를 Web Worker로 이동 | INP 개선, 대규모 문서에서 UI 블로킹 방지 | 중 | B8 |
| P1 | Git 히스토리 수집 비동기화 (execSync -> exec + Promise.allSettled) | 빌드 시간 50-70% 단축 | 중 | B3 |
| P2 | Provider 통합/최적화 | 초기 렌더링 비용 감소, Context 리렌더링 범위 축소 | 중 | B6 |
| P2 | Next.js Image 컴포넌트 적용 (standalone 모드) | 이미지 최적화, LCP 개선 | 중 | - |

### Phase 3: 중기 아키텍처 개선 (3-6개월)

| 우선순위 | 작업 | 예상 효과 | 난이도 | 관련 병목 |
|----------|------|-----------|--------|-----------|
| P1 | 서버 사이드 검색 API 도입 (Meilisearch/Elasticsearch) | 대규모 문서 검색 성능 해결, 클라이언트 메모리 절약 | 상 | B2, B8 |
| P2 | ISR (Incremental Static Regeneration) 적용 | 빌드 없이 문서 갱신 | 중 | - |
| P2 | Prometheus 메트릭 + Grafana 대시보드 | 성능 모니터링, HPA 고도화 | 중 | - |
| P2 | 코드 하이라이터를 shiki로 교체 | 번들 크기 감소, 서버 렌더링 가능 | 중 | B5 |
| P3 | Edge Runtime 활용 (캐시 레이어) | 전역 응답 시간 개선 | 중 | - |

### Phase 4: 장기 확장 (6개월+)

| 우선순위 | 작업 | 예상 효과 | 난이도 |
|----------|------|-----------|--------|
| P2 | CMS 백엔드 도입 (headless CMS 또는 자체 API) | 파일 기반 한계 극복 |상 |
| P2 | Redis Sentinel/Cluster 지원 | 스케줄러 고가용성 | 중 |
| P3 | WebSocket 기반 실시간 협업 편집 | 다중 사용자 동시 편집 | 상 |
| P3 | CDN 기반 정적 자산 최적화 | 전역 성능 개선 | 중 |

---

## 10. 벤치마크 예측값

### 10.1 현재 상태 (문서 50개 기준)

| 지표 | 3G | 4G | Wi-Fi |
|------|-----|-----|-------|
| FCP | 3.5s | 1.5s | 0.8s |
| LCP | 5.0s | 2.5s | 1.5s |
| TTI | 6.0s | 3.0s | 1.8s |
| Total Blocking Time | 200ms | 150ms | 100ms |
| Speed Index | 4.5s | 2.0s | 1.2s |

### 10.2 Phase 1 완료 후 예측 (content 분리)

| 지표 | 3G | 4G | Wi-Fi |
|------|-----|-----|-------|
| FCP | 2.5s | 1.2s | 0.6s |
| LCP | 3.5s | 1.8s | 1.0s |
| TTI | 4.0s | 2.0s | 1.2s |
| Total Blocking Time | 150ms | 100ms | 60ms |
| Speed Index | 3.0s | 1.5s | 0.8s |

### 10.3 Phase 2 완료 후 예측 (개별 파일 분리 + Web Worker)

| 지표 | 3G | 4G | Wi-Fi |
|------|-----|-----|-------|
| FCP | 2.0s | 0.8s | 0.4s |
| LCP | 2.5s | 1.2s | 0.7s |
| TTI | 2.8s | 1.5s | 0.8s |
| Total Blocking Time | 80ms | 50ms | 30ms |
| Speed Index | 2.2s | 1.0s | 0.5s |

### 10.4 서버 성능 예측 (standalone 모드)

| 지표 | 단일 Pod | 2 Pod | 5 Pod |
|------|----------|-------|-------|
| 초당 요청 처리 | ~200 RPS | ~400 RPS | ~1000 RPS |
| 평균 응답 시간 | 50ms | 45ms | 40ms |
| P95 응답 시간 | 200ms | 150ms | 100ms |
| P99 응답 시간 | 500ms | 400ms | 300ms |
| 메모리 사용 | ~300MB | ~300MB/pod | ~300MB/pod |

### 10.5 빌드 시간 예측

| 문서 수 | build:wiki | build:search | next build | 총 빌드 시간 |
|---------|------------|-------------|------------|-------------|
| 10 | ~5초 | ~1초 | ~30초 | ~40초 |
| 50 | ~20초 | ~3초 | ~35초 | ~60초 |
| 100 | ~60초 | ~5초 | ~40초 | ~2분 |
| 500 | ~5분 | ~10초 | ~50초 | ~7분 |

---

## 11. 종합 평가

### 전체 성능 점수: 7.0/10

| 영역 | 점수 | 요약 |
|------|------|------|
| 번들 최적화 | 7.5/10 | 코드 분할 우수, 대형 라이브러리 격리 적절, 초기 데이터 로딩이 병목 |
| 캐싱 전략 | 6.0/10 | 3중 캐시 구축, TTLCache/React Query 역할 중복, 캐시 버스팅 비효율 존재 |
| 렌더링 성능 | 7.0/10 | 가상 스크롤, 디바운스, Lazy Loading 적절, Provider 중첩 과다 |
| 검색 성능 | 5.5/10 | 소규모에서 우수, content 포함으로 확장 시 한계 명확, 캐시 미활용 |
| 데이터 파이프라인 | 5.5/10 | 사전 빌드 전략 적절, Git 히스토리 동기 수집과 인덱스 비대화가 병목 |
| 네트워크 복원력 | 8.5/10 | 지수 백오프 + 지터, Rate Limiting 대응, Graceful Degradation |
| 서버 확장성 | 8.0/10 | HPA, Redis 리더 선출, Graceful Shutdown, Docker 멀티스테이지 |
| 보안 | 8.5/10 | readOnlyRootFS, 비루트 실행, seccomp, capabilities drop |

### 핵심 개선 권고사항 (우선순위순)

1. **wiki-data.json 분리** (최우선): 목록 데이터와 상세 데이터 분리로 초기 로드 대폭 개선. 현재 모든 문서의 content + history가 단일 JSON에 포함되어 LCP와 메모리 사용에 직접적 영향
2. **검색 인덱스 경량화**: content 필드를 excerpt(200자)로 대체하여 인덱스 크기 60-80% 축소. Fuse.js keys에서 content 제거 또는 weight 조정
3. **캐시 전략 정리**: TTLCache와 React Query의 역할을 명확히 분리하거나 TTLCache 제거. 검색 인덱스의 `Date.now()` 캐시 버스터를 빌드 타임 기반으로 교체
4. **빌드 파이프라인 최적화**: `execSync`를 비동기 `exec`로 전환, 파일별 Git 히스토리 수집 병렬화
5. **검색 아키텍처 전환**: 문서 200개 이상 시 서버 사이드 검색(Meilisearch/Elasticsearch) 도입 필수
6. **모니터링 강화**: Prometheus 메트릭 수집, 실시간 성능 대시보드 구축으로 HPA 정책 고도화

---

*분석 기준일: 2026-02-07*
*분석 대상: SEPilot Wiki v0.4.0*
*분석 방법: 코드 정적 분석 기반 예측*
*주요 분석 파일: `api.ts`, `search.ts`, `useWiki.ts`, `retry.ts`, `VirtualList.tsx`, `LazyMermaidDiagram.tsx`, `LazyPlotlyChart.tsx`, `build-wiki-data.js`, `build-search-index.js`, `next.config.js`, `providers.tsx`, `scheduler-manager.ts`, `leader-election.ts`, `values.yaml`*
