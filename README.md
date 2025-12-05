# SEPilot Wiki

AI 에이전트 기반의 자동화된 위키 시스템입니다. GitHub Wiki를 백엔드로 활용하고, GitHub Issues를 통해 사용자와 소통하며, AI가 문서를 생성/수정/유지보수합니다.

## 주요 기능

- **GitHub Wiki 통합**: GitHub Wiki를 데이터 저장소로 활용
- **GitHub Pages 프론트엔드**: 정적 사이트로 위키 콘텐츠 제공
- **AI 기반 문서 작성**: GitHub Issue의 `request` 라벨을 통해 AI가 자동으로 문서 초안 작성
- **협업 워크플로우**: maintainer가 Issue 댓글로 수정 요청 시 자동 반영
- **자동 정보 수집**: cron 스케줄을 통해 시스템 상태 정보 자동 업데이트 (k8s 노드 상태, 서비스 health 등)

## 워크플로우

### 문서 요청 프로세스
1. 사용자가 GitHub Issue 생성 후 `request` 라벨 추가
2. AI가 요청에 맞는 문서 초안 작성 (AI 작성 및 미검토 표기)
3. Maintainer가 Issue 댓글로 수정 사항 피드백
4. AI가 피드백 반영하여 문서 업데이트
5. Issue close 시 "(초안)" 표기 제거

### 문서 수정 워크플로우
- `invalid` 라벨 추가 시: 페이지 상단에 "잘못됨, 수정 필요" 경고 표시
- 직접 Wiki 수정: GitHub Actions가 트리거되어 Pages 자동 업데이트

## 기술 스택

- **프레임워크**: Next.js + React + TypeScript
- **빌드 도구**: Vite
- **런타임**: Bun
- **CI/CD**: GitHub Actions
- **호스팅**: GitHub Pages

## 프로젝트 구조

```
sepilot-wiki/
├── .claude/              # Claude Code 설정
│   └── commands/         # 슬래시 커맨드
├── .github/
│   └── workflows/        # GitHub Actions 워크플로우
├── src/                  # 소스 코드
├── CLAUDE.md            # 프로젝트별 Claude 지시사항
├── PROTOTYPE.md         # 프로토타입 명세
└── README.md            # 프로젝트 문서
```

## 시작하기

### 사전 요구사항
- Bun 1.0 이상
- GitHub 계정 및 저장소

### 설치

```bash
# 의존성 설치
bun install

# 개발 서버 실행
bun dev

# 빌드
bun run build
```

## 기여 방법

1. Issue를 통해 기능 제안 또는 버그 리포트
2. `request` 라벨로 문서 작성 요청
3. PR을 통한 직접 기여

## 라이선스

MIT License
