# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-12-06

### Added

#### Core Features
- **Wiki System**: 저장소 `/wiki` 폴더 기반 마크다운 문서 관리
- **GitHub Pages Frontend**: React + TypeScript + Vite 기반 정적 사이트
- **AI Document Generation**: GitHub Issue `request` 라벨을 통한 자동 문서 생성
- **Maintainer Feedback**: Issue 댓글을 통한 AI 기반 문서 수정
- **Auto Wiki Tree Maintenance**: AI 기반 문서 구조 자동 정비

#### Pages
- HomePage: 최근 문서, 태그 워드클라우드, 통계 대시보드
- WikiPage: 마크다운 렌더링, TOC, 리비전 히스토리
- SearchPage: Fuse.js 기반 전문 검색
- IssuesPage: GitHub Issues 연동 및 필터링
- TagsPage: 태그별 문서 분류
- AIHistoryPage: AI 작업 이력 타임라인

#### Components
- MarkdownRenderer: GFM 지원, 코드 하이라이팅, Mermaid 다이어그램, Plotly 차트
- Sidebar: 계층적 문서 네비게이션
- WorkflowStatus: GitHub Actions 상태 표시
- ThemeToggle: 라이트/다크/시스템 테마 지원

#### GitHub Actions Workflows
- `deploy-pages.yml`: GitHub Pages 자동 배포 (10분 주기 동기화)
- `issue-handler.yml`: Issue 이벤트 처리 (라벨, 댓글)
- `scheduled-collect.yml`: 시스템 상태 정보 자동 수집
- `wiki-tree-maintainer.yml`: Wiki 구조 자동 정비
- `gemini-issue-handler.yml`: Gemini 기반 Issue 처리
- `gemini-pr-review.yml`: PR 자동 리뷰

### Security
- Path Traversal 방지: `maintain-wiki-tree.js`, `process-feedback.js`에 경로 검증 추가
- XSS 방지: MermaidDiagram에 DOMPurify 적용
- Prompt Injection 방지: AI 프롬프트에 보안 규칙 추가
- CSP 헤더: Content-Security-Policy, X-Frame-Options, X-Content-Type-Options 설정
- prismjs 취약점 해결: react-syntax-highlighter 16.1.0 업그레이드

### Testing
- 테스트 커버리지 69% 달성
- MarkdownRenderer 테스트 (18개)
- useWiki hooks 테스트 (12개)
- ThemeContext 테스트 (10개)
- config, utils 테스트 (37개)

### Technical Details
- **Framework**: React 18.3.1 + TypeScript 5.x
- **Build Tool**: Vite 7.2.6
- **State Management**: TanStack Query 5.x
- **Routing**: React Router 7.x
- **Styling**: CSS Variables + Custom CSS
- **Testing**: Vitest + Testing Library

### Known Issues
- 번들 크기가 큼 (index.js ~6.4MB) - 다이어그램 라이브러리가 원인
- MermaidDiagram, PlotlyChart 테스트 미작성 (0% 커버리지)

---

## [Unreleased]

### Added
- **E2E 테스트 환경**: Playwright 기반 E2E 테스트 구축
  - `navigation.spec.ts`: 페이지 네비게이션 테스트
  - `search.spec.ts`: 검색 기능 테스트
  - `theme.spec.ts`: 테마 전환 테스트
  - `responsive.spec.ts`: 반응형 디자인 테스트
  - `accessibility.spec.ts`: 접근성 테스트
- **CI E2E 단계**: GitHub Actions에 E2E 테스트 자동화 추가
- **환경 변수 예시**: `.env.example` 파일 추가
- **구조화된 에러 타입**: `ApiError`, `ApiErrorCode` 타입 및 헬퍼 함수
- **Lazy Loading**: Mermaid/Plotly 컴포넌트 동적 로딩으로 번들 최적화
- **접근성 개선**:
  - Skip link (본문으로 바로 가기)
  - ARIA 속성 대폭 추가 (role, aria-label, aria-expanded 등)
  - 아이콘에 aria-hidden 적용
- **JSDoc 문서화**: 주요 컴포넌트에 JSDoc 주석 추가

### Changed
- **pre-commit 훅 강화**: lint 실패 시 커밋 차단
- **WikiPage 타입**: `menu` 속성 추가

### Fixed
- TypeScript strict 모드 테스트 파일 타입 오류 수정

---

### Planned for 0.2.0
- 테스트 커버리지 80% 목표
- 의존성 업데이트 (React 19, date-fns 4)
