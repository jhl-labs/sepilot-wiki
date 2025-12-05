# SEPilot Wiki - Claude Code 프로젝트 지침

## 프로젝트 개요
GitHub Wiki 기반의 AI 자동화 위키 시스템. Next.js + React + TypeScript + Vite + Bun 스택 사용.

## 코드 규칙

### 언어 및 응답
- 모든 응답은 한국어로 작성
- 코드 주석도 한국어 권장

### 보안 규칙 (중요)
- 시스템 사용자명, IP, 호스트 정보가 코드에 절대 노출되면 안됨
- 환경변수 또는 설정 파일을 통해 민감 정보 관리
- `.env` 파일은 반드시 `.gitignore`에 포함

### 코드 스타일
- TypeScript strict 모드 사용
- ESLint + Prettier 설정 준수
- 컴포넌트는 함수형 컴포넌트로 작성
- React hooks 규칙 준수

### 파일 구조
```
src/
├── components/    # React 컴포넌트
├── pages/         # Next.js 페이지
├── hooks/         # 커스텀 훅
├── utils/         # 유틸리티 함수
├── types/         # TypeScript 타입 정의
└── services/      # API 서비스 레이어
```

### Git 규칙
- 모든 변경사항은 반드시 commit & push
- 커밋 메시지는 한국어로 작성 가능
- 브랜치 전략: main (배포), develop (개발), feature/* (기능)

## GitHub 연동

### Wiki 동기화
- GitHub API를 통한 Wiki 콘텐츠 관리
- Wiki 변경 시 GitHub Actions 트리거

### Issue 처리
- `request` 라벨: AI 문서 작성 요청
- `invalid` 라벨: 문서 수정 필요 표시
- Issue 댓글: maintainer 피드백

### GitHub Actions
- Wiki 변경 → Pages 빌드 트리거
- cron 스케줄 → 시스템 정보 수집

## 주요 명령어

```bash
bun install      # 의존성 설치
bun dev          # 개발 서버
bun run build    # 프로덕션 빌드
bun run lint     # 린트 검사
bun run test     # 테스트 실행
```

## 환경 변수

```env
GITHUB_TOKEN=        # GitHub API 토큰
GITHUB_REPO=         # 대상 저장소 (owner/repo)
GITHUB_WIKI_REPO=    # Wiki 저장소
```
