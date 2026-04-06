---
title: "Dependabot 라벨 생성 및 설정 가이드"
description: "Dependabot이 PR에 라벨을 자동으로 추가하려면 `dependencies` 라벨을 먼저 생성하는 방법을 안내합니다."
category: "Guide"
tags: ["Dependabot", "라벨", "GitHub"]
status: "draft"
issueNumber: 0
createdAt: "2026-04-06T12:00:00Z"
updatedAt: "2026-04-06T12:00:00Z"
---

# Dependabot 라벨 생성 및 설정 가이드

Dependabot이 Pull Request에 자동으로 라벨을 붙이려면 해당 라벨이 레포지토리에 미리 존재해야 합니다. 현재 `dependencies` 라벨이 없다는 오류가 발생했으므로, 아래 절차에 따라 라벨을 생성하고 Dependabot 설정을 확인하세요.

## 1. GitHub 레포지토리 설정 페이지 이동
1. 레포지토리 메인 페이지에서 **Settings** 탭을 클릭합니다.
2. 좌측 메뉴에서 **Issues** → **Labels** 로 이동합니다.

## 2. `dependencies` 라벨 생성
1. **New label** 버튼을 클릭합니다.
2. **Name** 필드에 `dependencies` 를 입력합니다.
3. **Color**(선택)와 **Description**(선택)를 입력합니다. 예시:
   - Color: `#5319e7`
   - Description: `Dependabot이 자동으로 추가하는 의존성 업데이트 라벨`
4. **Create label** 버튼을 눌러 라벨을 저장합니다.

## 3. Dependabot 설정 확인
- 레포지토리 루트에 `.github/dependabot.yml` 파일이 존재하는지 확인합니다.
- 파일에 `labels:` 옵션이 지정되어 있다면, `dependencies` 라벨이 포함되어 있는지 검토합니다.
  ```yaml
  version: 2
  updates:
    - package-ecosystem: "npm_and_yarn"
      directory: "/"
      schedule:
        interval: "weekly"
      labels:
        - "dependencies"
  ```
- 필요 시 `labels:` 섹션에 `dependencies` 라벨을 추가합니다.

## 4. 변경 사항 커밋 및 푸시
1. 라벨 생성은 GitHub UI에서 바로 적용됩니다.
2. `dependabot.yml` 파일을 수정했다면, 변경 내용을 커밋하고 푸시합니다.
   ```bash
   git add .github/dependabot.yml
   git commit -m "Add dependencies label to Dependabot config"
   git push origin main
   ```

## 5. 확인
- 새 Dependabot PR이 열리면 자동으로 `dependencies` 라벨이 붙는지 확인합니다.
- 기존 PR에 라벨이 없을 경우, 라벨을 수동으로 추가하거나 위 설정을 재검토합니다.

---

위 절차를 따라 `dependencies` 라벨을 생성하면 Dependabot이 정상적으로 라벨을 붙일 수 있습니다. 라벨이 여전히 적용되지 않을 경우, 레포지토리 권한 및 Dependabot 설정을 다시 점검하세요.