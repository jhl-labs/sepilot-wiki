---
title: LLM 워크플로우
tags: [LLM, 워크플로우, AI, GitHub Actions]
---

# LLM 워크플로우

SEPilot Wiki는 GitHub Actions와 LLM을 연동하여 자동으로 문서를 생성하고 관리합니다.

## 워크플로우 개요

```
사용자                  GitHub Actions              LLM
  │                         │                        │
  ├─ Issue 생성 ───────────>│                        │
  │  (request 라벨)         │                        │
  │                         ├─ 컨텍스트 수집 ────────>│
  │                         │  (Issue 본문+댓글)      │
  │                         │                        │
  │                         │<─ 문서 생성 ────────────┤
  │                         │                        │
  │<─ 댓글로 결과 알림 ──────┤                        │
  │                         │                        │
  ├─ 피드백 댓글 ──────────>│                        │
  │                         ├─ 피드백 분석 ──────────>│
  │                         │                        │
  │                         │<─ 문서 수정 ────────────┤
  │                         │                        │
```

## 지원하는 이벤트

### 1. request 라벨 추가

Issue에 `request` 라벨을 추가하면:

1. AI가 Issue 제목과 본문을 분석
2. 관련 문서 초안 자동 생성
3. `wiki/` 폴더에 마크다운 파일 저장
4. Issue에 결과 댓글 추가
5. `draft`, `ai-generated` 라벨 자동 추가

### 2. invalid 라벨 추가

문서에 오류가 있을 때 `invalid` 라벨을 추가하면:

1. AI가 Issue 댓글에서 오류 내용 파악
2. 해당 문서 자동 수정
3. 수정 결과 댓글로 알림

### 3. Maintainer 댓글

Maintainer가 댓글을 달면:

1. AI가 댓글 내용 분석
2. 문서 수정, 삭제, 복구 등 작업 수행
3. 작업 결과 댓글로 알림

### 4. Issue 종료

Issue를 close하면:

1. `draft` 라벨 제거
2. 문서가 정식 게시 상태로 전환

## LLM 설정

### 환경 변수

GitHub Repository Secrets에 다음 값을 설정합니다:

```
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_API_KEY=your-api-key
OPENAI_MODEL=gpt-4
```

### 지원하는 LLM 제공자

OpenAI 호환 API를 사용하는 모든 제공자를 지원합니다:

- OpenAI (GPT-4, GPT-3.5)
- Azure OpenAI
- Anthropic Claude (OpenAI 호환 API 사용 시)
- Local LLM (Ollama, LM Studio 등)

## 컨텍스트 수집

AI는 다음 정보를 수집하여 작업을 수행합니다:

- **Issue 본문**: 사용자의 초기 요청
- **모든 댓글**: 대화 히스토리 및 피드백
- **기존 문서**: 관련 문서가 있으면 해당 내용
- **이전 작업 결과**: 이전에 생성된 문서 경로

이를 통해 AI는 전체 맥락을 이해하고 적절한 작업을 수행합니다.

## 문서 생성 규칙

AI가 생성하는 문서는 다음 규칙을 따릅니다:

- YAML frontmatter 포함 (title, author, tags)
- 한국어로 작성
- 마크다운 형식
- 코드 예시 포함 (해당되는 경우)

### frontmatter 예시

```markdown
---
title: 문서 제목
author: SEPilot AI
tags: [태그1, 태그2]
---

# 문서 제목

본문 내용...
```

## 워크플로우 파일

`.github/workflows/issue-handler.yml`에서 워크플로우를 확인하고 수정할 수 있습니다.

주요 스크립트:

- `scripts/generate-document.js` - 새 문서 생성
- `scripts/process-feedback.js` - 피드백 처리
- `scripts/mark-invalid.js` - 오류 표시 처리
- `scripts/publish-document.js` - 문서 발행
