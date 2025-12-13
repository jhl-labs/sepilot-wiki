# SEPilot Wiki

[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Deployed-success)](https://sepilot.github.io/sepilot-wiki)
[![Test Coverage](https://img.shields.io/badge/coverage-69%25-yellow)](./CHANGELOG.md)
[![License](https://img.shields.io/badge/license-SEPilot-blue)](./LICENSE)

AI 에이전트 기반의 자동화된 위키 시스템입니다. 저장소의 `/wiki` 폴더를 데이터 저장소로 활용하고, GitHub Issues를 통해 사용자와 소통하며, AI가 문서를 생성/수정/유지보수합니다.

## 주요 기능

### Core Features
- **저장소 기반 Wiki**: `/wiki` 폴더의 마크다운 파일을 GitHub Contents API로 관리
- **GitHub Pages 프론트엔드**: React + TypeScript + Vite 기반 정적 사이트
- **AI 기반 문서 작성**: GitHub Issue의 `request` 라벨을 통해 AI가 자동으로 문서 초안 작성
- **협업 워크플로우**: maintainer가 Issue 댓글로 수정 요청 시 자동 반영
- **Wiki Tree 자동 정비**: AI 기반 문서 구조 자동 유지보수
- **자동 정보 수집**: cron 스케줄을 통해 시스템 상태 정보 자동 업데이트

### Pages
- **HomePage**: 최근 문서, 태그 워드클라우드, 통계 대시보드
- **WikiPage**: 마크다운 렌더링, TOC, 리비전 히스토리
- **SearchPage**: Fuse.js 기반 전문 검색
- **IssuesPage**: GitHub Issues 연동 및 필터링
- **TagsPage**: 태그별 문서 분류
- **AIHistoryPage**: AI 작업 이력 타임라인

### Components
- **MarkdownRenderer**: GFM 지원, 코드 하이라이팅, Mermaid 다이어그램, Plotly 차트
- **Sidebar**: 계층적 문서 네비게이션
- **ThemeToggle**: 라이트/다크/시스템 테마 지원

## 워크플로우

### 문서 요청 프로세스
1. 사용자가 GitHub Issue 생성 후 `request` 라벨 추가
2. AI가 요청에 맞는 문서 초안 작성 (AI 작성 및 미검토 표기)
3. Maintainer가 Issue 댓글로 수정 사항 피드백
4. AI가 피드백 반영하여 문서 업데이트
5. Issue close 시 "(초안)" 표기 제거

### 문서 수정 워크플로우
- `invalid` 라벨 추가 시: 페이지 상단에 "잘못됨, 수정 필요" 경고 표시
- 직접 `/wiki` 폴더 수정: GitHub Actions가 트리거되어 Pages 자동 업데이트

## 기술 스택

| 카테고리 | 기술 |
|---------|------|
| **Framework** | React 18.3.1 + TypeScript 5.x |
| **Build Tool** | Vite 7.2.6 |
| **Runtime** | Bun 1.0+ |
| **State Management** | TanStack Query 5.x |
| **Routing** | React Router 7.x |
| **Styling** | CSS Variables + Custom CSS |
| **Testing** | Vitest + Testing Library |
| **CI/CD** | GitHub Actions |
| **Hosting** | GitHub Pages |

### 보안
- Path Traversal 방지 (경로 검증)
- XSS 방지 (DOMPurify)
- Content-Security-Policy 헤더
- Prompt Injection 방지

## 프로젝트 구조

```
sepilot-wiki/
├── .github/
│   └── workflows/        # GitHub Actions 워크플로우
│       ├── deploy-pages.yml       # GitHub Pages 배포
│       ├── issue-handler.yml      # Issue 이벤트 처리
│       ├── wiki-tree-maintainer.yml # Wiki 구조 정비
│       └── scheduled-collect.yml  # 시스템 정보 수집
├── wiki/                 # Wiki 문서 (마크다운 파일)
├── src/
│   ├── components/       # React 컴포넌트
│   ├── pages/           # 페이지 컴포넌트
│   ├── hooks/           # 커스텀 훅
│   ├── context/         # React Context
│   ├── types/           # TypeScript 타입 정의
│   ├── services/        # API 서비스 레이어
│   └── styles/          # CSS 스타일
├── scripts/             # Node.js 스크립트 (CI/CD용)
├── CLAUDE.md           # 프로젝트별 Claude 지시사항
├── CHANGELOG.md        # 변경 이력
└── README.md           # 프로젝트 문서
```

## 시작하기

### 사전 요구사항
- Bun 1.0 이상 또는 Node.js 18+
- GitHub 계정 및 저장소

### 설치

```bash
# 의존성 설치
bun install
# 또는
npm install

# 개발 서버 실행
bun dev

# 빌드
bun run build

# 테스트 실행
bun test

# Lint 검사
bun run lint
```

### 환경 변수 (선택)

```env
GITHUB_TOKEN=        # GitHub API 토큰 (rate limit 완화)
GITHUB_REPO=         # 대상 저장소 (owner/repo)
```

## Wiki 문서 추가 방법

### 직접 추가
1. `/wiki` 폴더에 마크다운 파일 생성
2. 프론트매터 작성 (선택사항)
   ```markdown
   ---
   title: 문서 제목
   author: 작성자
   tags: [태그1, 태그2]
   ---

   # 문서 내용
   ```
3. PR 또는 직접 커밋으로 저장소에 반영

### AI를 통한 추가
1. GitHub Issue 생성
2. `request` 라벨 추가
3. 원하는 문서 내용 설명
4. AI가 초안 작성 후 Maintainer 검토

## 테스트

현재 테스트 커버리지: **69%**

```bash
# 전체 테스트 실행
bun test

# 커버리지 리포트
bun test --coverage

# Watch 모드
bun test --watch
```

테스트 대상:
- MarkdownRenderer 컴포넌트 (18개 테스트)
- useWiki hooks (12개 테스트)
- ThemeContext (10개 테스트)
- config, utils (37개 테스트)

## 기여 방법

1. Issue를 통해 기능 제안 또는 버그 리포트
2. `request` 라벨로 문서 작성 요청
3. PR을 통한 직접 기여

### 개발 가이드
- 코드 스타일: ESLint + Prettier 설정 준수
- 커밋 전 lint 검사 필수 (`bun run lint`)
- TypeScript strict 모드 사용
- 테스트 작성 권장

## 릴리즈 노트

자세한 변경 이력은 [CHANGELOG.md](./CHANGELOG.md)를 참조하세요.

## 라이선스

SEPilot License - 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

### 요약
- **바이너리 사용**: 개인 및 상업적 용도 모두 무료 사용 가능
- **소스 코드**: 개인/교육/비상업적 용도로 사용, 수정, 배포 가능
- **기업의 상업적 사용**: 소스 코드의 상업적 사용은 사전 서면 허가 필요
- **알림 의무**: 소스 코드 수정 또는 배포 시 라이선서에 통지 필요
