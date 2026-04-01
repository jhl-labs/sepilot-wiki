---
title: "Dependabot 라벨 오류 해결 방법"
description: "Dependabot이 PR에 라벨을 추가하려 할 때 `dependencies`와 `github-actions` 라벨이 존재하지 않아 발생하는 오류를 해결하는 가이드"
category: "Troubleshooting"
tags: ["dependabot", "labels", "ci/cd"]
status: "draft"
issueNumber: 0
createdAt: "2026-03-09T12:00:00Z"
updatedAt: "2026-03-09T12:00:00Z"
quality_score: 77
---

# Dependabot 라벨 오류 해결 방법

GitHub Actions에서 Dependabot이 자동으로 생성한 Pull Request에 라벨을 붙이려 할 때, 다음과 같은 오류 메시지를 볼 수 있습니다.

```
The following labels could not be found: `dependencies`, `github-actions`. Please create them before Dependabot can add them to a pull request.
```

이 오류는 레포지토리 내에 해당 라벨이 존재하지 않을 때 발생합니다. 라벨을 미리 생성하거나, `dependabot.yml` 파일에서 라벨 지정 부분을 제거하면 문제를 해결할 수 있습니다.

## 해결 방법

### 1. 라벨 직접 생성 (추천)
1. 레포지토리 페이지에서 **Issues → Labels** 로 이동합니다.
2. **New label** 버튼을 클릭합니다.
3. 아래와 같이 라벨을 생성합니다.
   - **Name**: `dependencies`
   - **Color**: 원하는 색 (예: `#0366d6`)
   - **Description**: `Dependabot dependency updates`
4. 동일한 방법으로 `github-actions` 라벨도 생성합니다.
   - **Name**: `github-actions`
   - **Description**: `Dependabot GitHub Actions updates`

> 라벨 생성은 레포지토리 관리자 권한이 필요합니다.

### 2. `dependabot.yml`에서 라벨 지정 제거
`dependabot.yml` 파일에 `labels:` 섹션이 있다면 해당 라벨 이름을 삭제하거나 주석 처리합니다.
```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "daily"
    # labels:
    #   - "dependencies"
    #   - "github-actions"
```
이후 커밋을 푸시하면 Dependabot은 라벨 없이 PR을 생성합니다.

### 3. 라벨 자동 생성 스크립트 활용 (고급)
GitHub CLI(`gh`)를 사용해 스크립트로 라벨을 자동 생성할 수 있습니다.
```bash
gh label create dependencies --color 0366d6 --description "Dependabot dependency updates"
gh label create github-actions --color 0e8a16 --description "Dependabot GitHub Actions updates"
```
CI 파이프라인 초기에 실행하도록 설정하면 라벨 누락 문제를 방지할 수 있습니다.

## 참고 자료
- Dependabot PR 라벨 오류 이슈: [SebastienMelki/sebuf#140](https://dependabot.ecosyste.ms/hosts/GitHub/repositories/SebastienMelki/sebuf/issues/140) (출처)
- Docker `login-action` v4 릴리즈 노트: [docker/login-action releases](https://github.com/docker/login-action/releases) (출처)

## 요약
- `dependencies`와 `github-actions` 라벨이 없으면 Dependabot이 PR에 라벨을 붙일 수 없습니다.
- 라벨을 직접 생성하거나 `dependabot.yml`에서 라벨 지정 부분을 제거하면 문제를 해결할 수 있습니다.
- 필요에 따라 GitHub CLI 스크립트로 라벨 자동 생성을 고려해 보세요.
