# SEPilot Wiki - 개발자 경험(DX) 분석 보고서

> **분석 일자**: 2026-02-07
> **분석 대상**: sepilot-wiki v0.4.0
> **분석 범위**: 전체 프로젝트 (src/ 74파일, app/ 35파일, lib/ 17파일, scripts/ 24파일, e2e/ 5파일)

---

## 목차

1. [DX 성숙도 모델 개요](#1-dx-성숙도-모델-개요)
2. [온보딩 경험](#2-온보딩-경험)
3. [코드 품질 도구](#3-코드-품질-도구)
4. [테스트 인프라](#4-테스트-인프라)
5. [코드 구조 및 일관성](#5-코드-구조-및-일관성)
6. [타입 시스템](#6-타입-시스템)
7. [CI/CD 파이프라인](#7-cicd-파이프라인)
8. [AI 개발 지원](#8-ai-개발-지원)
9. [Docker/Kubernetes 개발 경험](#9-dockerkubernetes-개발-경험)
10. [개발 워크플로우](#10-개발-워크플로우)
11. [종합 평가](#11-종합-평가)
12. [개선 로드맵](#12-개선-로드맵)

---

## 1. DX 성숙도 모델 개요

본 보고서는 5단계 DX 성숙도 모델을 기반으로 각 영역을 평가한다.

| Level | 이름 | 설명 |
|-------|------|------|
| **Level 1** | 초기(Initial) | 도구/프로세스 부재, 개인 의존적 |
| **Level 2** | 관리(Managed) | 기본 도구 도입, 문서화 시작 |
| **Level 3** | 정의(Defined) | 표준화된 프로세스, 자동화 부분 적용 |
| **Level 4** | 측정(Measured) | 메트릭 기반 관리, 지속적 모니터링 |
| **Level 5** | 최적화(Optimized) | 지속적 개선, 업계 최고 수준 |

### 평가 기준

각 영역은 10점 만점으로 평가하며, 다음 기준을 적용한다:

- **1-2점**: Level 1 (초기) - 기본 기능 부재 또는 매우 초보적
- **3-4점**: Level 2 (관리) - 기본 도구 존재하나 불완전
- **5-6점**: Level 3 (정의) - 표준화 진행 중, 자동화 부분 적용
- **7-8점**: Level 4 (측정) - 체계적 관리, 메트릭 활용
- **9-10점**: Level 5 (최적화) - 업계 모범 사례 수준

---

## 2. 온보딩 경험

### 점수: 7/10 (Level 4 - 측정)

### 2.1 문서화 현황

| 문서 | 대상 | 내용 | 평가 |
|------|------|------|------|
| `README.md` | 전체 개발자 | 프로젝트 개요, 기능 목록, 기술 스택, 구조, 실행 방법 | 충실 |
| `CONTRIBUTING.md` | 기여자 | 개발 환경 설정, 스크립트, 코드 스타일, 커밋 규칙, 테스트 | 충실 |
| `CLAUDE.md` | Claude AI | 프로젝트 지침, 코드 규칙, 보안 규칙, Git 규칙 | 충실 |
| `GEMINI.md` | Gemini AI | 기술 스택, 핵심 원칙, 코드 컨벤션, 워크플로우 | 충실 |
| `SECURITY.md` | 보안 관련 | 보안 정책 | 존재 |
| `CHANGELOG.md` | 전체 | 변경 이력 (Keep a Changelog 형식) | 존재 |
| `PLAN.md` | 개발 계획 | 프로젝트 로드맵/계획 | 존재 |
| `guide/` (8개 파일) | 사용자/개발자 | 시작 가이드, 설정, 다이어그램, FAQ 등 | 부분 충실 |

**강점:**
- 4개의 핵심 문서(README, CONTRIBUTING, CLAUDE, GEMINI)가 모두 한국어로 작성되어 국내 개발자 접근성 우수
- AI 에이전트 전용 가이드 문서(CLAUDE.md, GEMINI.md) 제공은 업계에서도 선진적인 접근
- `guide/` 폴더에 사용자 가이드 8개 문서가 주제별로 분리되어 구성
- `CONTRIBUTING.md`에 브랜치 전략, 커밋 규칙, 코드 스타일, 파일 구조 등 종합적 안내

**약점:**
- `guide/getting-started.md`가 플레이스홀더 상태 ("*This document is a placeholder...*")
- `CONTRIBUTING.md`에 `.env.example` 설정 방법이 명시되어 있지 않음
- 아키텍처 의사결정 기록(ADR)이 없어 "왜 이 기술을 선택했는지" 추적 어려움
- `src/` (Vite 레거시)와 `app/` (Next.js) 이중 구조에 대한 마이그레이션 가이드 부재
- `GEMINI.md`는 기술 스택을 "React 18, Vite"로 표기하며 Next.js 전환 사실 미반영

### 2.2 시작 절차

```bash
# 현재 온보딩 과정
git clone <repo>
bun install          # 1단계: 의존성 설치
bun dev              # 2단계: 개발 서버 시작 (Next.js, localhost:3000)
```

**분석:**
- 2단계 시작은 매우 간결하여 즉시 개발 가능 (모범 사례 수준)
- Bun 패키지 매니저로 빠른 설치 속도 확보
- 그러나 문서별 패키지 매니저 안내가 불일치:
  - `CLAUDE.md`: `bun install`, `bun dev` 권장
  - `GEMINI.md`: `pnpm` 권장 ("`pnpm install`, `pnpm dev`")
  - `CONTRIBUTING.md`: `bun` 또는 `npm` 병기
- Docker 개발 환경(`docker/docker-compose.dev.yml`, `docker/run-dev.sh`)도 존재하나 README에 안내 미흡

### 2.3 설정 파일 구조

프로젝트 루트에 다수의 설정 파일이 존재하며, 새 개발자가 역할을 파악하기 쉽도록 정리가 필요하다:

| 파일 | 용도 | 비고 |
|------|------|------|
| `site.config.ts` | 사이트 기본 정보 (제목, 저장소, 소셜 링크) | 사용자 커스터마이징 진입점 |
| `theme.config.ts` | 테마 색상, 폰트, 레이아웃 | CSS 변수와 연동 |
| `navigation.config.ts` | 네비게이션 메뉴 구조 | 사이드바/메인 네비 |
| `next.config.js` | Next.js 빌드 설정 | 현재 메인 빌드 시스템 |
| `vite.config.ts` | Vite 빌드 설정 | 레거시 (GitHub Pages용) |
| `vitest.config.ts` | 단위 테스트 설정 | jsdom 환경 |
| `playwright.config.ts` | E2E 테스트 설정 | 5개 브라우저/디바이스 |
| `eslint.config.js` | ESLint 린트 규칙 | Flat Config (ESLint 9) |
| `tsconfig.json` | TypeScript 컴파일러 | strict 모드 |
| `tsconfig.node.json` | Node.js용 TS 설정 | 빌드 도구용 |
| `codecov.yml` | 커버리지 리포팅 | Codecov 연동 |
| `instrumentation.ts` | Next.js instrumentation | 스케줄러 초기화 |
| `middleware.ts` | Next.js 미들웨어 | 인증 처리 |

### 2.4 모범 사례 대비 격차

| 항목 | 모범 사례 | 현재 상태 | 격차 |
|------|-----------|-----------|------|
| README 퀵스타트 | 3단계 이내 실행 | 2단계 (clone -> install -> dev) | 없음 |
| .env.example | 모든 환경변수 문서화 | CONTRIBUTING에 미연결 | 소 |
| 아키텍처 가이드 | ADR + 다이어그램 | arch-docs/ 존재하나 불완전 | 중 |
| 마이그레이션 가이드 | 듀얼 시스템 전환 문서 | 부재 | 대 |
| 패키지 매니저 통일 | 단일 매니저 명시 | 3개 문서에서 각각 다른 매니저 언급 | 중 |
| guide/ 완성도 | 실질적 콘텐츠 | getting-started가 플레이스홀더 | 중 |

---

## 3. 코드 품질 도구

### 점수: 7.5/10 (Level 4 - 측정)

### 3.1 정적 분석 도구 스택

| 도구 | 버전 | 용도 | 설정 |
|------|------|------|------|
| TypeScript | ^5.0.0 | 타입 검사 | strict 모드, noUnusedLocals, noUnusedParameters |
| ESLint | ^9.39.2 | 코드 린트 | Flat Config, typescript-eslint, react-hooks, react-refresh |
| Husky | ^8.0.0 | Git 훅 | pre-commit (민감정보 검사 + lint), commit-msg (메시지 검증) |
| CodeQL | v3 | 보안 분석 | 매주 월요일 정기 분석 + PR시 실행 |

### 3.2 ESLint 설정 분석

```javascript
// eslint.config.js - Flat Config (ESLint 9 방식)
export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage', 'public'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  }
);
```

**강점:**
- ESLint 9 Flat Config 최신 방식 채택
- `@typescript-eslint/no-unused-vars`에 `_` 접두사 예외 처리는 실용적
- React Hooks 규칙 자동 적용
- pre-commit 훅에서 lint 자동 실행으로 코드 품질 게이트 역할
- `next lint` 명령으로 Next.js 전용 린트도 별도 실행 (`eslint-config-next`)

**약점:**
- Prettier가 `package.json` devDependencies에 없음 (CLAUDE.md에는 "ESLint + Prettier 설정 준수" 언급)
- `import/order` 등 import 정렬 규칙 미설정
- `no-console` 규칙 미적용 (프로덕션 로그 관리 어려움)
- `eslint.config.js`는 Vite 프로젝트용 (react-refresh 플러그인 포함)이고, Next.js용 ESLint 설정은 `next lint` 명령으로 별도 실행되어 이중 설정 혼란
- `app/` 및 `lib/` 디렉토리에 대한 ESLint 설정이 `eslint.config.js`의 `files: ['**/*.{ts,tsx}']` 패턴으로 암묵적으로 적용되나, 서버 코드용 규칙(Node.js globals 등)이 별도로 없음

### 3.3 Husky Pre-commit 훅 분석

```bash
# .husky/pre-commit 주요 기능
1. 민감 정보 검사 (password, api_key, secret 패턴)
   - 스테이지된 파일만 대상 (ts, tsx, js, jsx, json, yml, yaml, md)
   - grep으로 패턴 매칭 (api[_-]?key, password, secret)
2. lint 검사 (bun run lint 또는 npm run lint 자동 선택)

# .husky/commit-msg
1. 빈 메시지 검사
2. 최소 길이 검사 (5자 이상)
```

**강점:**
- 민감 정보 노출 방지 검사가 pre-commit에 내장 (보안 인식 높음)
- bun/npm 자동 감지 로직으로 런타임 유연성 확보
- 스테이지된 파일만 검사하여 효율적 (`git diff --cached --name-only`)

**약점:**
- `lint-staged` 미사용으로 변경된 파일만 lint하지 않고 **전체 프로젝트 lint** 실행 (대규모 프로젝트에서 느림)
  - 주의: 민감정보 검사는 스테이지 파일만 대상이나, lint 검사는 전체 프로젝트를 대상으로 함
- 타입 체크(`typecheck`)가 pre-commit에 포함되지 않음
- 테스트 실행이 pre-commit에 없음 (CI에서만 검증)
- `commit-msg` 훅에서 Conventional Commits 형식(`feat:`, `fix:` 등) 검증 미수행 (길이만 검사)

### 3.4 모범 사례 대비 격차

| 항목 | 모범 사례 | 현재 상태 | 격차 |
|------|-----------|-----------|------|
| Prettier 통합 | ESLint + Prettier 연동 | Prettier 미설치 | 대 |
| lint-staged | 변경 파일만 lint | 전체 프로젝트 lint | 중 |
| Import 정렬 | 자동 정렬 규칙 | 규칙 없음 | 소 |
| Pre-commit 타입체크 | tsc --noEmit | 미포함 | 중 |
| 커밋 메시지 규약 | commitlint + conventional | 최소 길이(5자)만 검증 | 중 |
| ESLint 설정 통일 | 단일 설정 파일 | eslint.config.js + next lint 이중 | 소 |

---

## 4. 테스트 인프라

### 점수: 5/10 (Level 3 - 정의)

### 4.1 단위 테스트 (Vitest)

**설정:**
```typescript
// vitest.config.ts
{
  plugins: [react()],          // @vitejs/plugin-react
  test: {
    globals: true,             // describe, it 등 전역 사용
    environment: 'jsdom',      // DOM 시뮬레이션
    setupFiles: ['./src/test/setup.ts'],  // @testing-library/jest-dom + fetch mock
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: ['node_modules/', 'src/test/', '**/*.d.ts', '**/*.config.*', '**/main.tsx']
    }
  }
}
```

**테스트 파일 현황 (5개 파일, 1,056줄):**

| 테스트 파일 | 줄 수 | 테스트 수 | 대상 | 테스트 품질 |
|------------|-------|----------|------|-----------|
| `src/components/wiki/MarkdownRenderer.test.tsx` | 263줄 | 18개 | 마크다운 렌더링 (텍스트, 제목, 코드, 링크, 테이블, 이미지 등) | 높음 |
| `src/context/ThemeContext.test.tsx` | 257줄 | 10개 (1개 skip) | 테마 컨텍스트 (light/dark/system, localStorage 연동) | 높음 |
| `src/hooks/useWiki.test.tsx` | 309줄 | 12개 | Wiki/Issue/Search/Guide/AI History/Tags 훅 | 높음 |
| `src/utils/index.test.ts` | 128줄 | 17개 | 유틸리티 (formatTitle, slugify, formatRelativeTime, extractPlainText, truncate) | 높음 |
| `src/config.test.ts` | 99줄 | 12개 | 설정 모듈 (config, LABELS, urls 헬퍼) | 높음 |

**개별 테스트 품질 분석:**

존재하는 테스트들의 품질은 높은 수준이다:
- `MarkdownRenderer.test.tsx`: 18개 테스트 케이스가 텍스트, 제목, 코드 블록, 인라인 코드, 외부/내부 링크, 상대경로 변환, 테이블, 이미지, 목록, 인용문, 수평선, 체크박스, 취소선, 빈 콘텐츠까지 포괄적으로 커버
- `ThemeContext.test.tsx`: localStorage mock, matchMedia mock까지 구현하여 시스템 테마 반응을 테스트. `it.skip`으로 React 18 비동기 state 이슈를 명시적으로 문서화
- `useWiki.test.tsx`: QueryClient wrapper 패턴 활용, mock 데이터 팩토리(`createMockWikiPage`, `createMockGitHubIssue`) 사용
- 모든 테스트가 한국어 테스트명 사용 (프로젝트 일관성)

**커버리지 격차:**

| 디렉토리 | 파일 수 | 테스트 파일 | 커버리지 |
|----------|---------|-----------|----------|
| `src/` | 74 | 5 | 6.8% (파일 기준) |
| `app/` | 35 | 0 | 0% |
| `lib/` | 17 | 0 | 0% |
| `scripts/` | 24 | 0 | 0% |
| **합계** | **150** | **5** | **3.3%** (전체 파일 기준) |

**테스트 부재 영역 (위험도순):**

| 미테스트 모듈 | 위험도 | 이유 |
|-------------|--------|------|
| `lib/auth.ts` (인증) | 매우 높음 | 보안 핵심, 인증 우회 가능성 |
| `lib/webhook/` (웹훅 처리) | 높음 | 외부 입력 처리, 보안 취약점 가능 |
| `lib/scheduler/` (스케줄러) | 높음 | 분산 락, leader election 등 복잡한 동시성 로직 |
| `src/services/api.ts` (API 서비스) | 높음 | TTLCache, 데이터 로딩, 에러 처리 등 핵심 비즈니스 로직 |
| `src/services/github.ts` (GitHub API) | 높음 | 외부 API 연동, 에러 핸들링 |
| `app/api/` (API Routes) | 중간 | 서버 엔드포인트, 입력 검증 |
| `scripts/document/` (문서 처리) | 중간 | AI 문서 생성/수정, 파일 I/O |
| `scripts/builders/` (빌드) | 중간 | 빌드 파이프라인 정확성 |
| `src/components/layout/` (레이아웃) | 낮음 | UI 렌더링 (시각적 검증 필요) |

### 4.2 E2E 테스트 (Playwright)

**설정:**
```typescript
// playwright.config.ts
{
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  use: {
    baseURL: 'http://localhost:5173',   // <-- Vite 포트
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: ['chromium', 'firefox', 'webkit', 'Mobile Chrome', 'Mobile Safari'],
  webServer: {
    command: 'npm run dev',             // <-- npm run dev = next dev (포트 3000)
    url: 'http://localhost:5173',       // <-- Vite 포트와 불일치!
    reuseExistingServer: !process.env.CI,
  }
}
```

**E2E 테스트 파일 (5개, 377줄):**

| 파일 | 줄 수 | 테스트 영역 |
|------|-------|------------|
| `e2e/accessibility.spec.ts` | 120줄 | ARIA, 키보드 네비게이션, 색상 대비, 스크린 리더 |
| `e2e/responsive.spec.ts` | 90줄 | 반응형 레이아웃, 모바일 메뉴, 뷰포트별 동작 |
| `e2e/theme.spec.ts` | 62줄 | 라이트/다크 테마 전환, 시스템 연동 |
| `e2e/navigation.spec.ts` | 53줄 | 사이드바, 페이지 이동, 브레드크럼 |
| `e2e/search.spec.ts` | 52줄 | 검색 기능, 결과 표시 |

**강점:**
- 접근성(a11y) 전용 E2E 테스트 존재 (120줄로 가장 충실) - 높은 수준
- 5개 브라우저/디바이스 프로젝트 정의 (Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari)
- 실패 시 트레이스/스크린샷 자동 수집

**심각한 문제점:**
- `playwright.config.ts`의 `baseURL`이 `localhost:5173` (Vite 개발 서버 포트)이나, `npm run dev`는 `next dev` (포트 3000)를 실행함
- `webServer.url`도 `localhost:5173`으로 설정되어 있어 Next.js 개발 서버 시작 후 Vite 포트를 기다리게 되어 타임아웃 발생 가능
- CI에서 Chromium만 실행 (`npx playwright test --project=chromium`)하여 크로스 브라우저 검증 미수행

### 4.3 커버리지 관리

```yaml
# codecov.yml
coverage:
  precision: 2
  round: down
  range: "60...100"
  status:
    project:
      default:
        target: auto       # 현재 수준 유지만 요구
        threshold: 5%       # 5% 이내 하락 허용
    patch:
      default:
        target: auto
        threshold: 5%
```

- Codecov 연동으로 PR별 커버리지 변화 추적
- 목표가 `auto`(현재 수준 유지)로 설정되어 커버리지 향상 강제력 약함
- `CONTRIBUTING.md`에 "커버리지 목표: 80% 이상"으로 명시하나, CHANGELOG에서 보고된 실제 수치는 69%로 11% 미달
- `threshold: 5%`로 커버리지 하락도 5%까지 허용하여 사실상 게이트 역할 미약

### 4.4 테스트 설정 파일 분석

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom';
import { vi, afterEach } from 'vitest';

vi.stubGlobal('fetch', vi.fn());           // fetch 전역 모킹
vi.stubGlobal('import.meta', {             // import.meta.env 모킹
  env: { BASE_URL: '/', MODE: 'test' },
});

afterEach(() => { vi.clearAllMocks(); });  // 매 테스트 후 모킹 초기화
```

- `@testing-library/jest-dom` 매처 확장 (toBeInTheDocument, toHaveClass 등)
- `fetch`와 `import.meta.env` 전역 모킹으로 테스트 환경 격리
- `afterEach`에서 자동 정리 - 테스트 간 격리 보장

### 4.5 모범 사례 대비 격차

| 항목 | 모범 사례 | 현재 상태 | 격차 |
|------|-----------|-----------|------|
| 파일 커버리지 | 주요 모듈 80%+ | 3.3% (5/150 파일) | 매우 큼 |
| 라인 커버리지 | 80%+ | ~69% (CHANGELOG 기준) | 중 |
| 서비스 레이어 테스트 | 핵심 API 모킹 테스트 | 0개 | 매우 큼 |
| 서버 로직 테스트 | lib/ 모듈 테스트 | 0개 | 매우 큼 |
| 스크립트 테스트 | 빌드 스크립트 검증 | 0개 | 큼 |
| E2E baseURL 정합성 | 실제 서버와 일치 | Vite(5173) != Next.js(3000) | 큼 |
| E2E 크로스 브라우저 | CI에서 주요 3개 | CI에서 Chromium만 | 중 |
| 스냅샷 테스트 | UI 회귀 방지 | 미사용 | 중 |
| 뮤테이션 테스트 | Stryker 등 | 미사용 | 소 |

---

## 5. 코드 구조 및 일관성

### 점수: 5.5/10 (Level 3 - 정의)

### 5.1 파일 명명 규칙

| 패턴 | 대상 | 예시 | 일관성 |
|------|------|------|--------|
| PascalCase | React 컴포넌트 | `MarkdownRenderer.tsx`, `HomePage.tsx` | 일관 |
| camelCase | 훅 | `useWiki.ts`, `useDebounce.ts` | 일관 |
| camelCase | 서비스/유틸리티 | `api.ts`, `logger.ts`, `retry.ts` | 일관 |
| kebab-case | 설정 파일 | `site.config.ts`, `theme.config.ts` | 일관 |
| kebab-case | 스크립트 | `build-wiki-data.js`, `sync-issues.js` | 일관 |
| kebab-case | E2E 테스트 | `navigation.spec.ts`, `theme.spec.ts` | 일관 |

**평가:** 각 디렉토리 내에서는 명명 규칙이 일관되어 있다. `scripts/`가 kebab-case, `src/`가 camelCase/PascalCase를 사용하는 것은 생태계별 관례를 따른 것으로 합리적이나, `src/` 내에서도 `page-components/`(kebab-case 디렉토리)가 혼재한다.

### 5.2 디렉토리 구조

```
sepilot-wiki/
├── app/                              # Next.js App Router (현재 메인)
│   ├── (main)/                       # 메인 라우트 그룹
│   │   ├── page.tsx                  # 홈페이지
│   │   ├── wiki/                     # 위키 페이지
│   │   │   ├── [..slug]/            # 동적 라우트
│   │   │   └── category/[...path]/  # 카테고리 페이지
│   │   ├── search/                   # 검색
│   │   ├── issues/                   # Issue 목록
│   │   ├── tags/                     # 태그
│   │   ├── edit/[...slug]/          # 문서 편집
│   │   └── ai-history/              # AI 히스토리
│   ├── admin/                        # 관리자 페이지 (sync, documents)
│   ├── auth/                         # 인증 (signin, error)
│   ├── api/                          # API Routes
│   │   ├── admin/                    # 관리자 API (sync, tree, documents)
│   │   ├── health/                   # 헬스체크
│   │   ├── scheduler/                # 스케줄러 API
│   │   ├── webhook/github/           # GitHub 웹훅
│   │   ├── wiki/[...slug]/           # Wiki API
│   │   └── auth/[...nextauth]/       # NextAuth
│   ├── layout.tsx                    # 루트 레이아웃
│   └── providers.tsx                 # 전역 프로바이더
│
├── src/                              # Vite 레거시 + 공유 컴포넌트
│   ├── App.tsx                       # Vite SPA 엔트리 (react-router-dom)
│   ├── main.tsx                      # Vite 엔트리
│   ├── components/
│   │   ├── layout/ (5파일)           # Header, Footer, Sidebar, Layout
│   │   ├── wiki/ (10파일)            # MarkdownRenderer, TOC, Breadcrumb 등
│   │   ├── ui/ (7파일)               # Button, Input, Badge, Skeleton 등
│   │   ├── editor/ (3파일)           # MonacoEditor, MarkdownEditor
│   │   ├── auth/ (2파일)             # AuthButton
│   │   ├── error/ (3파일)            # ErrorBoundary, ErrorToast
│   │   └── admin/ (1파일)            # AdminSidebar
│   ├── page-components/ (7파일)      # Vite용 페이지 (HomePage, WikiPage 등)
│   ├── hooks/ (9파일)                # 커스텀 훅 (useWiki, useDebounce 등)
│   ├── context/ (7파일)              # React Context (Theme, Error, Config 등)
│   ├── services/ (3파일)             # API, GitHub, Search
│   ├── utils/ (5파일)                # logger, retry, validation, icons
│   ├── types/ (1파일)                # 전체 타입 정의 (444줄)
│   └── test/ (1파일)                 # 테스트 설정
│
├── lib/                              # 서버 전용 비즈니스 로직
│   ├── scheduler/                    # 스케줄러 (leader election, jobs)
│   ├── webhook/                      # GitHub 웹훅 처리
│   ├── auth.ts                       # NextAuth + Keycloak
│   ├── env-validation.ts             # 환경변수 검증
│   ├── errors.ts                     # 에러 처리
│   ├── redis.ts                      # Redis 연결
│   └── wiki.ts                       # Wiki CRUD
│
├── scripts/                          # 빌드/운영 스크립트 (전부 JavaScript)
│   ├── builders/ (3파일)             # build-wiki-data, build-search-index, build-404
│   ├── collectors/ (5파일)           # 동적 페이지, Actions 상태, k8s 노드 등
│   ├── document/ (4파일)             # generate, publish, unpublish, process-feedback
│   ├── issue/ (2파일)                # sync-issues, mark-invalid
│   ├── maintenance/ (3파일)          # validate-links, review-pr, maintain-wiki-tree
│   └── lib/ (7파일)                  # 공유 라이브러리 (config, utils, frontmatter 등)
│
├── docker/                           # Docker 설정
│   ├── Dockerfile                    # 멀티스테이지 (deps -> builder -> runner)
│   ├── docker-compose.yml            # 프로덕션 (wiki + redis + keycloak)
│   ├── docker-compose.dev.yml        # 개발 (wiki + redis, 인증 없음)
│   └── run-dev.sh                    # 개발 실행 스크립트
│
├── helm/sepilot-wiki/                # Kubernetes Helm 차트
│   ├── Chart.yaml
│   ├── values.yaml                   # 기본값
│   ├── values-prod.yaml              # 프로덕션 오버라이드
│   └── templates/                    # K8s 리소스 (deployment, service, ingress 등)
│
├── e2e/ (5파일)                      # Playwright E2E 테스트
├── guide/ (8파일)                    # 사용자 가이드 (마크다운)
├── wiki/                             # Wiki 데이터 (마크다운 문서들)
└── public/                           # 정적 에셋
```

### 5.3 이중 구조 문제 (핵심 DX 이슈)

**가장 심각한 DX 문제: `src/` (Vite + React Router) + `app/` (Next.js App Router) 이중 구조**

이 프로젝트는 원래 Vite + React Router SPA로 시작하여 이후 Next.js App Router로 마이그레이션을 진행 중이다. 두 시스템이 공존하면서 다음과 같은 혼란이 발생한다:

| 혼란 포인트 | Vite 측 | Next.js 측 | 영향 |
|------------|---------|-----------|------|
| **라우팅** | `src/App.tsx` (BrowserRouter, react-router-dom) | `app/(main)/layout.tsx` (App Router) | 두 라우터 공존 |
| **설정 파일** | `vite.config.ts` (port 3000, outDir: dist) | `next.config.js` (standalone/export) | 빌드 대상 혼란 |
| **빌드 명령** | `build:vite` → `dist/` | `build` → `.next/` | 어느 빌드를 사용해야 하는지 불명확 |
| **개발 서버** | `dev:vite` → `:3000` | `dev` → `:3000` | 같은 포트, 다른 서버 |
| **E2E 테스트** | Playwright baseURL: `:5173` | Next.js dev: `:3000` | 포트 불일치 |
| **페이지 컴포넌트** | `src/page-components/` (7개) | `app/(main)/` (7개 라우트) | 기능 중복 |
| **출력 디렉토리** | `dist/` | `.next/` + `out/` | CI/CD 아티팩트 경로 혼란 |

**`package.json` scripts에서의 혼란:**
```json
{
  "dev": "next dev",                    // Next.js (메인)
  "dev:vite": "vite",                   // Vite (레거시)
  "build": "npm run build:wiki && npm run build:search && next build",  // Next.js
  "build:vite": "npm run build:wiki && npm run build:search && vite build && npm run build:404",  // Vite
  "build:static": "BUILD_MODE=static AUTH_MODE=public npm run build:wiki && ...",  // GitHub Pages
  "build:pages": "npm run build:static",  // Pages 별칭
  "preview": "vite preview",             // Vite preview (Next.js start와 역할 중복)
  "start": "next start",                 // Next.js 프로덕션 서버
}
```

`deploy-pages.yml`은 여전히 Vite 빌드(`build:vite` 경로에서 `dist/` 아티팩트)를 업로드하는 것으로 보이며, `docker-build.yml`은 Next.js(`build`)를 사용한다. 이 이중성이 "어느 빌드가 어디에 배포되는가"를 파악하기 어렵게 만든다.

**영향 요약:**
- 새 개발자가 어느 디렉토리에서 작업해야 하는지 즉시 파악 불가
- 수정 시 양쪽 모두 반영해야 하는지 판단 어려움
- CI/CD에서 어느 빌드 시스템을 사용하는지 워크플로우마다 다름

### 5.4 index.ts 배럴 파일 패턴

각 컴포넌트 디렉토리에 `index.ts` 배럴 파일이 존재하여 임포트 경로 단순화:
```typescript
// components/layout/index.ts -> import { Header, Sidebar } from '@/components/layout'
// components/wiki/index.ts -> import { MarkdownRenderer, TableOfContents } from '@/components/wiki'
// components/ui/index.ts -> import { Button, Input } from '@/components/ui'
```

이 패턴은 일관되게 적용되어 있으며, `@/*` 경로 별칭과 함께 깊은 import 경로를 효과적으로 단순화한다.

### 5.5 경로 별칭 설정 충돌

`tsconfig.json`의 `paths` 설정:
```json
"paths": {
  "@/*": ["./src/*", "./*"]
}
```

`@/` 별칭이 `./src/*`와 `./*` 두 경로를 모두 매핑한다. 이는 `app/` 디렉토리에서 `@/src/types`로 타입을 임포트하면서도, `src/` 내부에서 `@/types`로 같은 파일에 접근할 수 있게 한다. 의도된 설계이나, 같은 모듈에 대한 두 가지 임포트 경로가 존재하여 혼란 가능성이 있다.

### 5.6 모범 사례 대비 격차

| 항목 | 모범 사례 | 현재 상태 | 격차 |
|------|-----------|-----------|------|
| 단일 프레임워크 | 하나의 빌드 시스템 | Vite + Next.js 이중 구조 | 매우 큼 |
| 디렉토리 역할 명시 | 각 디렉토리 역할 문서화 | arch-docs/ 존재, README에 일부 기술 | 중 |
| 배럴 파일 | 일관된 re-export | 대부분 적용 | 없음 |
| 경로 별칭 | 단일 매핑 | `@/*` 이중 매핑 | 소 |
| 코드 중복 | DRY 원칙 | page-components/ vs app/ 페이지 중복 | 중 |

---

## 6. 타입 시스템

### 점수: 7/10 (Level 4 - 측정)

### 6.1 TypeScript 설정

```json
// tsconfig.json 주요 설정
{
  "strict": true,                        // 최고 수준 타입 안전성
  "noUnusedLocals": true,                // 미사용 변수 에러
  "noUnusedParameters": true,            // 미사용 매개변수 에러
  "noFallthroughCasesInSwitch": true,    // switch 폴스루 방지
  "moduleResolution": "bundler",         // 번들러 모듈 해석
  "jsx": "preserve",                     // Next.js 호환 JSX
  "incremental": true,                   // 증분 컴파일 (빌드 속도)
  "paths": { "@/*": ["./src/*", "./*"] } // 경로 별칭
}
```

**강점:**
- `strict: true`로 최고 수준의 타입 안전성 확보
- `noUnusedLocals`, `noUnusedParameters`로 데드 코드 방지
- `incremental: true`로 반복 빌드 속도 최적화
- Next.js 플러그인(`"name": "next"`)으로 서버/클라이언트 타입 검증

**약점:**
- `allowJs: true`로 JavaScript 파일도 허용하여 타입 안전성 일부 저하 (`scripts/` 디렉토리가 전부 `.js`)
- `skipLibCheck: true`로 라이브러리 타입 검사 건너뜀 (빌드 속도 우선)

### 6.2 타입 정의 분석 (`src/types/index.ts` - 444줄)

**포괄적 타입 정의 (9개 도메인 영역):**

| 도메인 | 타입 | 줄 수 (추정) |
|--------|------|-------------|
| Wiki 핵심 | `WikiPage`, `WikiRevision`, `WikiStatus` | ~28줄 |
| Wiki 트리 | `WikiTreePage`, `WikiTreeCategory`, `WikiTreeItem`, `WikiTree` (deprecated) | ~55줄 |
| GitHub | `GitHubIssue`, `GitHubLabel`, `GitHubUser`, `GitHubComment`, `GitHubLabelInput` | ~55줄 |
| API | `ApiError`, `ApiErrorCode`, `ApiResponse<T>`, `CreateApiError` | ~50줄 |
| 사이트 설정 | `SiteConfig`, `WikiConfig`, `GitHubConfig`, `LogoConfig`, `SocialLinks`, `FooterConfig` | ~60줄 |
| 테마 | `ThemeConfig`, `ThemeColors`, `ColorScheme`, `ThemeFonts`, `ThemeLayout`, `ThemeBorderRadius` | ~60줄 |
| 네비게이션 | `NavigationConfig`, `NavSection`, `NavItem`, `SidebarSection`, `SidebarNavItem` | ~35줄 |
| AI 히스토리 | `AIHistoryEntry`, `AIHistory`, `DocumentAIHistory`, `AIActionType` | ~30줄 |
| 모니터링 | `WorkflowRun`, `WorkflowStatus`, `ActionsStatus`, `TagStats` | ~45줄 |

**강점:**
- 단일 파일에 전체 도메인 타입을 집중하여 타입 일관성 유지
- 타입 가드 함수 제공 (`isWikiCategory`, `isWikiPage`, `isGitHubLabelObject`, `getLabelName`)
- JSDoc 주석으로 타입 문서화 (`@deprecated`, 필드별 설명)
- Discriminated Union 패턴 활용 (`WikiTreePage | WikiTreeCategory`에서 `isCategory` 필드로 구별)
- `ApiError` 구조화된 에러 타입에 `recoverable` 필드로 복구 가능성 표현
- 제네릭 활용 (`ApiResponse<T>`)

### 6.3 @deprecated WikiTree 타입 사용 현황

```typescript
// src/types/index.ts
/**
 * Wiki 트리 타입 (하위 호환성을 위해 유지)
 * @deprecated WikiTreeItem 사용을 권장
 */
export interface WikiTree { ... }
```

`@deprecated`로 표시된 `WikiTree` 타입이 여전히 광범위하게 사용 중:

| 사용 위치 | 사용 방식 |
|----------|----------|
| `src/services/api.ts` | `TTLCache<{ pages: WikiPage[]; tree: WikiTree[] }>`, `fetchWikiPages(): Promise<WikiTree[]>` |
| `src/hooks/useWiki.test.tsx` | `const mockGuides: WikiTree[]` |
| `src/components/ui/CommandPalette.tsx` | `WikiTree` 타입 참조 |
| `src/components/layout/Sidebar.tsx` | `findHomeInTree(pages: WikiTree[])`, `renderWikiTreeItem(item: WikiTree)` |
| `app/(main)/page.tsx` | `flattenPages(tree: WikiTree[]): WikiTree[]` |
| `app/(main)/wiki/page.tsx` | `flattenPages`, `matchesSearch(node: WikiTree)` |
| `app/(main)/wiki/category/[...path]/page.tsx` | `findCategory(pages: WikiTree[])` |

**분석:** deprecated 타입이 `src/`와 `app/` 양쪽 모두에서 사용되고 있어, `WikiTreeItem`으로의 마이그레이션이 전혀 진행되지 않은 상태이다. 타입 가드(`isWikiCategory`, `isWikiPage`)가 `WikiTree | WikiTreeItem`을 모두 수용하도록 설계되어 점진적 마이그레이션을 지원하나, 실제 마이그레이션은 시작되지 않았다.

### 6.4 모범 사례 대비 격차

| 항목 | 모범 사례 | 현재 상태 | 격차 |
|------|-----------|-----------|------|
| strict 모드 | 전역 strict | 적용됨 | 없음 |
| 타입 가드 | Discriminated Union + 가드 | 적용됨 | 없음 |
| 타입 파일 분리 | 도메인별 분리 | 단일 파일 444줄 | 중 |
| deprecated 정리 | 마이그레이션 완료 후 제거 | `WikiTree` 11곳에서 사용 중 | 중 |
| scripts TypeScript화 | 전체 TS 전환 | scripts/ 전부 JS (24파일) | 큼 |
| 제네릭 활용 | 공통 패턴 제네릭화 | `ApiResponse<T>` 등 일부 사용 | 소 |

---

## 7. CI/CD 파이프라인

### 점수: 8/10 (Level 4 - 측정)

### 7.1 워크플로우 전체 맵

프로젝트에 **14개 GitHub Actions 워크플로우**가 정의되어 있다:

| 워크플로우 | 트리거 | 기능 | 러너 |
|-----------|--------|------|------|
| `ci.yml` | push/PR (main, develop) | lint -> typecheck -> test -> e2e -> build | jhl-space |
| `deploy-pages.yml` | push(main) + 10분 cron + gollum + dispatch | 정적 빌드 + GitHub Pages 배포 | ubuntu-latest |
| `docker-build.yml` | push(main) + dispatch | Docker 빌드 + Harbor push + GitOps 업데이트 | jhl-space |
| `codeql.yml` | push(main) + PR + 매주 월요일 06:00 UTC | CodeQL 보안 코드 분석 | ubuntu-latest |
| `issue-handler.yml` | Issue 이벤트 | AI 문서 생성/수정 처리 | - |
| `wiki-tree-maintainer.yml` | - | Wiki 트리 구조 유지보수 | - |
| `scheduled-collect.yml` | cron | 시스템 정보 수집 | - |
| `gemini-triage.yml` | Issue 이벤트 | Gemini 기반 Issue 분류 | - |
| `gemini-scheduled-triage.yml` | cron | Gemini 정기 트리아지 | - |
| `gemini-pr-review.yml` | PR 이벤트 | Gemini PR 자동 리뷰 | - |
| `gemini-review.yml` | - | Gemini 코드 리뷰 | - |
| `gemini-invoke.yml` | dispatch | Gemini 수동 호출 | - |
| `gemini-dispatch.yml` | dispatch | Gemini 디스패치 | - |
| `gemini-link-validator.yml` | - | 링크 유효성 검증 | - |

### 7.2 CI 파이프라인 분석 (`ci.yml`)

```
lint (Lint + Typecheck)      # Bun 사용
    |
    v
test (Vitest + Coverage -> Codecov)    # Node.js 20 + Bun
    |
    v
e2e (Playwright Chromium -> Report Artifact)    # Node.js 20 + Bun
    |
    v
build (Next.js Build -> Dist Artifact)    # Bun
```

**강점:**
- 4단계 순차 파이프라인으로 빠른 실패 전략 (lint 실패 시 이후 단계 미실행)
- Codecov 연동으로 PR별 커버리지 추적 (`fail_ci_if_error: false`로 Codecov 장애 시 CI 차단 안 함)
- Playwright 리포트를 Artifact로 보관 (7일)
- self-hosted runner(`jhl-space`) 사용으로 빌드 비용 절감 및 사내 인프라 접근 가능
- `develop` 브랜치에서도 CI 실행 (브랜치 전략 반영)

**약점:**
- lint와 test가 순차 실행 (독립적이므로 병렬화 가능하여 CI 시간 단축 여지)
- CI에서 E2E가 Chromium만 실행하여 크로스 브라우저 검증 부족
- 빌드 캐시(node_modules, .next) 미설정으로 매번 전체 설치/빌드
- `test` 잡에서 `npx vitest run --coverage` 사용 (bun이 아닌 npx 혼용)
- E2E에서 `bun run build:wiki && bun run build:search`를 실행하나, Next.js dev 서버를 시작하지 않고 Vite dev 서버를 기다리는 Playwright 설정과 불일치 가능성

### 7.3 배포 파이프라인

**GitHub Pages (정적 배포, `deploy-pages.yml`):**
- 10분마다 cron으로 자동 배포 (Issue 동기화 반영)
- Wiki 변경(`gollum` 이벤트), Issue 동기화, 동적 페이지 수집(k8s 등)을 모두 빌드 시점에 처리
- `concurrency` 설정으로 중복 배포 방지
- `kubectl` 설정으로 K8s 정보 수집도 빌드 시 수행
- `VITE_BASE_PATH` 설정으로 GitHub Pages 경로 자동 결정

**Docker/K8s (서버 배포, `docker-build.yml`):**
- Harbor 레지스트리 + GitOps 패턴 (별도 GitOps 저장소 `jhl-labs/jhl-space-docs`)
- Docker 빌드 캐시 활용 (`cache-from: type=registry`)
- Git SHA 기반 이미지 태깅 (`sha-<short>`) + `latest` 태그
- GitOps values 파일 자동 업데이트 (`sed -i`로 image tag 교체)
- `[skip ci]` 커밋 메시지로 GitOps 저장소에서 불필요한 CI 방지

### 7.4 모범 사례 대비 격차

| 항목 | 모범 사례 | 현재 상태 | 격차 |
|------|-----------|-----------|------|
| CI 단계 구성 | lint/test 병렬 -> build | 전체 순차 실행 | 소 |
| 빌드 캐시 | node_modules + .next 캐시 | 미설정 | 중 |
| Preview 배포 | PR별 preview URL | 미구현 | 중 |
| 롤백 자동화 | 자동 롤백 트리거 | 미확인 | 중 |
| 보안 스캔 | SAST + DAST + SCA | CodeQL(SAST)만 + Dependabot(SCA) | 소 |
| GitOps | 선언적 배포 | 적용됨 | 없음 |
| 10분 cron 효율 | 변경 감지 기반 배포 | 변경 없어도 빌드 실행 | 소 |

---

## 8. AI 개발 지원

### 점수: 8.5/10 (Level 4-5 사이)

### 8.1 AI 에이전트 전용 설정

| 파일 | 대상 AI | 크기 | 주요 내용 |
|------|---------|------|-----------|
| `CLAUDE.md` | Claude Code | ~80줄 | 프로젝트 개요, 코드 규칙, 보안 규칙, 파일 구조, 명령어, 환경변수, Git 규칙 |
| `GEMINI.md` | Gemini | ~50줄 | 기술 스택, 핵심 원칙, 코드 컨벤션, 폴더 구조, 작업 흐름 |

**CLAUDE.md 분석:**
- 보안 규칙 강조 ("시스템 사용자명, IP, 호스트 정보가 코드에 절대 노출되면 안됨")
- `commit 전에는 lint 검사를 하게 해줘` 같은 AI 행동 지시 포함
- 코드 스타일(TypeScript strict, 함수형 컴포넌트, React hooks) 명시
- 파일 구조 가이드로 AI가 올바른 위치에 코드 생성하도록 유도

**GEMINI.md 분석:**
- `task_boundary` 사용 지시로 구조화된 작업 관리 유도
- "변경 사항이 기존 기능을 깨뜨리지 않는지 확인" 같은 안전장치 지시
- 기술 스택 정보가 "React 18, Vite"로 업데이트되지 않음 (Next.js 전환 미반영)

### 8.2 AI 통합 워크플로우

```
GitHub Issue (request 라벨)
    |
    v
gemini-triage.yml -> Issue 분류/라우팅
    |
    v
issue-handler.yml -> AI 문서 생성 (scripts/document/generate-document.js)
    |                -> AI 문서 수정 (scripts/document/process-feedback.js)
    |                -> 문서 발행 (scripts/document/publish-document.js)
    |
    v
gemini-pr-review.yml -> PR 자동 리뷰
    |
    v
gemini-link-validator.yml -> 링크 유효성 검증
    |
    v
wiki-tree-maintainer.yml -> 트리 구조 자동 정비 (scripts/maintenance/maintain-wiki-tree.js)
```

**AI 히스토리 시스템:**
```typescript
// src/types/index.ts
export type AIActionType = 'generate' | 'modify' | 'publish' | 'invalid' | 'delete' | 'recover';
export interface AIHistoryEntry {
  id: string;
  actionType: AIActionType;
  issueNumber: number;
  documentSlug: string;
  summary: string;
  trigger: 'request_label' | 'invalid_label' | 'maintainer_comment' | 'issue_close' | 'issue_reopen';
  model?: string;
  changes?: { additions?: number; deletions?: number; };
}
```

### 8.3 AI 관련 스크립트

| 스크립트 | 기능 | 비고 |
|---------|------|------|
| `scripts/document/generate-document.js` | AI 문서 생성 | OpenAI 호환 API 사용 |
| `scripts/document/process-feedback.js` | 피드백 기반 수정 | Issue 댓글 분석 |
| `scripts/document/publish-document.js` | 문서 발행 | Git 커밋/푸시 |
| `scripts/document/unpublish-document.js` | 문서 비공개 | 상태 변경 |
| `scripts/maintenance/maintain-wiki-tree.js` | Wiki 트리 정비 | AI 기반 구조 최적화 |
| `scripts/maintenance/review-pr.js` | PR 리뷰 | AI 코드 리뷰 |
| `scripts/maintenance/validate-links.js` | 링크 검증 | 깨진 링크 탐지 |
| `scripts/lib/ai-history.js` | AI 히스토리 관리 | 이력 기록/조회 |

### 8.4 강점 및 약점

**강점:**
- **업계 최선단 수준의 AI 통합**: 문서 생성부터 리뷰, 유지보수까지 전 생명주기에 AI 적용
- 2개 AI 에이전트(Claude, Gemini) 전용 프로젝트 지침서 제공
- AI가 생성한 문서에 대한 인간 피드백 루프 구축 (Issue 댓글 -> AI 수정)
- AI 작업 이력 추적 시스템 (`AIHistory` 타입, `AIHistoryPage` UI)
- 한국어 코드 주석 권장으로 국내 AI 컨텍스트 최적화
- 트리거 기반 자동화 (`request_label`, `invalid_label`, `maintainer_comment`, `issue_close`, `issue_reopen`)

**약점:**
- `CLAUDE.md`와 `GEMINI.md`의 정보가 일부 불일치 (패키지 매니저, 기술 스택)
- AI가 생성한 코드에 대한 자동 테스트 검증이 CI에 별도로 포함되는지 불명확
- AI 모델별 성능/비용 메트릭 추적 부재 (AIHistoryEntry에 `model?` 필드는 있으나 활용 미확인)
- AI 스크립트가 전부 JavaScript로 타입 안전성 부재

### 8.5 모범 사례 대비 격차

| 항목 | 모범 사례 | 현재 상태 | 격차 |
|------|-----------|-----------|------|
| AI 프로젝트 지침 | 상세한 컨텍스트 파일 | CLAUDE.md + GEMINI.md | 없음 |
| AI 워크플로우 | 자동화된 생성->리뷰->배포 | 7개+ 워크플로우 구축 | 없음 |
| AI 히스토리 추적 | 작업 이력 관리 | AIHistory 시스템 | 없음 |
| 멀티 AI 지원 | 2개+ AI 에이전트 | Claude + Gemini | 없음 |
| AI 지침 일관성 | 파일 간 정보 동기화 | 패키지 매니저/스택 불일치 | 중 |
| AI 메트릭 | 품질/비용 추적 | 미구현 | 중 |

---

## 9. Docker/Kubernetes 개발 경험

### 점수: 7.5/10 (Level 4 - 측정)

### 9.1 Docker 환경

**멀티스테이지 Dockerfile (`docker/Dockerfile`):**

```dockerfile
# Stage 1: Dependencies (oven/bun:1-alpine)
FROM oven/bun:1-alpine AS deps
RUN bun install --frozen-lockfile

# Stage 2: Builder (oven/bun:1-alpine + nodejs)
FROM oven/bun:1-alpine AS builder
RUN bun run build:wiki && bun run build:search && bun run build

# Stage 3: Runner (node:20-alpine)
FROM node:20-alpine AS runner
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
USER nextjs
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget ... http://localhost:3000/api/health || exit 1
CMD ["node", "server.js"]
```

**강점:**
- 3단계 멀티스테이지 빌드로 최종 이미지 크기 최적화
- non-root 사용자 (`nextjs:nodejs`, UID/GID 1001) 실행으로 보안 강화
- 헬스체크 내장
- `--frozen-lockfile`으로 재현 가능한 빌드
- `BUILD_MODE`, `AUTH_MODE` 빌드 인자로 유연한 빌드 모드 지원

**Docker Compose 구성:**

| 파일 | 서비스 | 용도 |
|------|--------|------|
| `docker-compose.yml` | wiki + redis + keycloak | 프로덕션 (인증 포함) |
| `docker-compose.dev.yml` | wiki + redis | 개발 (인증 없이, 포트: 3001) |

**약점:**
- `run-dev.sh` 스크립트의 내용 미확인 (문서화 부족)
- 개발용 compose에서 `NEXTAUTH_SECRET=dev-secret-key-for-local-testing-only` 하드코딩 (보안 경고 필요)

### 9.2 Helm 차트

**`helm/sepilot-wiki/` 구조:**

| 파일 | 내용 |
|------|------|
| `Chart.yaml` | 차트 메타데이터 |
| `values.yaml` | 기본 설정 (replicas, resources, auth, probes 등) |
| `values-prod.yaml` | 프로덕션 오버라이드 |
| `templates/deployment.yaml` | 배포 리소스 |
| `templates/service.yaml` | 서비스 리소스 |
| `templates/ingress.yaml` | 인그레스 리소스 |
| `templates/hpa.yaml` | 오토스케일링 |
| `templates/secret.yaml` | 시크릿 관리 |
| `templates/serviceaccount.yaml` | 서비스 계정 |
| `templates/_helpers.tpl` | 템플릿 헬퍼 |
| `templates/NOTES.txt` | 설치 후 안내 |

**강점:**
- 포괄적인 보안 설정: `readOnlyRootFilesystem`, `allowPrivilegeEscalation: false`, `seccompProfile: RuntimeDefault`, capabilities `drop: ALL`
- HPA(수평 자동 확장) 지원
- Liveness/Readiness 프로브 설정 (`/api/health`)
- 외부 시크릿 지원 (`externalSecrets.enabled`)
- 프로덕션 분리 values (`values-prod.yaml`)

**약점:**
- `externalSecrets` 연동이 `enabled: false`로 기본 비활성
- Helm 차트 테스트(`helm test`) 미설정

### 9.3 모범 사례 대비 격차

| 항목 | 모범 사례 | 현재 상태 | 격차 |
|------|-----------|-----------|------|
| 멀티스테이지 빌드 | 최소 이미지 | 적용됨 | 없음 |
| 보안 컨텍스트 | non-root, read-only | 적용됨 | 없음 |
| Helm values 분리 | 환경별 분리 | values.yaml + values-prod.yaml | 없음 |
| Helm 차트 테스트 | helm test | 미설정 | 소 |
| 로컬 Docker 개발 | docker-compose dev | 적용됨 | 없음 |

---

## 10. 개발 워크플로우

### 점수: 6.5/10 (Level 3 - 정의)

### 10.1 브랜치 전략

```
main (배포)
 |-- develop (개발)
      |-- feature/* (기능)
      |-- fix/* (버그 수정)
```

- Conventional Commits 패턴 언급 (`feat:`, `fix:`, `docs:` 등)하나 `commitlint` 자동 검증 미적용
- `commit-msg` 훅은 최소 길이(5자)만 검증
- CI가 `main`과 `develop` 양쪽에서 실행

### 10.2 코드 리뷰

- `gemini-pr-review.yml`로 AI 자동 리뷰 (PR 이벤트 트리거)
- PR 템플릿 존재 (`/.github/PULL_REQUEST_TEMPLATE.md`):
  - 변경 사항 설명, 변경 유형 체크박스 (7종), 관련 Issue 링크, 체크리스트 (스타일, 테스트, 문서, 커밋 규약), 스크린샷
- `.github/CODEOWNERS` 파일 미존재 (자동 리뷰어 할당 안 됨)

### 10.3 Issue 관리

- Issue 템플릿 3종 + config.yml:
  - `bug_report.yml`: 버그 리포트
  - `feature_request.yml`: 기능 요청
  - `document_request.yml`: 문서 작성 요청 (AI 자동 처리용)
  - `config.yml`: 템플릿 선택 화면 설정
- 라벨 기반 자동 처리 (`request`, `invalid`, `draft`, `ai-generated`, `published`, `wiki-maintenance`)
- AI 트리아지 자동화 (`gemini-triage.yml`, `gemini-scheduled-triage.yml`)
- Dependabot 설정 (`.github/dependabot.yml`)으로 의존성 자동 업데이트

### 10.4 개발 도구 생태계

| 도구 | 용도 | 비고 |
|------|------|------|
| Bun | 패키지 매니저 + 런타임 | 빠른 설치/실행 (`bun.lock` 사용) |
| Docker Compose | 로컬 개발 환경 | `docker-compose.dev.yml` + `run-dev.sh` |
| Helm | K8s 배포 | `helm/sepilot-wiki/` |
| Dependabot | 의존성 업데이트 | `.github/dependabot.yml` |
| Codecov | 커버리지 리포팅 | CI 연동 |
| Playwright | E2E 테스트 | 5개 브라우저/디바이스 |
| Vitest | 단위 테스트 | jsdom 환경 + v8 커버리지 |
| Monaco Editor | 웹 IDE | 문서 편집 기능 내장 |

### 10.5 모범 사례 대비 격차

| 항목 | 모범 사례 | 현재 상태 | 격차 |
|------|-----------|-----------|------|
| commitlint | 자동 메시지 검증 | 최소 길이만 검증 | 중 |
| PR 템플릿 | 체크리스트 포함 | 적용됨 (7종 체크박스 + 체크리스트) | 없음 |
| CODEOWNERS | 자동 리뷰어 할당 | 미존재 | 소 |
| 핫 리로드 | 안정적 HMR | Next.js + Vite 이중 설정 | 중 |
| VS Code 설정 | launch.json, settings.json | 미확인 | 소 |
| Dependabot | 의존성 자동 업데이트 | 적용됨 | 없음 |

---

## 11. 종합 평가

### 11.1 영역별 점수 요약

| # | 영역 | 점수 | 성숙도 Level | 가중치 |
|---|------|------|-------------|--------|
| 1 | 온보딩 경험 | 7.0/10 | Level 4 | 15% |
| 2 | 코드 품질 도구 | 7.5/10 | Level 4 | 12% |
| 3 | 테스트 인프라 | 5.0/10 | Level 3 | 20% |
| 4 | 코드 구조 및 일관성 | 5.5/10 | Level 3 | 15% |
| 5 | 타입 시스템 | 7.0/10 | Level 4 | 8% |
| 6 | CI/CD 파이프라인 | 8.0/10 | Level 4 | 10% |
| 7 | AI 개발 지원 | 8.5/10 | Level 4-5 | 10% |
| 8 | Docker/K8s 개발 경험 | 7.5/10 | Level 4 | 5% |
| 9 | 개발 워크플로우 | 6.5/10 | Level 3 | 5% |

### 11.2 종합 DX 점수

```
종합 점수 = (7.0 x 0.15) + (7.5 x 0.12) + (5.0 x 0.20) + (5.5 x 0.15)
          + (7.0 x 0.08) + (8.0 x 0.10) + (8.5 x 0.10) + (7.5 x 0.05) + (6.5 x 0.05)

         = 1.050 + 0.900 + 1.000 + 0.825 + 0.560 + 0.800 + 0.850 + 0.375 + 0.325

         = 6.685 / 10
```

### **종합 DX 점수: 6.7/10 (Level 3-4 경계)**

### 11.3 강점 Top 5

1. **AI 통합 개발 경험 (8.5점)**: 업계 최선단 수준의 AI 에이전트 통합. 문서 생성-리뷰-배포 전 생명주기 자동화. Claude + Gemini 듀얼 AI 지원. AI 히스토리 추적 시스템.
2. **CI/CD 파이프라인 (8.0점)**: 4단계 CI + 듀얼 배포(GitHub Pages + K8s) + GitOps + CodeQL 보안 분석 + Dependabot.
3. **코드 품질 도구 (7.5점)**: TypeScript strict + ESLint 9 Flat Config + Husky 민감정보 검사 + CodeQL 정기 분석.
4. **Docker/K8s 개발 경험 (7.5점)**: 멀티스테이지 Dockerfile + Helm 차트 + 개발용 Docker Compose + 포괄적 보안 설정.
5. **온보딩 문서화 (7.0점)**: 4개 핵심 문서 + 사용자 가이드 8종 + 2단계 퀵스타트 + PR 템플릿 + Issue 템플릿 3종.

### 11.4 개선 필요 Top 5

1. **테스트 인프라 (5.0점)**: 150개 소스 파일 중 5개만 테스트 (3.3% 파일 커버리지). 서비스/서버/스크립트 레이어 테스트 전무. 보안 핵심 모듈(`lib/auth.ts`, `lib/webhook/`) 미테스트.
2. **이중 프레임워크 구조 (5.5점)**: Vite + Next.js 공존으로 개발자 혼란, 설정 충돌, E2E 포트 불일치. 빌드 스크립트 6개가 서로 다른 조합으로 동작.
3. **Prettier 부재**: CLAUDE.md에서 "ESLint + Prettier 설정 준수" 언급하나 실제 미설치.
4. **E2E 환경 불일치**: Playwright `baseURL`이 Vite(5173)이나 메인 개발 서버는 Next.js(3000). `webServer.url`도 5173으로 설정.
5. **scripts/ TypeScript 미전환**: 24개 운영 스크립트(AI 문서 생성, 빌드, 수집 등)가 전부 JavaScript로 타입 안전성 부재.

### 11.5 DX 성숙도 레이더 차트 (텍스트)

```
                    온보딩 (7.0)
                        |
           워크플로우    |    코드 품질
             (6.5)  ____|____ (7.5)
                   /    |    \
     Docker/K8s   /     |     \
       (7.5)     /      |      \
                /       |       \
    AI 지원 --+--------+--------+-- 테스트
     (8.5)     \       |       /     (5.0)
                \      |      /
                 \     |     /
           CI/CD  \___|___/   코드 구조
           (8.0)     |        (5.5)
                     |
                타입 시스템 (7.0)
```

### 11.6 프로젝트 DX 특성 분석

**프로젝트 유형별 DX 평가:**

이 프로젝트는 일반적인 웹 애플리케이션과 다른 특수한 성격을 가지고 있다:

| 특성 | 설명 | DX 영향 |
|------|------|---------|
| AI 네이티브 | AI가 코드와 문서의 주요 생산자 | AI 지침 파일이 일반 문서보다 중요 |
| 듀얼 배포 | GitHub Pages(정적) + K8s(서버) | 빌드 설정 복잡도 증가 |
| 자기 문서화 | 프로젝트 자체가 Wiki 시스템 | 문서화 품질이 제품 품질과 직결 |
| 인프라 수집 | K8s/GitHub 상태 정보 수집 | 외부 의존성이 빌드에 영향 |

---

## 12. 개선 로드맵

### 12.1 단기 (1-2주) - Quick Wins

| 우선순위 | 작업 | 예상 효과 | 난이도 |
|---------|------|-----------|--------|
| P0 | Prettier 설치 및 ESLint 연동 | 코드 스타일 일관성 즉시 확보 | 낮음 |
| P0 | lint-staged 도입 (pre-commit 최적화) | 커밋 시간 단축, 변경 파일만 lint | 낮음 |
| P0 | Playwright baseURL을 Next.js(3000)로 수정 | E2E 테스트 실행 환경 정합성 확보 | 낮음 |
| P1 | commitlint 도입 (conventional commits 강제) | 커밋 메시지 품질 향상 | 낮음 |
| P1 | CLAUDE.md/GEMINI.md 패키지 매니저 + 기술 스택 통일 | 온보딩/AI 혼란 제거 | 낮음 |
| P1 | guide/getting-started.md 플레이스홀더 완성 | 온보딩 가이드 완성 | 낮음 |
| P2 | CI lint/test 병렬 실행 | CI 시간 단축 | 낮음 |
| P2 | CI 빌드 캐시 설정 (bun cache, .next cache) | CI 시간 단축 | 낮음 |

**예상 DX 점수 변화: 6.7 -> 7.2 (+0.5)**

### 12.2 중기 (1-2개월) - 핵심 개선

| 우선순위 | 작업 | 예상 효과 | 난이도 |
|---------|------|-----------|--------|
| P0 | 서비스 레이어 테스트 추가 (`api.ts`, `search.ts`, `github.ts`) | 핵심 비즈니스 로직 검증 | 중간 |
| P0 | `lib/` 서버 로직 테스트 추가 (`auth.ts`, `scheduler/`, `webhook/`) | 서버 안정성 + 보안 확보 | 중간 |
| P1 | Vite 레거시 코드 정리 또는 Next.js 마이그레이션 완료 | 이중 구조 혼란 제거 | 높음 |
| P1 | `scripts/` TypeScript 전환 (24파일) | 타입 안전성 확대, 리팩토링 용이 | 중간 |
| P2 | 타입 파일 도메인별 분리 (`types/wiki.ts`, `types/github.ts`, `types/config.ts` 등) | 유지보수성 향상 | 낮음 |
| P2 | PR preview 배포 환경 구축 (Vercel 또는 Netlify) | 리뷰 효율성 향상 | 중간 |
| P2 | `@deprecated WikiTree` -> `WikiTreeItem` 마이그레이션 (11곳) | 기술 부채 감소 | 낮음 |
| P2 | CODEOWNERS 파일 추가 | 자동 리뷰어 할당 | 낮음 |

**예상 DX 점수 변화: 7.2 -> 8.0 (+0.8)**

### 12.3 장기 (3-6개월) - 최적화

| 우선순위 | 작업 | 예상 효과 | 난이도 |
|---------|------|-----------|--------|
| P1 | 커버리지 80% 달성 (CONTRIBUTING.md 목표) | 코드 안정성, 리팩토링 자신감 | 높음 |
| P1 | Vite 빌드 시스템 완전 제거 (Next.js 단일화) | 유지보수 비용 절감, DX 단순화 | 높음 |
| P2 | Storybook 도입 (UI 컴포넌트 카탈로그) | 컴포넌트 개발/테스트 효율화 | 중간 |
| P2 | Visual Regression Testing 도입 (Chromatic 등) | UI 회귀 방지 | 중간 |
| P2 | 성능 벤치마크 CI 연동 (Lighthouse CI) | 성능 모니터링 자동화 | 중간 |
| P3 | API Contract Testing (MSW + OpenAPI) | API 변경 영향 사전 감지 | 중간 |
| P3 | AI 메트릭 대시보드 (품질/비용 추적) | AI 운영 효율성 가시화 | 중간 |
| P3 | ADR(Architecture Decision Records) 체계 도입 | 아키텍처 결정 이력 추적 | 낮음 |

**예상 DX 점수 변화: 8.0 -> 8.8 (+0.8)**

### 12.4 로드맵 타임라인

```
Week 1-2 (단기)          Month 1-2 (중기)          Month 3-6 (장기)
-------------------      -------------------      -------------------
[ ] Prettier 도입        [ ] 서비스 테스트 추가    [ ] 커버리지 80%
[ ] lint-staged          [ ] lib/ 테스트 추가      [ ] Vite 완전 제거
[ ] E2E baseURL 수정     [ ] Vite 레거시 정리      [ ] Storybook 도입
[ ] commitlint           [ ] scripts TS 전환       [ ] Visual Regression
[ ] 문서 통일            [ ] 타입 파일 분리        [ ] Lighthouse CI
[ ] getting-started 완성 [ ] PR preview 배포       [ ] AI 메트릭
[ ] CI 병렬화/캐시       [ ] WikiTree 마이그레이션 [ ] ADR 체계
                         [ ] CODEOWNERS 추가

DX: 6.7 -> 7.2          DX: 7.2 -> 8.0           DX: 8.0 -> 8.8
```

---

## 부록 A: 평가 기준 상세

### 가중치 설정 근거

| 영역 | 가중치 | 근거 |
|------|--------|------|
| 테스트 인프라 | 20% | 코드 변경 자신감과 리팩토링 가능성에 가장 직접적 영향 |
| 온보딩 경험 | 15% | 새 기여자 유입과 생산성 도달 시간(time-to-productivity)에 핵심 |
| 코드 구조 | 15% | 코드 탐색, 이해, 수정의 효율성에 직접 영향 |
| 코드 품질 도구 | 12% | 일상적 개발에서 가장 빈번하게 접하는 DX 요소 |
| CI/CD | 10% | 피드백 루프 속도와 배포 자신감에 영향 |
| AI 지원 | 10% | 프로젝트 특성상 AI 통합이 핵심이나, 전통적 DX와 별도 평가 |
| 타입 시스템 | 8% | IDE 자동완성, 에러 사전 감지 등 개발 속도에 영향 |
| Docker/K8s | 5% | 배포 관련 DX, 일상 개발에서 빈도 낮음 |
| 워크플로우 | 5% | 팀 협업 효율성, 다만 다른 항목에 부분 반영됨 |

## 부록 B: 분석 대상 파일 목록

### 설정 파일
- `package.json` (97줄) - 의존성 및 스크립트
- `tsconfig.json` (54줄) - TypeScript 설정
- `tsconfig.node.json` - Node.js용 TS 설정
- `next.config.js` (109줄) - Next.js 빌드 설정
- `vite.config.ts` (49줄) - Vite 빌드 설정
- `vitest.config.ts` (29줄) - 단위 테스트 설정
- `playwright.config.ts` (67줄) - E2E 테스트 설정
- `eslint.config.js` (32줄) - ESLint 규칙
- `codecov.yml` (34줄) - 커버리지 관리
- `site.config.ts` (68줄) - 사이트 정보
- `theme.config.ts` - 테마 설정
- `navigation.config.ts` - 네비게이션 설정

### 소스 코드
- `src/types/index.ts` (444줄) - 전체 타입 정의
- `src/config.ts` (157줄) - 앱 설정 + URL 헬퍼
- `src/App.tsx` (81줄) - Vite SPA 엔트리
- `src/services/api.ts` - API 서비스
- `src/services/github.ts` - GitHub API
- `src/services/search.ts` - 검색 서비스

### 테스트 파일
- `src/components/wiki/MarkdownRenderer.test.tsx` (263줄)
- `src/context/ThemeContext.test.tsx` (257줄)
- `src/hooks/useWiki.test.tsx` (309줄)
- `src/config.test.ts` (99줄)
- `src/utils/index.test.ts` (128줄)
- `e2e/accessibility.spec.ts` (120줄)
- `e2e/responsive.spec.ts` (90줄)
- `e2e/theme.spec.ts` (62줄)
- `e2e/navigation.spec.ts` (53줄)
- `e2e/search.spec.ts` (52줄)

### CI/CD 워크플로우
- `.github/workflows/ci.yml` (135줄)
- `.github/workflows/deploy-pages.yml` (95줄)
- `.github/workflows/docker-build.yml` (79줄)
- `.github/workflows/codeql.yml` (43줄)
- 기타 10개 워크플로우

### 인프라
- `docker/Dockerfile` (87줄)
- `docker/docker-compose.yml` (74줄)
- `docker/docker-compose.dev.yml` (74줄)
- `helm/sepilot-wiki/values.yaml` (162줄)
- `helm/sepilot-wiki/values-prod.yaml`

### 문서
- `CLAUDE.md` - Claude AI 지침
- `GEMINI.md` - Gemini AI 지침
- `CONTRIBUTING.md` (152줄) - 기여 가이드
- `CHANGELOG.md` - 변경 이력
- `.github/PULL_REQUEST_TEMPLATE.md` (34줄) - PR 템플릿
- `.github/ISSUE_TEMPLATE/` (3개 템플릿 + config)
- `guide/` (8개 마크다운 파일)

---

> **작성**: Claude Opus 4.6 (개발자 경험 분석)
> **근거**: 소스코드 직접 분석 기반 (설정 12파일, 소스 75파일, 테스트 10파일, CI/CD 14워크플로우, 인프라 5파일, 문서 8파일)
> **분석 방법론**: DX 성숙도 모델 (5단계) + 가중 평균 점수 체계
