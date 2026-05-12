---
title: "GitHub 레포지토리에서 `dependencies` 라벨 만들기"
description: "Dependabot이 PR에 자동으로 `dependencies` 라벨을 붙일 수 있도록 라벨을 생성하고, dependabot.yml 파일을 올바르게 설정하는 방법을 안내합니다."
category: "Guide"
tags: ["dependabot", "labels", "GitHub", "CI"]
status: "draft"
issueNumber: 0
createdAt: "2026-05-12T10:00:00Z"
updatedAt: "2026-05-12T10:00:00Z"
---

# `dependencies` 라벨 만들기

Dependabot이 풀 리퀘스트에 `dependencies` 라벨을 자동으로 붙이려면, 레포지토리 안에 해당 라벨이 존재해야 합니다. 라벨이 없으면 Dependabot이 라벨을 추가하려고 할 때 오류가 발생합니다.

## 1. GitHub UI 로 라벨 생성

1. 레포지토리 메인 페이지에서 **`Issues`** 탭을 클릭합니다.
2. 오른쪽 사이드바에서 **`Labels`** 를 선택합니다.
3. **`New label`** 버튼을 클릭합니다.
4. **Name** 에 `dependencies` 를 입력하고, 필요에 따라 색상을 선택합니다.
5. **Create label** 을 눌러 라벨을 저장합니다.

> 이 라벨은 **Issues** 와 **Pull requests** 모두에 사용할 수 있습니다.

## 2. `dependabot.yml` 파일 검증

라벨이 정상적으로 생성된 뒤, 레포지토리 루트에 있는 `.github/dependabot.yml` 파일에 라벨 이름이 올바르게 지정되어 있는지 확인합니다. 예시:

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

- `labels` 섹션에 `dependencies` 라벨이 정확히 기재되어 있어야 합니다.
- 라벨 이름에 오타가 있으면 Dependabot이 라벨을 찾지 못합니다.

## 3. 라벨이 없을 때 발생하는 오류

```
The following labels could not be found: `dependencies`. Please create it before Dependabot can add it to a pull request.
```

위와 같은 메시지는 라벨이 존재하지 않거나 `dependabot.yml` 에 지정된 라벨 이름이 레포지토리에 없을 때 나타납니다. 위 **1** 단계에서 라벨을 만든 뒤 **2** 단계에서 파일을 확인하면 문제를 해결할 수 있습니다.

## 4. 라벨 삭제·수정 시 주의사항

- 라벨을 삭제하거나 이름을 바꾸면 기존 PR에 붙은 라벨도 사라집니다.
- 라벨을 수정한 경우, `dependabot.yml` 에도 동일하게 반영해야 합니다.

---

*이 문서는 Dependabot 설정 오류를 빠르게 해결하고, 자동 라벨링을 정상화하기 위한 가이드입니다.*
