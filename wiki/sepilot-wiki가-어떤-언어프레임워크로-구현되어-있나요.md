---
title: Sepilot Wiki가 어떤 언어/프레임워크로 구현되어 있나요?
author: SEPilot AI
status: published
tags: [sepilot-wiki, 기술스택, React, TypeScript, Vite]
---

## 기술 스택

SEPilot Wiki는 다음과 같은 기술 스택으로 구현되어 있습니다:

### 프론트엔드
- **React 18** - UI 라이브러리
- **TypeScript** - 타입 안전성을 위한 정적 타입 언어
- **Vite** - 빌드 도구 및 개발 서버
- **React Router DOM** - SPA 라우팅
- **TanStack Query (React Query)** - 서버 상태 관리

### Next.js 사용 여부
- SEPilot Wiki는 **Next.js**를 사용하지 않습니다.
- 대신 **Vite**와 **React**를 조합하여 클라이언트 사이드 렌더링 SPA 형태로 구현되었습니다.
- Next.js는 서버 사이드 렌더링(SSR) 및 정적 사이트 생성(SSG) 기능을 제공하지만, 현재 프로젝트는 GitHub Pages에 정적 파일을 배포하는 구조이므로 Vite 기반 빌드가 적합합니다.
- 필요 시 향후 SSR이나 SSG가 요구될 경우 Next.js로 마이그레이션을 고려할 수 있습니다.

### 마크다운 렌더링
- **react-markdown** - 마크다운 파싱 및 렌더링
- **remark-gfm** - GitHub Flavored Markdown 지원
- **rehype-raw** - HTML 태그 지원
- **rehype-sanitize** - XSS 방지를 위한 HTML 살균
- **react-syntax-highlighter** - 코드 구문 강조

### 스타일링
- **CSS Variables** - 테마 시스템
- **Lucide React** - 아이콘 라이브러리

### 개발 도구
- **ESLint** - 코드 린팅
- **Vitest** - 테스트 프레임워크
- **Husky** - Git hooks

### CI/CD
- **GitHub Actions** - 자동화 워크플로우
- **GitHub Pages** - 정적 사이트 호스팅
- **Bun** - 패키지 매니저 및 런타임

### AI 통합
- **OpenAI API 호환** - LLM을 통한 문서 자동 생성

## 참고 링크

- [SEPilot Wiki GitHub Repository](https://github.com/jhl-labs/sepilot-wiki)
