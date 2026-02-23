---
title: "Dependabot 라벨 `dependencies` 추가하기"
description: "Dependabot이 PR에 `dependencies` 라벨을 자동으로 붙이려면 해당 라벨을 먼저 생성해야 합니다. 라벨이 없을 경우 발생하는 오류와 해결 방법을 안내합니다."
category: "Guide"
tags: ["dependabot", "labels", "github"]
status: "draft"
issueNumber: 0
createdAt: "2026-02-23T10:00:00Z"
updatedAt: "2026-02-23T10:00:00Z"
---

# Dependabot 라벨 `dependencies` 추가하기

Dependabot이 Pull Request에 자동으로 `dependencies` 라벨을 붙이려면, 레포지토리 안에 해당 라벨이 미리 존재해야 합니다. 라벨이 없을 경우 아래와 같은 오류가 발생합니다.

> "The following labels could not be found: `dependencies`. Please create it before Dependabot can add it to a pull request."

## 해결 방법

1. **GitHub 레포지토리 설정으로 이동**
   - 레포지토리 메인 페이지에서 **Settings** 탭을 클릭합니다.
2. **Labels 관리 페이지 열기**
   - 좌측 사이드바에서 **Issues → Labels** 로 이동합니다.
3. **새 라벨 생성**
   - **New label** 버튼을 클릭합니다.
   - **Name**: `dependencies`
   - **Color**: 원하는 색상 (예: `#1d76db`)
   - **Description** (선택): `Pull requests created by Dependabot for dependency updates.`
   - **Create label** 버튼을 눌러 저장합니다.
4. **dependabot.yml 검토**
   - 레포지토리 루트에 있는 `.github/dependabot.yml` 파일을 열어 `labels` 섹션에 `dependencies` 라벨이 명시되어 있는지 확인합니다.
   - 라벨 이름이 정확히 일치해야 합니다. 오타가 있으면 수정하고 커밋합니다.
5. **변경 사항 푸시**
   - 라벨을 만든 뒤, Dependabot이 새 PR을 생성하면 자동으로 `dependencies` 라벨이 붙게 됩니다.

## 참고
- 이 가이드는 Dependabot이 라벨을 찾지 못해 발생하는 오류 메시지를 기반으로 작성되었습니다. (Issue 컨텍스트)
- GitHub 공식 문서: *라벨 관리* 섹션을 참고하면 라벨 생성 및 편집 방법을 자세히 확인할 수 있습니다.

---

*이 문서는 현재 초안(draft) 상태이며, 검토 후 `published` 로 전환될 수 있습니다.*