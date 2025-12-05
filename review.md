# Sepilot Wiki 프로젝트 리뷰 (Frontend 중심)

## 1. 총평
전반적으로 **React 18 + Vite + TypeScript** 기반의 현대적이고 깔끔한 아키텍처를 유지하고 있습니다.
**React Query**를 통한 서버 상태 관리와 **Context API**를 통한 전역 상태(테마, 설정) 관리가 적절히 분리되어 있어 유지보수성이 높습니다.

## 2. 잘된 점 (Pros)
- **명확한 폴더 구조**: `components`, `pages`, `hooks`, `services` 등 역할별 분리가 잘 되어 있습니다.
- **적절한 상태 관리**:
  - `react-query`: 비동기 데이터 캐싱 및 관리
  - `Context API`: UI 테마, 사이드바 상태 등 클라이언트 전역 상태 관리
- **GitHub Pages 호환성**: `SpaRedirectHandler`를 통해 SPA 라우팅 문제를 해결하고 있습니다.
- **타입 안정성**: TypeScript를 Strict 모드로 사용하여 타입 안정성을 확보하고 있습니다.

## 3. 개선이 필요한 부분 (Areas for Improvement)

### A. 서비스 레이어 (`src/services/github.ts`) 리팩토링 [High Priority]
현재 `github.ts` 파일이 과도하게 많은 책임을 지고 있습니다 (약 900라인).
다음과 같은 모듈로 분리할 것을 권장합니다:

1.  **`src/services/api.ts`**: 실제 데이터 페칭 (fetchWikiData, fetchIssues 등)
2.  **`src/services/search.ts`**: 검색 로직 (searchWiki)
3.  **`src/data/guides.ts`**: 하드코딩된 가이드 데이터 (getGuidePage)

### B. 하드코딩된 가이드 컨텐츠 개선
`getGuidePage` 함수 내에 마크다운 컨텐츠가 TypeScript 문자열로 하드코딩되어 있습니다.
- **문제점**: 유지보수가 어렵고, 코드 번들 사이즈를 불필요하게 키웁니다.
- **개선안**:
    - 가이드 문서를 실제 `.md` 파일로 `/public/guides` 또는 `/src/assets/guides` 등으로 분리
    - 런타임에 fetch 하거나 빌드 타임에 import 하는 방식으로 변경

### C. 검색 로직 최적화
`searchWiki` 함수가 클라이언트 사이드에서 전체 텍스트 검색을 수행하고 있습니다.
- 현재는 데이터가 적어 괜찮지만, 문서가 많아질 경우 메인 스레드를 차단할 수 있습니다.
- **개선안**:
    - 검색 로직을 Web Worker로 분리
    - 또는 `fuse.js` 같은 최적화된 경량 검색 라이브러리 도입 고려

### D. CSS 변수 및 스타일링
`src/styles`에 CSS 파일들이 분산되어 있습니다.
- `index.css`와 `custom.css`, `variables.css` 간의 관계를 명확히 하고, 컴포넌트별 스타일(`components.css`)이 너무 비대해지지 않도록 주의가 필요합니다.
- CSS Modules 도입을 고려하여 클래스 이름 충돌 방지 및 유지보수성 향상 검토

## 4. 추천 액션 아이템

1.  **`github.ts` 분리**: 가장 시급한 리팩토링 과제입니다.
2.  **가이드 문서 파일화**: 하드코딩된 문자열을 외부 파일로 추출합니다.
3.  **검색 성능 모니터링**: 문서 수가 100개를 넘어가는 시점에 검색 성능 점검이 필요합니다.

---
이 리뷰는 2024-12-06 기준 코드베이스를 바탕으로 작성되었습니다.
