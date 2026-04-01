---
title: "GitHub 레이블: dependencies 만들기"
description: "Dependabot이 사용할 수 있도록 `dependencies` 레이블을 생성하는 방법에 대한 가이드"
category: "Guide"
tags: ["GitHub", "Dependabot", "labels"]
status: deleted
issueNumber: 0
createdAt: "2026-03-02T10:00:00Z"
updatedAt: "2026-03-02T10:00:00Z"
redirect_from:
  - github-dependencies-label
  - github-labels-dependencies
  - meta-label-dependencies
  - backend-label-dependencies
quality_score: 72
---

# GitHub 레이블: `dependencies` 만들기

Dependabot은 PR에 레이블을 자동으로 붙이려면 해당 레이블이 레포지토리에 존재해야 합니다. 레이블이 없을 경우 아래와 같은 오류가 발생합니다.

> The following labels could not be found: `dependencies`. Please create it before Dependabot can add it to a pull request.

## 레이블 생성 방법

### 1. GitHub 웹 UI 사용
1. 레포지토리 메인 페이지에서 **Issues** 탭을 클릭합니다.
2. 오른쪽 사이드바의 **Labels** 를 선택합니다.
3. **New label** 버튼을 클릭합니다.
4. **Name** 에 `dependencies` 를 입력하고, 필요에 따라 색상을 선택합니다.
5. **Create label** 을 눌러 저장합니다.

### 2. GitHub CLI (`gh`) 사용
```bash
# gh가 설치되어 있어야 합니다.
gh label create dependencies --color "BFD4F2" --description "Labels for Dependabot dependency update PRs"
```

### 3. GitHub REST API 사용
```http
POST /repos/{owner}/{repo}/labels
Content-Type: application/json

{
  "name": "dependencies",
  "color": "BFD4F2",
  "description": "Labels for Dependabot dependency update PRs"
}
```
> 자세한 내용은 [GitHub Docs – About labels](https://docs.github.com/en/issues/using-labels-and-milestones-to-track-work/about-labels) 를 참고하세요.

## Dependabot 설정 확인
`dependabot.yml` 파일에 `labels` 옵션이 지정되어 있는지 확인합니다. 예시:

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    labels:
      - "dependencies"
```

위와 같이 `labels` 섹션에 `dependencies` 를 명시하면, Dependabot이 자동으로 해당 레이블을 PR에 붙입니다.

## 적용 후 확인
레포지토리에 새로운 Dependabot PR가 생성되면, 자동으로 `dependencies` 레이블이 붙어 있는지 확인합니다. 레이블이 보이지 않으면 위 절차를 다시 점검하세요.

---
*이 문서는 Dependabot PR에 필요한 `dependencies` 레이블을 생성하는 방법을 안내합니다.*