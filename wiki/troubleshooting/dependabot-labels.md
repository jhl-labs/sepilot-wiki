---
title: "Dependabot 라벨 누락 문제 해결 방법"
description: "Dependabot이 PR에 라벨을 추가하지 못하는 경우, 필요한 라벨을 생성하는 방법을 안내합니다."
category: "Troubleshooting"
tags: ["dependencies", "github-actions", "dependabot", "labels"]
status: "draft"
issueNumber: 0
createdAt: "2026-03-09T09:00:00Z"
updatedAt: "2026-03-09T09:00:00Z"
---

# Dependabot 라벨 누락 문제 해결 방법

## 상황 설명
Dependabot이 PR에 자동으로 라벨을 붙이려고 할 때, 다음과 같은 오류 메시지를 볼 수 있습니다.

```
The following labels could not be found: `dependencies`, `github-actions`. Please create them before Dependabot can add them to a pull request.
```

이는 레포지토리 내에 `dependencies` 와 `github-actions` 라벨이 존재하지 않아 발생합니다. 라벨이 없으면 Dependabot이 PR에 라벨을 추가할 수 없습니다.

## 해결 단계

1. **GitHub 웹 UI를 이용해 라벨 생성**
   - 레포지토리 메인 페이지에서 **Issues** 탭을 클릭합니다.
   - 좌측 사이드바에서 **Labels** 를 선택합니다.
   - **New label** 버튼을 클릭하고 아래와 같이 라벨을 추가합니다.
     - **Name**: `dependencies`
       - **Color**: 원하는 색 (예: `#1d76db`)
       - **Description** (선택): `Dependabot dependency updates`
     - **Name**: `github-actions`
       - **Color**: 원하는 색 (예: `#0e8a16`)
       - **Description** (선택): `GitHub Actions related changes`

2. **CLI 혹은 API를 이용해 라벨 생성 (선택 사항)**
   - GitHub CLI (`gh`) 를 사용한다면:
     ```bash
     gh label create dependencies --color 1d76db --description "Dependabot dependency updates"
     gh label create github-actions --color 0e8a16 --description "GitHub Actions related changes"
     ```
   - REST API 를 이용할 경우, `POST /repos/{owner}/{repo}/labels` 엔드포인트에 위와 동일한 payload 를 전송합니다.

3. **라벨이 정상적으로 생성됐는지 확인**
   - **Issues → Labels** 페이지에서 두 라벨이 리스트에 보이는지 확인합니다.
   - 기존 Dependabot PR 를 새로고침 하면, 이제 라벨이 자동으로 붙어 있는 것을 확인할 수 있습니다.

## 참고 자료
- Dependabot 공식 문서: [Dependabot configuration](https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuration-options-for-dependency-updates)
- GitHub CLI 라벨 관리: [gh label](https://cli.github.com/manual/gh_label)

## 추가 팁
- 라벨 색상은 팀 내에서 일관성을 유지하도록 정해두면 PR 관리가 쉬워집니다.
- 라벨 설명을 적어두면 새로운 팀원이 라벨의 목적을 빠르게 이해할 수 있습니다.

---
*이 문서는 Dependabot 라벨 문제를 해결하기 위한 가이드이며, 필요에 따라 업데이트될 수 있습니다.*