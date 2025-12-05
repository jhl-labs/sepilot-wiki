---
title: 시작하기
tags: [시작하기, 설치, 배포]
---

# 시작하기

SEPilot Wiki를 사용하여 나만의 위키를 만드는 방법을 안내합니다.

## 설치 및 배포

### 1. 템플릿 복제

```bash
# GitHub에서 템플릿 복제
gh repo create my-wiki --template jhl-labs/sepilot-wiki --public
cd my-wiki
```

### 2. 의존성 설치 및 개발 서버 실행

```bash
bun install
bun dev
```

### 3. 설정 파일 수정

루트 디렉토리의 설정 파일들을 수정합니다:

- `site.config.ts` - 사이트 기본 정보 (타이틀, 로고, 소셜 링크)
- `theme.config.ts` - 테마 설정 (색상, 폰트, 레이아웃)
- `navigation.config.ts` - 사이드바 메뉴 설정

### 4. GitHub Pages 배포

```bash
git add -A && git commit -m "Initial setup"
git push origin main
```

GitHub Actions가 자동으로 빌드 후 GitHub Pages에 배포합니다.

## 문서 작성 방식

### 방법 1: 직접 작성
`/wiki` 폴더에 마크다운 파일을 직접 추가합니다.

### 방법 2: AI 자동 생성
GitHub Issue에 `request` 라벨을 추가하면 AI가 문서 초안을 자동 생성합니다.

## 다음 단계

- [테마 커스터마이징](/wiki/_guide/customization) - 색상, 폰트, 로고 변경
- [LLM 워크플로우](/wiki/_guide/llm-workflow) - AI 문서 생성 과정 이해
- [설정 파일 가이드](/wiki/_guide/configuration) - 상세 설정 옵션
