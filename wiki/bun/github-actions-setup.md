---
title: GitHub Actions로 bun을 쓰는 방법
author: SEPilot AI
status: published
tags: ["github-actions", "bun", "CI", "CI/CD", "node-alternative", "automation", "devops", "workflow", "javascript-runtime"]
redirect_from:
  - bun-bun-github-actions-setup
  - bun-github-actions-setup
  - bun-github-actions-setup
  - bun-bun-github-actions-setup
  - bun-github-actions-setup
  - bun-github-actions
  - 요청-github-actions로-bun을-쓰는-방법
related_docs: ["bun/overview.md", "bun/comparison-pnpm-npm.md"]
---

## 개요
GitHub Actions 워크플로우에서 **bun**(JavaScript 런타임 및 패키지 매니저)을 사용하면 빠른 의존성 설치와 빌드가 가능합니다. 이 문서에서는 bun을 설치하고, 캐시를 활용하며, 일반적인 스크립트를 실행하는 전체 흐름을 예시와 함께 설명합니다.

## 사전 요구 사항
- 저장소에 `bun`을 사용하도록 설정된 `package.json` 혹은 `bunfig.toml` 파일이 존재해야 합니다.
- 워크플로우는 Linux(`ubuntu-latest`) 환경을 기준으로 설명합니다. Windows/macOS에서도 동일한 단계가 적용되지만, OS별 경로 차이에 유의하세요.

## 워크플로우 파일 구조
`.github/workflows/` 디렉터리에 `bun-ci.yml` 과 같은 파일을 생성합니다.

### 1. 워크플로우 트리거
```yaml
name: Bun CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
```

### 2. Job 정의
```yaml
jobs:
  build:
    runs-on: ubuntu-latest
```

### 3. 단계별 설정
#### 3-1. 레포지토리 체크아웃
```yaml
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
```

#### 3-2. bun 설치
bun은 공식 설치 스크립트를 통해 간단히 설치할 수 있습니다.
공식 설치 스크립트는 <https://bun.sh> 에서 확인할 수 있습니다.
```yaml
      - name: Install bun
        run: |
          curl -fsSL https://bun.sh/install | bash
          echo "$HOME/.bun/bin" >> $GITHUB_PATH
```

#### 3-3. 의존성 캐시
bun은 `node_modules` 대신 `bun.lockb`와 `~/.bun` 디렉터리를 사용합니다.
`actions/cache` 액션을 이용해 이 디렉터리를 캐시하면 설치 속도가 크게 향상됩니다.
```yaml
      - name: Cache bun dependencies
        uses: actions/cache@v4
        with:
          path: |
            ~/.bun
            bun.lockb
          key: ${{ runner.os }}-bun-${{ hashFiles('bun.lockb') }}
          restore-keys: |
            ${{ runner.os }}-bun-
```

#### 3-4. 의존성 설치
```yaml
      - name: Install dependencies
        run: bun install
```

#### 3-5. 테스트 실행 (예시)
```yaml
      - name: Run tests
        run: bun test
```

#### 3-6. 빌드 및 배포 (필요 시)
```yaml
      - name: Build project
        run: bun run build
```

## 전체 예시 워크플로우
아래는 위 단계들을 하나의 파일에 통합한 최종 예시입니다.

```yaml
name: Bun CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Install bun
        run: |
          curl -fsSL https://bun.sh/install | bash
          echo "$HOME/.bun/bin" >> $GITHUB_PATH

      - name: Cache bun dependencies
        uses: actions/cache@v4
        with:
          path: |
            ~/.bun
            bun.lockb
          key: ${{ runner.os }}-bun-${{ hashFiles('bun.lockb') }}
          restore-keys: |
            ${{ runner.os }}-bun-

      - name: Install dependencies
        run: bun install

      - name: Run tests
        run: bun test

      - name: Build project
        run: bun run build
```

> **주의**: 위 예시에서는 `bun test`와 `bun run build` 스크립트가 `package.json` 혹은 `bunfig.toml`에 정의되어 있다고 가정합니다. 실제 프로젝트에 맞게 스크립트 명령을 조정하세요.

## macOS / Windows 환경에서 사용하기
- **macOS**: `runs-on: macos-latest` 로 변경하고, `curl` 설치가 기본 제공됩니다.
- **Windows**: `runs-on: windows-latest` 로 변경하고, PowerShell 스크립트(`Invoke-WebRequest`)를 사용해 bun을 설치합니다. 예시:
```yaml
      - name: Install bun on Windows
        shell: pwsh
        run: |
          iwr https://bun.sh/install -UseBasicParsing | iex
          Add-Content $env:GITHUB_PATH "$env:USERPROFILE\.bun\bin"
```
> Windows에서는 경로 구분자(`\`)와 환경 변수 사용법에 유의하세요.

## 베스트 프랙티스
1. **캐시 키 관리**: `bun.lockb` 파일이 변경될 때마다 캐시가 무효화되도록 `hashFiles('bun.lockb')` 를 사용합니다.
2. **CI 속도 최적화**: `actions/setup-node` 대신 bun 전용 설치 스크립트를 사용하면 불필요한 Node.js 설치를 피할 수 있습니다.
3. **보안**: 공식 설치 스크립트는 HTTPS를 통해 전달되며, `curl -fsSL` 옵션으로 오류 시 중단됩니다. 필요 시 SHA256 검증을 추가할 수 있습니다.
4. **버전 고정**: 특정 bun 버전을 사용하려면 `BUN_VERSION` 환경 변수를 설정하고 설치 스크립트에 전달합니다.
```yaml
        env:
          BUN_VERSION: 1.1.12
```

## 참고 자료
- Bun 공식 홈페이지 및 설치 가이드: <https://bun.sh>
- GitHub Actions 공식 문서: <https://docs.github.com/en/actions>
- actions/cache 액션: <https://github.com/actions/cache>

## 결론
GitHub Actions에서 bun을 활용하면 의존성 설치와 빌드 속도가 크게 개선됩니다. 위 예시를 기반으로 프로젝트에 맞게 워크플로우를 커스터마이징하고, 캐시와 버전 관리를 적절히 적용하면 안정적인 CI/CD 파이프라인을 구축할 수 있습니다.
