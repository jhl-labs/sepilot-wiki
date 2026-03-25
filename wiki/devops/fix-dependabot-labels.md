---
title: "Dependabot 라벨 오류 해결 방법"
description: "Dependabot이 PR에 라벨을 추가하지 못하는 경우, 라벨을 생성하거나 dependabot.yml 파일을 수정하는 방법을 안내합니다."
category: "Troubleshooting"
tags: ["dependabot", "github-actions", "labels", "ci/cd"]
status: deleted
issueNumber: 0
createdAt: "2026-03-09T12:00:00Z"
updatedAt: "2026-03-09T12:00:00Z"
---

# Dependabot 라벨 오류 해결 방법

Dependabot이 Pull Request에 라벨을 자동으로 붙이려 할 때 다음과 같은 오류가 발생할 수 있습니다.

```
The following labels could not be found: `dependencies`, `github-actions`. Please create them before Dependabot can add them to a pull request.

Please fix the above issues or remove invalid values from `dependabot.yml`.
```

이 오류는 레포지토리 내에 해당 라벨이 존재하지 않거나, `dependabot.yml` 파일에 잘못된 라벨 이름이 지정된 경우에 발생합니다. 아래 단계에 따라 문제를 해결할 수 있습니다.

## 1️⃣ 라벨 생성하기

1. **GitHub 웹 UI**
   - 레포지토리 메인 페이지에서 **Issues** 탭을 클릭합니다.
   - 오른쪽 사이드바의 **Labels** 를 선택합니다.
   - **New label** 버튼을 클릭하고, 라벨 이름을 `dependencies` 와 `github-actions` 로 각각 입력합니다.
   - 색상은 자유롭게 선택하고 **Create label** 을 눌러 저장합니다.

2. **GitHub CLI** (선호하는 경우)
   ```bash
   gh label create dependencies --color 0E8A16 --description "Dependabot dependency updates"
   gh label create github-actions --color 1D76DB --description "GitHub Actions related updates"
   ```

## 2️⃣ `dependabot.yml` 파일 검토 및 수정

`.github/dependabot.yml` 파일에 라벨 이름이 정확히 일치하는지 확인합니다. 예시:

```yaml
version: 2
updates:
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
    labels:
      - "dependencies"
      - "github-actions"
```

- 라벨 이름에 오타가 있거나, 불필요한 공백이 포함되지 않았는지 확인합니다.
- 필요하지 않은 라벨은 `labels:` 섹션에서 제거할 수 있습니다.

## 3️⃣ 변경 사항 커밋 및 푸시

수정이 완료되면 파일을 커밋하고 푸시합니다.

```bash
git add .github/dependabot.yml
git commit -m "fix: add correct labels for Dependabot"
git push origin main
```

## 4️⃣ 확인

새로운 Dependabot PR이 생성되면 라벨이 정상적으로 붙는지 확인합니다. 라벨이 보이지 않으면 위 과정을 다시 점검합니다.

---

### 참고 자료
- GitHub Docs – [Creating a label](https://docs.github.com/en/issues/using-labels-and-milestones-to-track-work/about-labels#creating-a-label) (공식 문서를 참조해주세요)
- Dependabot 설정 파일 예시 – [dependabot.yml reference](https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuration-options-for-dependency-updates) (공식 문서를 참조해주세요)

---

이 문서는 Dependabot 라벨 오류를 빠르게 해결하고 CI 흐름을 원활히 유지하는 데 도움이 됩니다.