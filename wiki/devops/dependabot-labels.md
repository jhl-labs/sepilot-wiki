---
title: "Dependabot 라벨 설정 및 dependabot.yml 수정 가이드"
description: "Dependabot이 PR에 `dependencies` 라벨을 자동으로 붙일 수 있도록 라벨을 생성하고, dependabot.yml 파일에서 잘못된 라벨 설정을 제거하는 방법을 안내합니다."
category: "Guide"
tags: ["Dependabot", "라벨", "CI/CD", "GitHub"]
status: "draft"
issueNumber: 0
createdAt: "2026-03-02T10:00:00Z"
updatedAt: "2026-03-02T10:00:00Z"
---

# Dependabot 라벨 설정 및 `dependabot.yml` 수정 가이드

## 배경
Dependabot은 보안 및 버전 업데이트 PR에 자동으로 라벨을 붙여 워크플로우를 관리합니다. 기본 라벨 중 하나인 `dependencies` 라벨이 레포지토리에 존재하지 않을 경우, Dependabot이 라벨을 추가하지 못하고 **"The following labels could not be found: `dependencies`. Please create it before Dependabot can add it to a pull request."** 라는 오류가 발생합니다.

## 목표
1. `dependencies` 라벨을 레포지토리에 생성한다.
2. `dependabot.yml` 파일에 잘못된 라벨 설정이 있다면 제거하거나 올바르게 수정한다.
3. 이후 Dependabot이 정상적으로 라벨을 붙일 수 있도록 확인한다.

## 단계별 절차

### 1️⃣ `dependencies` 라벨 생성
1. 레포지토리 메인 페이지에서 **Issues → Labels** 로 이동합니다.
2. **New label** 버튼을 클릭합니다.
3. **Name**에 `dependencies` 를 입력하고, 필요에 따라 색상을 선택합니다 (예: `#0366d6`).
4. **Create label** 을 눌러 라벨을 저장합니다.

> **Tip**: 라벨 이름은 정확히 `dependencies` 로 입력해야 합니다. 대소문자와 공백이 다르면 Dependabot이 인식하지 못합니다.

### 2️⃣ `dependabot.yml` 파일 검토 및 수정
`dependabot.yml` 은 레포지토리 루트 혹은 `.github/` 디렉터리에 위치합니다. 파일을 열어 `labels` 섹션을 확인합니다.

```yaml
# .github/dependabot.yml 예시
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    labels:
      - "dependencies"   # <-- 여기 라벨이 존재해야 함
```

- **잘못된 라벨**: 라벨 이름에 오타가 있거나 존재하지 않는 라벨을 지정한 경우, 해당 라벨 항목을 삭제하거나 올바른 `dependencies` 로 교체합니다.
- **라벨 섹션이 없을 경우**: 라벨을 자동으로 붙이고 싶다면 `labels:` 섹션을 추가하고 `dependencies` 라벨을 명시합니다.

수정 후 파일을 커밋하고 푸시합니다.

### 3️⃣ 변경 사항 검증
1. Dependabot이 새 PR을 생성하도록 트리거합니다. (예: `@dependabot rebase` 혹은 `@dependabot recreate` 댓글)
2. 새 PR에 `dependencies` 라벨이 자동으로 붙는지 확인합니다.
3. 기존 PR에 라벨이 누락된 경우, 라벨을 수동으로 추가하고 이후 자동 라벨링이 정상 동작하는지 재확인합니다.

## FAQ
- **Q: 라벨을 여러 개 지정하고 싶어요.**
  - A: `labels:` 배열에 원하는 라벨을 추가하면 됩니다. 예: `- "dependencies"`, `- "security"`.
- **Q: 라벨 색상이 중요한가요?**
  - A: 색상은 가시성을 위한 것이며, 기능에는 영향을 주지 않습니다.
- **Q: `dependabot.yml` 에서 라벨을 완전히 제거하면 어떻게 되나요?**
  - A: 라벨이 지정되지 않으면 Dependabot은 라벨을 붙이지 않으며, 라벨이 필요 없는 경우 그대로 두어도 무방합니다.

## 참고 자료
- [Dependabot 공식 문서 – Configuring labels](https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuring-dependabot-version-updates#adding-labels-to-pull-requests) (공식 문서를 참조해주세요)
- [GitHub 라벨 관리 가이드](https://docs.github.com/en/issues/tracking-your-work-with-issues/creating-and-editing-labels) (공식 문서를 참조해주세요)

---
*이 문서는 Dependabot 라벨 문제를 해결하기 위한 가이드이며, 레포지토리 정책에 따라 라벨 명칭이나 색상을 조정할 수 있습니다.*