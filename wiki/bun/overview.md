---
title: bun 이란?
author: SEPilot AI
status: published
tags: ["bun", "npm", "yarn", "패키지 매니저", "가이드", "runtime", "javascript-runtime", "package-manager"]
redirect_from:
  - bun-bun-overview
  - bun-overview
  - bun-bun-overview
  - bun-overview
  - bun-bun-overview
  - bun-overview
  - 요청-bun이란
related_docs: ["comparison-pnpm-npm.md", "github-actions-setup.md"]
order: 1
quality_score: 75
---

## 개요

**bun**은 JavaScript/TypeScript 런타임, 번들러, 그리고 패키지 매니저를 하나로 통합한 도구입니다.
- **런타임**: Node.js와 호환되는 API를 제공하면서 V8 엔진 대신 **JavaScriptCore**(Apple의 엔진)를 사용합니다.
- **번들러**: `bun build` 명령을 통해 ES 모듈, CommonJS, TypeScript 등을 빠르게 번들링합니다.
- **패키지 매니저**: `bun install` 로 npm 레지스트리의 패키지를 설치하며, `package.json`과 `node_modules` 구조를 그대로 사용합니다.

공식 웹사이트: https://bun.sh
GitHub 레포지터리: https://github.com/oven-sh/bun

## bun을 선택한 이유

| 항목 | 설명 |
|------|------|
| **성능** | Zig 언어와 JavaScriptCore를 활용해 파일 I/O, 네트워크, 패키지 설치, 번들링 속도가 기존 Node.js 기반 도구보다 현저히 빠릅니다. 공식 벤치마크에서는 `npm install` 대비 2~3배, `webpack` 대비 5~10배 빠른 결과가 보고되었습니다. |
| **통합 도구** | 런타임, 번들러, 패키지 매니저가 하나의 바이너리(`bun`)에 포함돼 별도 설치가 필요 없습니다. 개발 환경 설정이 간단해집니다. |
| **Zero‑Config 지원** | `bun run` 명령만으로 TypeScript 파일을 바로 실행할 수 있어 별도 `ts-node` 설정이 불필요합니다. |
| **호환성** | 대부분의 npm 패키지를 그대로 사용할 수 있으며, `package.json` 스크립트도 그대로 동작합니다. |
| **경량 설치 파일** | 단일 실행 파일(≈ 30 MB)로 배포되어 CI/CD 파이프라인에 쉽게 통합할 수 있습니다. |

## 장점

- **빠른 설치 및 실행**
  - `bun install` 은 병렬 I/O와 캐시 최적화를 통해 npm/yarn 대비 수 초 내에 의존성을 설치합니다.
- **내장 번들러**
  - `bun build` 로 ESBuild와 유사한 속도로 번들을 생성하며, 자동 트리쉐이킹과 코드 스플리팅을 지원합니다.
- **TypeScript 지원**
  - 별도 트랜스파일러 없이 `bun run src/index.ts` 로 바로 실행 가능.
- **단일 바이너리**
  - 런타임, 번들러, 패키지 매니저가 하나의 실행 파일에 포함돼 환경 관리가 단순합니다.
- **POSIX 호환**
  - macOS, Linux, Windows(WSL 포함)에서 동일한 바이너리를 사용합니다.

## 단점

- **생태계 성숙도**
  - npm/yarn에 비해 아직 사용자가 적고, 일부 복잡한 네이티브 모듈(예: `node-gyp` 기반)에서 호환성 문제가 발생할 수 있습니다.
- **플러그인 및 툴링**
  - Webpack, Rollup 등 기존 번들러용 플러그인 생태계와 직접 호환되지 않으며, bun 전용 플러그인도 아직 제한적입니다.
- **문서 및 커뮤니티**
  - 공식 문서는 꾸준히 업데이트되고 있지만, Stack Overflow 등 커뮤니티 기반 Q&A가 상대적으로 적습니다.
- **버전 관리**
  - 현재는 `bun` 자체가 버전 관리 도구 역할을 하지 않으며, 프로젝트별 Node.js 버전 관리와는 별개로 다루어야 합니다.

## 라이선스 및 역사

- **라이선스**: MIT License (오픈 소스, 자유롭게 사용·수정·배포 가능)
- **주요 연혁**
  - **2021년 5월**: 프로젝트 초기 설계 및 공개 발표 (Jarred Sumner, Oven.sh 팀)
  - **2022년 1월**: 첫 베타 버전(`bun v0.1.0`) 공개, GitHub 스타 수 급증
  - **2022년 8월**: `bun v0.2.0` 에서 패키지 매니저 기능 정식 추가
  - **2023년 3월**: `bun v0.3.0` 에서 TypeScript 실행 지원 및 `bun build` 도입
  - **2024년 11월**: `bun v0.5.0` 에서 Windows 지원 및 안정화 버전 출시

자세한 릴리즈 노트는 GitHub Releases 페이지(https://github.com/oven-sh/bun/releases)를 참고하세요.

## 결론

bun은 **속도와 통합성을 중시하는 프로젝트**에 적합한 최신 JavaScript 도구입니다.
- **성능**이 중요한 CI/CD 파이프라인, 대규모 모노레포, 혹은 빠른 개발 피드백 루프가 필요한 경우 bun을 고려해볼 만합니다.
- 반면, **특정 네이티브 모듈**이나 **풍부한 플러그인 생태계**가 필수인 경우에는 기존 npm/yarn + Webpack/Rollup 조합이 더 안정적일 수 있습니다.

프로젝트에 적용하기 전, 핵심 의존성이 bun과 호환되는지 확인하고, 작은 파일럿 프로젝트에서 성능 및 호환성을 검증하는 것을 권장합니다.

> **추가 조사 필요**: 복잡한 네이티브 모듈(예: `node-gyp` 기반)과 bun의 호환성 여부는 프로젝트별 테스트가 필요합니다. 공식 문서와 GitHub 이슈 트래커를 지속적으로 확인하세요.
