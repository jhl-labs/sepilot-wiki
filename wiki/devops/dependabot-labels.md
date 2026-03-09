---
title: "Dependabot 라벨 `dependencies` 생성 가이드"
description: "Dependabot이 PR에 `dependencies` 라벨을 자동으로 추가하도록 라벨을 생성하고 설정하는 방법을 안내합니다."
category: "Guide"
tags: ["Dependabot", "라벨", "자동화", "GitHub"]
status: "draft"
issueNumber: 0
createdAt: "2026-03-02T10:00:00Z"
updatedAt: "2026-03-02T10:00:00Z"
redirect_from:
  - devops-dependabot-labels
  - maintenance-dependabot-labels
---

# Dependabot 라벨 `dependencies` 생성 가이드

Dependabot이 의존성 업데이트 PR에 자동으로 `dependencies` 라벨을 붙이려면, 해당 라벨이 레포지토리에 존재해야 합니다. 라벨이 없을 경우 Dependabot이 라벨을 추가하지 못하고, **"The following labels could not be found: `dependencies`. Please create it before Dependabot can add it to a pull request."** 라는 오류가 발생합니다.

## 1. 라벨 생성 방법

1. 레포지토리 메인 페이지에서 **`Issues`** 탭을 클릭합니다.
2. 오른쪽 사이드바의 **`Labels`** 를 선택합니다.
3. **`New label`** 버튼을 클릭합니다.
4. **Name** 에 `dependencies` 를 입력하고, 원하는 색상을 선택합니다.
5. **Create label** 을 눌러 라벨을 생성합니다.

> 이 과정은 GitHub 공식 문서에서도 확인할 수 있습니다. (예: GitHub Docs – *Managing labels for issues and pull requests*)

## 2. Dependabot 설정 확인

`dependabot.yml` 파일에 라벨 자동 추가 옵션이 명시되어 있는지 확인합니다. 기본적으로 Dependabot은 라벨을 자동으로 붙이지만, 커스텀 설정이 있는 경우 아래와 같이 `labels` 섹션을 확인합니다.

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    # Optional: 자동 라벨 지정
    labels:
      - "dependencies"
```

위와 같이 `labels` 항목에 `dependencies` 라벨이 명시되어 있으면, 라벨이 존재할 때 자동으로 적용됩니다.

## 3. 라벨이 적용되지 않을 때 확인 사항

- **라벨 이름 오타**: `dependencies` 라는 정확한 이름이어야 합니다.
- **라벨 색상**: 색상은 상관없지만, 라벨이 실제로 생성되어 있어야 합니다.
- **`dependabot.yml` 파일 위치**: 레포지토리 루트에 있어야 하며, 올바른 YAML 형식이어야 합니다.

## 4. 문제 해결 흐름

1. 라벨이 없다는 오류가 발생하면 위 **1번** 절차대로 라벨을 생성합니다.
2. 라벨을 생성한 뒤에도 오류가 지속되면 `dependabot.yml` 파일을 열어 `labels` 섹션이 올바르게 설정돼 있는지 검토합니다.
3. 변경 후 커밋하고 푸시하면 Dependabot이 새로운 PR을 생성하거나 기존 PR에 라벨을 자동으로 붙입니다.

## 5. 추가 참고 자료

- GitHub Docs – [Managing labels for issues and pull requests](https://docs.github.com/en/issues/tracking-your-work-with-issues/creating-a-label)
- Dependabot Docs – [Configuring Dependabot version updates](https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuring-dependabot-version-updates)

---

*이 문서는 Dependabot 라벨 문제를 해결하기 위한 기본 가이드이며, 레포지토리 정책에 따라 라벨 관리 방식을 조정할 수 있습니다.*