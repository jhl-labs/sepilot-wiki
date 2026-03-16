---
title: "Dependabot 라벨 설정 가이드"
description: "Dependabot이 PR에 라벨을 자동으로 붙이도록 `dependencies` 라벨을 생성하고, dependabot.yml 파일을 올바르게 구성하는 방법을 안내합니다."
category: "Guide"
tags: ["Dependabot", "GitHub", "라벨", "CI"]
status: "draft"
issueNumber: 0
createdAt: "2026-03-16T08:30:00Z"
updatedAt: "2026-03-16T08:30:00Z"
---

# Dependabot 라벨 설정 가이드

## 배경
Dependabot은 보안 및 버그 수정 업데이트를 자동으로 PR에 적용하고, 해당 PR에 라벨을 붙여서 팀이 쉽게 식별할 수 있게 합니다. 기본적으로 `dependencies` 라벨을 사용하지만, 레포지토리에서 해당 라벨이 존재하지 않으면 **"The following labels could not be found: `dependencies`"** 와 같은 오류가 발생합니다.

## 1️⃣ 라벨 생성 방법
1. 레포지토리 메인 페이지에서 **"Issues"** 탭을 클릭합니다.
2. 오른쪽 사이드바의 **"Labels"** 를 선택합니다.
3. **"New label"** 버튼을 클릭합니다.
4. **Name** 에 `dependencies` 를 입력하고, 색상은 원하는 대로 선택합니다.
5. **Create label** 을 눌러 라벨을 생성합니다.

> 라벨 이름은 정확히 `dependencies` 이어야 Dependabot이 자동으로 매핑합니다.

## 2️⃣ `dependabot.yml` 파일 검증
`dependabot.yml` 파일에 라벨을 지정하는 옵션이 있는 경우, 올바른 라벨 이름이 사용됐는지 확인합니다.
```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    labels:
      - "dependencies"   # ← 여기 라벨 이름이 정확해야 함
```
- 라벨 이름에 오타가 있거나, 존재하지 않는 라벨을 지정하면 위와 같은 오류가 발생합니다.
- 필요에 따라 여러 라벨을 지정할 수 있지만, 각 라벨은 레포지토리에 사전에 생성돼 있어야 합니다.

## 3️⃣ 라벨이 자동으로 붙지 않을 때 확인 사항
- **라벨 권한**: 라벨을 생성한 사용자가 레포지토리에서 라벨을 관리할 권한이 있는지 확인합니다.
- **Dependabot 설정**: `dependabot.yml` 파일이 레포지토리 루트에 존재하고, 올바른 YAML 구문을 따르는지 검증합니다.
- **GitHub Actions**: Dependabot이 작동하도록 `dependabot.yml` 외에 별도의 워크플로가 필요하지는 않지만, 다른 CI 설정이 PR을 차단하고 있지는 않은지 확인합니다.

## 4️⃣ 참고 자료
- Dependencies vs devDependencies 차이점에 대한 이해: [How to Understand dependencies vs devDependencies in package.json](https://oneuptime.com/blog/post/2026-01-22-nodejs-dependencies-vs-devdependencies/view) (출처)
- GitHub 라벨 관리 공식 문서: <https://docs.github.com/en/issues/using-labels-and-milestones-to-track-work/about-labels>

## 5️⃣ 요약
1. 레포지토리 **Labels** 페이지에서 `dependencies` 라벨을 생성한다.
2. `dependabot.yml` 파일의 `labels` 섹션에 정확히 `dependencies` 라벨을 지정한다.
3. 라벨 권한 및 파일 구문 오류를 점검한다.

위 과정을 따라 하면 Dependabot이 PR에 `dependencies` 라벨을 정상적으로 붙이고, 자동 업데이트 흐름이 원활히 동작합니다.
