# SEPilot Wiki - Gemini 개발 가이드라인

## 1. 프로젝트 개요
GitHub Contents API 기반의 자체 Wiki 시스템입니다. AI 에이전트가 `/wiki` 폴더의 문서를 관리하고, 사용자는 웹 인터페이스를 통해 이를 열람합니다.

## 2. 기술 스택
- **Framework**: React 18, Vite
- **Language**: TypeScript
- **Styling**: Vanilla CSS (CSS Variables 활용, `src/styles/*`)
- **Package Manager**: pnpm (권장), npm/bun 호환
- **Markdown**: `react-markdown`, `rehype`, `remark` 생태계 활용

## 3. 핵심 원칙 (User Rules)
- **언어**: 모든 대답과 주석은 **한국어**로 작성합니다.
- **보안**: 
  - 사용자명, IP, 호스트명 등 민감 정보는 코드에 하드코딩하지 않습니다.
  - `.env` 파일을 통해 환경 변수를 관리합니다.

## 4. 코드 컨벤션
- **TypeScript**: Strict Mode 준수. `any` 사용을 지양하고 명시적인 타입을 정의합니다.
- **Components**: Functional Component + Hooks 패턴을 사용합니다.
- **Styling**:
  - `src/styles/variables.css`에 정의된 색상 및 스타일 변수를 적극 활용합니다.
  - `tailwind` 대신 기본 CSS 파일을 사용합니다.
- **Linting**: ESLint 규칙을 준수하며, 커밋 전 `pnpm lint` 통과를 목표로 합니다.

## 5. 폴더 구조
- `/wiki`: 위키 데이터 (Markdown 파일들)
- `/src/components`: 재사용 가능한 UI 컴포넌트
- `/src/pages`: 라우트 페이지
- `/src/hooks`: 커스텀 React Hooks
- `/src/services`: API 호출 및 데이터 로직
- `/src/styles`: 전역 및 모듈별 CSS 파일
- `/scripts`: 빌드 및 유틸리티 스크립트

## 6. 주요 명령어 (pnpm 기준)
```bash
pnpm install     # 의존성 설치
pnpm dev         # 개발 서버 실행
pnpm build       # 프로덕션 빌드 (Wiki 데이터 + Search 인덱스 포함)
pnpm lint        # 코드 스타일 검사
pnpm test        # 테스트 실행 (Vitest)
```

## 7. 작업 흐름 (Workflow)
1. **문제 파악**: 요구사항을 명확히 이해하고, 모호한 점은 질문합니다.
2. **Task 관리**: 작업이 복잡할 경우 `task_boundary`를 사용하여 진행 상황을 구조화합니다.
3. **구현**: 기존 코드 스타일과 변수명을 따릅니다.
4. **검증**: 변경 사항이 기존 기능(특히 빌드 스크립트 등)을 깨뜨리지 않는지 확인합니다.

---
*이 문서는 프로젝트의 변화에 따라 지속적으로 업데이트되어야 합니다.*
