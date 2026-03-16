---
title: "Dependabot 라벨 `dependencies` 추가 및 설정 가이드"
description: "Dependabot이 PR에 라벨을 붙일 수 있도록 `dependencies` 라벨을 만들고, dependabot.yml 파일에서 잘못된 라벨 값을 제거하는 방법을 안내합니다."
category: "Guide"
tags: ["Dependabot", "라벨", "GitHub", "자동화"]
status: "draft"
issueNumber: 0
createdAt: "2026-03-16T10:00:00Z"
updatedAt: "2026-03-16T10:00:00Z"
---

# Dependabot 라벨 `dependencies` 추가 및 설정 가이드

## 배경
Dependabot이 PR에 자동으로 `dependencies` 라벨을 붙이려면 레포지토리 안에 해당 라벨이 존재해야 합니다. 현재 라벨이 없어서 오류가 발생하고 있습니다. 또한 `dependabot.yml` 파일에 존재하지 않는 라벨이 지정되어 있으면 동일한 문제가 발생합니다. 현재 Issue에서 이 문제를 보고했습니다.

## 1. `dependencies` 라벨 만들기
1. 레포지토리 페이지 오른쪽 상단의 **Settings** 탭을 클릭합니다.
2. 좌측 메뉴에서 **Labels** 를 선택합니다.
3. **New label** 버튼을 눌러 라벨을 생성합니다.
   - **Name**: `dependencies`
   - **Color**: 원하는 색 (예: `#0366d6`)
   - **Description**: `Dependabot dependency updates` (선택)

> 라벨 생성 방법은 GitHub 공식 문서에서도 확인할 수 있습니다. (공식 문서를 참조해주세요)

## 2. `dependabot.yml` 파일 검토 및 수정
`dependabot.yml` 파일에 라벨 이름이 잘못 지정되어 있으면 Dependabot이 라벨을 적용하지 못합니다.

1. 레포지토리 루트에 있는 `.github/dependabot.yml` 파일을 엽니다.
2. `labels:` 섹션을 찾아 `dependencies` 라벨이 정확히 기재되어 있는지 확인합니다.
   ```yaml
   labels:
     - dependencies
   ```
3. 존재하지 않는 라벨이나 오타가 있는 경우 삭제하거나 올바른 라벨명으로 수정합니다.
4. 파일을 커밋하고 푸시합니다.

## 3. 변경 사항 확인
- 라벨이 정상적으로 생성되면 Dependabot이 새 PR을 만들 때 자동으로 `dependencies` 라벨이 붙습니다.
- 기존 PR에 라벨이 없을 경우 수동으로 라벨을 추가하거나 Dependabot이 다시 실행되도록 재오픈합니다.

## 4. 참고 자료
- Dependabot 릴리즈 노트 및 PR 내용: DOMPurify 3.3.3 업데이트 PR에서 라벨 오류가 보고되었습니다. (Issue 내용)
- GitHub 라벨 관리 방법: GitHub 공식 문서 (공식 문서를 참조해주세요)

이 가이드를 따라 `dependencies` 라벨을 추가하고 `dependabot.yml` 파일을 정리하면 라벨 관련 오류가 해결됩니다.
