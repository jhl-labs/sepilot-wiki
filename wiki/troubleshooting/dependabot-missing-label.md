---
title: "Dependabot PR에서 라벨이 없을 때 해결 방법"
description: "Dependabot이 PR에 `dependencies` 라벨을 추가하지 못하는 경우 라벨을 생성하고 dependabot.yml을 수정하는 절차를 안내합니다."
category: "Troubleshooting"
tags: ["Dependabot", "labels", "GitHub Actions", "CI"]
status: "draft"
issueNumber: 0
createdAt: "2026-03-09T12:00:00Z"
updatedAt: "2026-03-09T12:00:00Z"
---

# Dependabot PR에서 `dependencies` 라벨이 없을 때

Dependabot이 자동으로 생성한 Pull Request에 `dependencies` 라벨을 붙이지 못한다는 오류 메시지를 볼 수 있습니다.

```
The following labels could not be found: `dependencies`. Please create it before Dependabot can add it to a pull request.

Please fix the above issues or remove invalid values from `dependabot.yml`.
```

## 원인

1. **라벨이 레포지토리에 존재하지 않음** – `dependencies` 라벨이 아직 생성되지 않았습니다.
2. **`dependabot.yml`에 잘못된 라벨 이름이 지정됨** – 라벨 이름에 오타가 있거나, 존재하지 않는 라벨을 지정했습니다.

## 해결 단계

### 1️⃣ `dependencies` 라벨 생성
1. 레포지토리의 **Issues** 탭으로 이동합니다.
2. 오른쪽 사이드바에서 **Labels** 를 클릭합니다.
3. **New label** 버튼을 눌러 다음과 같이 입력합니다:
   - **Name**: `dependencies`
   - **Description** (선택): `Pull requests that update dependencies`
   - **Color**: 원하는 색상 (예: `#0E8A16`)
4. **Create** 를 클릭해 라벨을 저장합니다.

### 2️⃣ `dependabot.yml` 검증 및 수정
1. 레포지토리 루트에 있는 `.github/dependabot.yml` 파일을 엽니다.
2. `labels:` 섹션에 `dependencies` 라벨이 정확히 명시되어 있는지 확인합니다.
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
3. 라벨 이름에 오타가 있으면 `dependencies` 로 수정하고 파일을 커밋합니다.

### 3️⃣ 변경 사항 적용 확인
1. 라벨을 만든 뒤 **Dependabot**이 새 PR을 생성하거나 기존 PR을 다시 열면 `dependencies` 라벨이 자동으로 붙어야 합니다.
2. 라벨이 여전히 보이지 않으면 **GitHub Actions** 로그를 확인하고, 캐시된 워크플로우가 있는 경우 재시작(`@dependabot rebase`)합니다.

## 추가 팁
- 여러 라벨을 사용하고 싶다면 `labels:` 배열에 추가 라벨을 나열하면 됩니다.
- 라벨 관리 권한이 없는 경우 레포지토리 관리자에게 라벨 생성을 요청하세요.

---

*이 문서는 Dependabot 라벨 문제를 빠르게 해결하기 위한 체크리스트 역할을 합니다. 필요에 따라 레포지토리 정책에 맞게 수정하세요.*