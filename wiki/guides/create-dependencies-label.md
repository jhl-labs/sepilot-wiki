---
title: "GitHub 레포지토리에서 `dependencies` 라벨 만들기"
description: "Dependabot이 자동으로 라벨을 추가하려면 사전에 `dependencies` 라벨을 생성해야 합니다. 이 가이드는 라벨 생성 방법을 단계별로 안내합니다."
category: "Guide"
tags: ["Dependabot", "GitHub", "라벨", "자동화"]
status: "draft"
issueNumber: 0
createdAt: "2026-05-11T10:35:00Z"
updatedAt: "2026-05-11T10:35:00Z"
---

# GitHub 레포지토리에서 `dependencies` 라벨 만들기

Dependabot이 PR에 라벨을 자동으로 붙이려면 해당 라벨이 레포지토리에 미리 존재해야 합니다. 라벨이 없을 경우 **"The following labels could not be found: `dependencies`. Please create it before Dependabot can add it to a pull request."** 라는 오류가 발생합니다.

## 1. 레포지토리 설정 페이지 이동
1. GitHub에서 해당 레포지토리 페이지를 엽니다.
2. 상단 메뉴에서 **"Issues"** 탭을 클릭합니다.
3. 오른쪽 사이드바에서 **"Labels"** 를 선택합니다.

## 2. 새 라벨 만들기
1. **"New label"** 버튼을 클릭합니다.
2. **Name** 필드에 `dependencies` 를 입력합니다.
3. **Description**(선택)에는 "Dependabot dependency update PRs" 와 같이 라벨의 목적을 간단히 적어두면 좋습니다.
4. **Color**는 원하는 색상을 선택합니다. (예: `#0366d6` – GitHub 기본 파란색)
5. **Create label** 버튼을 눌러 라벨을 생성합니다.

## 3. 라벨 확인
- 라벨 리스트에 `dependencies` 가 정상적으로 표시되는지 확인합니다.
- 이제 Dependabot이 새 PR을 만들 때 자동으로 이 라벨을 붙일 수 있습니다.

## 4. 기존 PR에 라벨 적용 (선택 사항)
- 이미 열려 있는 Dependabot PR에 라벨이 없을 경우, 해당 PR 페이지에서 **"Labels"** 드롭다운을 열고 `dependencies` 라벨을 수동으로 추가합니다.

## 5. 자동화 확인
- Dependabot이 다음 업데이트 PR을 생성하면 자동으로 `dependencies` 라벨이 붙는지 확인합니다.
- 라벨이 정상적으로 적용되지 않으면 **dependabot.yml** 파일에 라벨 설정이 올바른지 검토합니다.

---

### 참고 자료
- GitHub Docs: [Creating a label](https://docs.github.com/en/issues/using-labels-and-milestones-to-track-work/managing-labels#creating-a-label) (공식 문서)

---

이 가이드를 통해 `dependencies` 라벨을 미리 생성하면 Dependabot이 PR에 라벨을 자동으로 붙일 수 있어 워크플로가 원활해집니다.
