---
title: "Dependabot 라벨 누락 문제 해결하기"
description: "Dependabot이 PR에 라벨을 추가하지 못하는 경우, 라벨을 생성하고 dependabot.yml을 올바르게 설정하는 방법을 안내합니다."
category: "Troubleshooting"
tags: ["dependabot", "labels", "github-actions"]
status: "draft"
issueNumber: 0
createdAt: "2026-03-30T09:00:00Z"
updatedAt: "2026-03-30T09:00:00Z"
---

# Dependabot 라벨 누락 문제 해결하기

## 문제 상황
Dependabot이 PR에 자동으로 라벨을 붙이려고 할 때 다음과 같은 오류가 발생합니다.

```
The following labels could not be found: `dependencies`, `github-actions`. Please create them before Dependabot can add them to a pull request.
Please fix the above issues or remove invalid values from `dependabot.yml`.
```

이 메시지는 **dependabot.yml** 파일에 지정된 라벨이 레포지토리에 존재하지 않을 때 나타납니다.

## 해결 단계

1. **필요한 라벨 확인**
   - `dependencies`
   - `github-actions`
   - (필요에 따라 추가 라벨이 있을 수 있습니다.)

2. **레포지토리에서 라벨 생성**
   - 레포지토리 메인 페이지 → **Issues** 탭 → **Labels** 메뉴 클릭
   - **New label** 버튼을 눌러 아래와 같이 라벨을 추가합니다.
     - **Name**: `dependencies`
       - **Color**: 원하는 색 (예: `#0366d6`)
     - **Name**: `github-actions`
       - **Color**: 원하는 색 (예: `#008672`)
   - 라벨을 저장합니다.

3. **dependabot.yml 파일 검증**
   - 레포지토리 루트에 있는 `.github/dependabot.yml` 파일을 엽니다.
   - `labels:` 섹션에 존재하지 않는 라벨이 있으면 삭제하거나 올바른 라벨 이름으로 수정합니다.
   - 예시:

   ```yaml
   version: 2
   updates:
     - package-ecosystem: "github-actions"
       directory: "/"
       schedule:
         interval: "weekly"
       labels:
         - "github-actions"   # 존재하는 라벨 이름
   ```

4. **변경 사항 커밋 및 푸시**
   - 라벨을 만든 후, `dependabot.yml` 파일을 수정했다면 커밋하고 푸시합니다.
   - Dependabot이 다음 실행 시 정상적으로 라벨을 붙일 수 있습니다.

5. **동작 확인**
   - Dependabot이 새 PR을 생성하거나 기존 PR에 라벨이 자동으로 붙는지 확인합니다.
   - 여전히 문제가 발생한다면 **Actions** 로그와 **Dependabot** 로그를 확인하고, 라벨 이름에 오타가 없는지 재검토합니다.

## 추가 팁
- 라벨 이름은 **대소문자를 구분**합니다. `Dependencies`와 `dependencies`는 다른 라벨로 인식됩니다.
- 여러 라벨을 지정하고 싶다면 `labels:` 아래에 배열 형태로 나열합니다.
- 라벨 색상은 팀 정책에 맞게 지정하면 가시성을 높일 수 있습니다.

## 참고 자료
- [GitHub Docs: Configuring Dependabot](https://docs.github.com/en/code-security/dependabot/configuring-dependabot) – 공식 문서
- [GitHub Docs: Managing Labels](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-labels) – 라벨 관리 방법

---
*이 문서는 Dependabot 라벨 문제를 해결하기 위한 가이드이며, 필요에 따라 레포지토리 정책에 맞게 조정하세요.*