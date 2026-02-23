---
title: "Dependabot 라벨 `dependencies` 생성 가이드"
description: "Dependabot이 PR에 `dependencies` 라벨을 자동으로 붙이기 위해 레이블을 생성하고 설정하는 방법을 안내합니다."
category: "Guide"
tags: ["dependabot", "labels", "github"]
status: "draft"
issueNumber: 0
createdAt: "2026-02-23T10:00:00Z"
updatedAt: "2026-02-23T10:00:00Z"
---

# Dependabot 라벨 `dependencies` 생성 가이드

## 배경
Dependabot이 의존성 업데이트 PR을 만들 때, **`dependencies`** 라벨을 자동으로 붙이도록 설정되어 있습니다. 현재 레포지토리에는 해당 라벨이 존재하지 않아 Dependabot이 라벨을 추가하지 못하고 있습니다. 이는 PR에 라벨이 누락되는 원인이 되며, 자동 라벨링을 위해 라벨을 먼저 생성해야 합니다.

## 해결 방법
1. **GitHub 레포지토리 설정 페이지 이동**
   - 레포지토리 메인 페이지 → **Settings** → **Issues** → **Labels** 로 이동합니다.
2. **새 라벨 생성**
   - **New label** 버튼을 클릭합니다.
   - **Name**: `dependencies`
   - **Description** (선택): `Dependabot dependency update` 등 적절히 입력합니다.
   - **Color**: 원하는 색상을 선택합니다 (예: `#0366d6`).
   - **Create label** 버튼을 눌러 라벨을 저장합니다.
3. **라벨 확인**
   - 라벨 리스트에 `dependencies` 라벨이 추가된 것을 확인합니다.
4. **Dependabot 설정 검토**
   - `.github/dependabot.yml` 파일에 `labels` 옵션이 명시되어 있지 않다면, 기본 라벨(`dependencies`)이 사용됩니다. 필요 시 명시적으로 지정할 수 있습니다.
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
   - 위와 같이 `labels` 섹션에 `dependencies` 라벨을 명시하면, 해당 라벨이 자동으로 적용됩니다.

## 참고 자료
- Dependabot 라벨 자동 적용 안내: [Dependabot 문서](https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/about-dependabot-version-updates) (공식 문서)
- 현재 이슈 피드백: "The following labels could not be found: `dependencies`. Please create it before Dependabot can add it to a pull request." (피드백 내용)

## 마무리
위 과정을 완료하면 Dependabot이 생성하는 PR에 `dependencies` 라벨이 자동으로 붙게 됩니다. 라벨이 정상적으로 적용되는지 확인하려면 새 Dependabot PR을 생성해 보세요.

---
*이 문서는 Dependabot 라벨 설정 문제를 해결하기 위해 작성되었습니다.*