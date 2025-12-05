# SEPilot Wiki - Claude Code 프로젝트 지침

## 프로젝트 개요
저장소 `/wiki` 폴더 기반의 AI 자동화 위키 시스템. React + TypeScript + Vite + Bun 스택 사용.
GitHub Contents API를 통해 `/wiki` 폴더의 마크다운 파일을 관리.

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
sepilot-wiki/
├── wiki/              # Wiki 문서 (마크다운 파일)
├── src/
│   ├── components/    # React 컴포넌트
│   ├── pages/         # 페이지 컴포넌트
│   ├── hooks/         # 커스텀 훅
│   ├── context/       # React Context
│   ├── types/         # TypeScript 타입 정의
│   ├── services/      # API 서비스 레이어
│   └── styles/        # CSS 스타일
└── .github/workflows/ # GitHub Actions
```

### Git 규칙
- 모든 변경사항은 반드시 commit & push
- 커밋 메시지는 한국어로 작성 가능
- 브랜치 전략: main (배포), develop (개발), feature/* (기능)

## GitHub 연동

### Wiki 데이터 관리
- Wiki 문서는 저장소 `/wiki` 폴더에 마크다운 파일로 저장
- GitHub Contents API로 파일 목록 및 내용 조회
- Raw URL (`raw.githubusercontent.com`)로 마크다운 파일 직접 접근

### Issue 처리
- `request` 라벨: AI 문서 작성 요청
- `invalid` 라벨: 문서 수정 필요 표시
- Issue 댓글: maintainer 피드백

### GitHub Actions
- `/wiki` 폴더 변경 → Pages 빌드 트리거
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
GITHUB_TOKEN=        # GitHub API 토큰 (선택, 공개 저장소는 불필요)
GITHUB_REPO=         # 대상 저장소 (owner/repo)
```
