---
title: "Dependabot 라벨 설정 가이드"
description: "Dependabot이 자동으로 라벨을 추가하도록 `dependencies` 라벨을 만들고, `dependabot.yml` 파일을 올바르게 구성하는 방법을 안내합니다."
category: "Guide"
tags: ["dependabot", "labels", "github"]
status: "draft"
issueNumber: 0
createdAt: "2026-03-16T10:00:00Z"
updatedAt: "2026-03-16T10:00:00Z"
---

# Dependabot 라벨 설정 가이드

Dependabot이 PR에 라벨을 자동으로 붙이려면 해당 라벨이 레포지토리 안에 **미리 생성**되어 있어야 합니다. 현재 PR에서 `dependencies` 라벨을 찾을 수 없다는 오류가 발생했으므로, 아래 절차에 따라 라벨을 만들고 `dependabot.yml` 파일을 검토·수정하세요.

## 1️⃣ `dependencies` 라벨 만들기
1. 레포지토리 메인 페이지에서 **Issues → Labels** 로 이동합니다.
2. **New label** 버튼을 클릭합니다.
3. **Name** 에 `dependencies` 를 입력하고, 필요에 따라 색상을 선택합니다.
4. **Create label** 을 눌러 라벨을 생성합니다.

> 라벨 생성 방법에 대한 자세한 내용은 GitHub 공식 문서를 참고하세요: [GitHub Docs – About labels](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-labels) (출처).

## 2️⃣ `dependabot.yml` 파일 검토
`dependabot.yml` 파일에 라벨 이름이 정확히 `dependencies` 로 지정되어 있는지 확인합니다. 예시:

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    labels:
      - "dependencies"   # ← 여기 라벨 이름이 정확히 일치해야 합니다.
```

- 라벨 이름에 오타가 있거나, 다른 라벨(예: `dependency-updates`)을 사용하고 있다면 위와 같이 `dependencies` 로 수정합니다.
- 파일이 레포지토리 루트에 존재하지 않을 경우, `.github/dependabot.yml` 경로에 새 파일을 추가하고 위 내용을 넣어 주세요.

## 3️⃣ 변경 사항 커밋 및 푸시
```bash
git add .github/dependabot.yml
# 라벨은 GitHub UI에서 만든 것이므로 파일에 추가할 필요 없습니다.
git commit -m "chore: add dependencies label to dependabot config"
git push origin <branch-name>
```

## 4️⃣ PR 재검토
라벨을 만든 뒤 PR을 다시 열면 Dependabot이 자동으로 `dependencies` 라벨을 붙일 수 있습니다.

---
**요약**: `dependencies` 라벨이 없다는 오류를 해결하려면 레포지토리에서 해당 라벨을 생성하고, `dependabot.yml` 파일에 라벨 이름이 정확히 일치하도록 설정합니다. 이렇게 하면 Dependabot이 PR에 라벨을 정상적으로 추가합니다.
