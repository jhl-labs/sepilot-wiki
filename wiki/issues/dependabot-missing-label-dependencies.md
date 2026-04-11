---
title: "Dependabot PR 라벨 `dependencies` 누락 문제 해결 방법"
description: "Dependabot이 PR에 `dependencies` 라벨을 추가하려고 할 때 라벨이 존재하지 않아 오류가 발생합니다. 라벨을 생성하거나 `dependabot.yml`에서 잘못된 라벨 설정을 제거하는 방법을 안내합니다."
category: "Troubleshooting"
tags: ["dependabot", "labels", "github-actions", "CI"]
status: "draft"
issueNumber: 0
createdAt: "2026-04-11T10:00:00Z"
updatedAt: "2026-04-11T10:00:00Z"
---

# Dependabot PR 라벨 `dependencies` 누락 문제 해결 방법

## 문제 상황
Dependabot이 Pull Request에 `dependencies` 라벨을 자동으로 추가하려고 할 때, 해당 라벨이 레포지토리에 존재하지 않으면 다음과 같은 오류가 발생합니다.

```
The following labels could not be found: `dependencies`. Please create it before Dependabot can add it to a pull request.
```

이 오류는 **`dependabot.yml`** 파일에 `labels: ["dependencies"]` 와 같이 라벨이 지정돼 있지만 실제 라벨이 생성되지 않은 경우에 발생합니다.

## 해결 방법
### 1️⃣ 라벨 직접 생성 (GitHub UI)
1. 레포지토리 메인 페이지에서 **`Issues` → `Labels`** 로 이동합니다.
2. **`New label`** 버튼을 클릭합니다.
3. **Name** 에 `dependencies` 를 입력하고, 색상은 원하는 대로 선택합니다.
4. **Create label** 을 눌러 라벨을 생성합니다.

> 라벨이 생성되면 기존 Dependabot PR에 자동으로 적용됩니다.

### 2️⃣ 라벨 직접 생성 (GitHub API)
```bash
curl -X POST \
  -H "Authorization: token <YOUR_PERSONAL_ACCESS_TOKEN>" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/<owner>/<repo>/labels \
  -d '{"name":"dependencies","color":"0366d6"}'
```
* `<YOUR_PERSONAL_ACCESS_TOKEN>` 은 `repo` 권한을 가진 토큰이어야 합니다.
* `<owner>` 와 `<repo>` 를 실제 레포지토리 정보로 교체합니다.

### 3️⃣ `dependabot.yml` 수정 (라벨 제거)
라벨이 필요하지 않다면 `dependabot.yml` 에서 해당 라벨 항목을 삭제합니다.
```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    # labels: ["dependencies"]   # ← 이 줄을 주석 처리하거나 삭제
```
수정 후 커밋하고 푸시하면 다음 Dependabot 실행부터 라벨 오류가 사라집니다.

### 4️⃣ 기존 PR 라벨 수동 적용 (옵션)
라벨을 새로 만든 뒤 기존 Dependabot PR에 수동으로 `dependencies` 라벨을 추가해도 됩니다.
1. PR 페이지 열기
2. 오른쪽 사이드바 **`Labels`** 섹션에서 `dependencies` 라벨 선택

## 예방 팁
- 새 레포지토리를 만들 때 **`dependencies`** 라벨을 기본 라벨 세트에 포함시키면 Dependabot 오류를 미연에 방지할 수 있습니다.
- `dependabot.yml` 파일을 수정할 때 라벨 이름이 정확히 레포지토리에 존재하는지 확인합니다.
- CI 파이프라인에 라벨 존재 여부를 검증하는 스크립트를 추가해 자동화할 수 있습니다.

## 참고 자료
- [GitHub Docs – Adding a label to an issue or pull request](https://docs.github.com/en/issues/tracking-your-work-with-issues/adding-labels-to-issues-and-pull-requests)
- [Dependabot configuration options](https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuration-options-for-dependency-updates)
- [GitHub REST API – Create a label](https://docs.github.com/en/rest/issues/labels#create-a-label)

---
*이 문서는 Dependabot 라벨 오류를 해결하기 위한 가이드이며, 레포지토리 관리자가 라벨을 직접 관리하거나 `dependabot.yml`을 적절히 수정하도록 돕습니다.*