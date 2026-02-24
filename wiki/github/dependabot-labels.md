---
title: "Dependabot 라벨 설정 가이드"
description: "Dependabot이 PR에 자동으로 라벨을 추가하도록 설정하고, 누락된 라벨을 생성하는 방법을 안내합니다."
category: "Guide"
tags: ["Dependabot", "라벨", "GitHub", "CI"]
status: "draft"
issueNumber: 0
createdAt: "2026-02-23T10:00:00Z"
updatedAt: "2026-02-23T10:00:00Z"
redirect_from:
  - meta-label-dependencies
  - backend-label-dependencies
  - dependabot-missing-dependencies-label
  - troubleshooting-dependabot-label-missing
  - meta-label-dependencies
  - backend-label-dependencies
  - dependabot-labels
  - meta-label-dependencies
  - troubleshooting-dependabot-label-missing
  - github-dependabot-labels
  - dependabot-missing-dependencies-label
order: 1
---

# Dependabot 라벨 설정 가이드

이 문서는 **Dependabot**이 Pull Request에 자동으로 라벨을 붙일 수 있도록 설정하는 방법과, 라벨이 존재하지 않을 때 발생하는 오류를 해결하는 절차를 설명합니다.

## 1. 문제 상황

Dependabot이 PR에 `dependencies` 라벨을 추가하려고 시도했지만, 해당 라벨이 레포지토리에 존재하지 않아 다음과 같은 오류가 발생했습니다.

```
The following labels could not be found: `dependencies`. Please create it before Dependabot can add it to a pull request.
Please fix the above issues or remove invalid values from `dependabot.yml`.
```

## 2. 라벨 생성 방법

### 2.1 GitHub UI를 이용한 라벨 생성
1. 레포지토리 메인 페이지에서 **Issues** 탭을 클릭합니다.
2. 오른쪽 사이드바에 **Labels** 링크가 있습니다. 클릭합니다.
3. **New label** 버튼을 눌러 라벨을 생성합니다.
4. **Name**에 `dependencies` 를 입력하고, 필요에 따라 색상을 선택합니다.
5. **Create label**을 클릭합니다.

### 2.2 `gh` CLI를 이용한 라벨 생성
```bash
gh label create dependencies --color "BFD4F2" --description "Dependabot dependency updates"
```
위 명령을 실행하면 `dependencies` 라벨이 바로 생성됩니다.

## 3. `dependabot.yml` 파일 검토

라벨이 정상적으로 생성된 후에도 오류가 지속된다면 `dependabot.yml` 파일에 잘못된 라벨 이름이 지정되어 있는지 확인합니다.

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    labels:
      - "dependencies"   # 여기 라벨 이름이 정확히 일치해야 합니다.
```
- 라벨 이름은 **대소문자와 공백을 정확히 일치**시켜야 합니다.
- 필요 없는 라벨이 포함돼 있다면 해당 항목을 삭제하거나 올바른 라벨 이름으로 교체합니다.

## 4. 라벨 자동 생성 (옵션)

프로젝트에 라벨이 아직 없을 경우, CI 워크플로우에서 자동으로 라벨을 생성하도록 스크립트를 추가할 수 있습니다.

```yaml
# .github/workflows/create-label.yml
name: Create Dependabot Labels
on:
  push:
    branches: [ main ]
jobs:
  create-label:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repo
        uses: actions/checkout@v3
      - name: Create dependencies label if missing
        run: |
          if ! gh label list | grep -q "dependencies"; then
            gh label create dependencies --color "BFD4F2" --description "Dependabot dependency updates"
          fi
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```
위 워크플로우는 `main` 브랜치에 푸시될 때마다 `dependencies` 라벨이 존재하지 않으면 자동으로 생성합니다.

## 5. 검증
1. 라벨을 생성한 뒤, Dependabot이 새 PR을 열면 자동으로 `dependencies` 라벨이 붙는지 확인합니다.
2. 라벨이 정상적으로 붙지 않으면 **Actions** 로그와 **Dependabot** 설정을 다시 검토합니다.

## 6. 참고 자료
- [GitHub Docs: Managing labels for issues and pull requests](https://docs.github.com/en/issues/tracking-your-work-with-issues/creating-and-editing-labels)
- [GitHub Docs: Configuring Dependabot](https://docs.github.com/en/code-security/dependabot/configuration-options)

---
*이 문서는 Dependabot 라벨 설정 문제를 해결하기 위한 가이드이며, 필요에 따라 프로젝트에 맞게 수정해서 사용하세요.*