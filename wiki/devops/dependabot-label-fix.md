---
title: "Dependabot 라벨 `dependencies` 누락 문제 해결 가이드"
description: "Dependabot이 PR에 `dependencies` 라벨을 추가하려고 할 때 라벨이 존재하지 않아 발생하는 오류를 해결하는 방법을 안내합니다."
category: "Troubleshooting"
tags: ["dependabot", "label", "github", "CI"]
status: "draft"
issueNumber: 0
createdAt: "2026-03-09T09:00:00Z"
updatedAt: "2026-03-09T09:00:00Z"
---

# Dependabot 라벨 `dependencies` 누락 문제 해결 가이드

## 문제 상황
Dependabot이 Pull Request에 `dependencies` 라벨을 자동으로 추가하려고 시도하지만, 해당 라벨이 레포지토리에 존재하지 않아 아래와 같은 오류가 발생합니다.

```
The following labels could not be found: `dependencies`. Please create it before Dependabot can add it to a pull request.
```

## 해결 방법
### 1. 라벨 생성하기
#### a) GitHub 웹 UI 사용
1. 레포지토리 메인 페이지에서 **Issues** 탭을 클릭합니다.
2. 오른쪽 사이드바의 **Labels** 를 선택합니다.
3. **New label** 버튼을 클릭합니다.
4. **Name** 에 `dependencies` 를 입력하고, 필요에 따라 색상을 선택한 뒤 **Create label** 을 클릭합니다.

#### b) `labels.yml` 파일을 이용해 자동 생성 (옵션)
레포지토리 루트에 `.github/labels.yml` 파일을 만들고 다음과 같이 정의합니다.

```yaml
- name: dependencies
  color: 0E8A16   # 초록색 (선택 사항)
  description: "Dependency updates from Dependabot"
```

GitHub Actions 혹은 `probot` 등 자동화 도구가 이 파일을 읽어 라벨을 생성하도록 설정할 수 있습니다.

#### c) GitHub API 로 라벨 만들기
```bash
curl -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: token YOUR_GITHUB_TOKEN" \
  https://api.github.com/repos/OWNER/REPO/labels \
  -d '{"name":"dependencies","color":"0E8A16","description":"Dependency updates from Dependabot"}'
```

> **주의**: `YOUR_GITHUB_TOKEN` 은 `repo` 권한을 가진 토큰이어야 합니다.

### 2. `dependabot.yml` 에서 잘못된 라벨 지정 제거
`dependabot.yml` 파일에 `labels:` 섹션이 존재한다면, 존재하지 않는 라벨이 포함되어 있지 않은지 확인합니다. 예시:

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    # 아래 라벨이 존재하지 않을 경우 오류가 발생합니다.
    # labels:
    #   - "dependencies"
```

필요하지 않다면 `labels:` 항목 자체를 삭제하거나, 라벨 이름을 정확히 `dependencies` 로 맞춰 주세요.

### 3. 변경 사항 커밋 및 푸시
```bash
git add .github/labels.yml .github/dependabot.yml
git commit -m "Add missing 'dependencies' label for Dependabot"
git push origin main
```

## 검증
1. Dependabot이 새 PR을 생성하면 자동으로 `dependencies` 라벨이 붙는지 확인합니다.
2. 기존 PR에 라벨이 정상적으로 표시되는지 확인합니다.

## 참고 자료
- [GitHub Docs – About labels](https://docs.github.com/en/issues/using-labels-and-milestones-to-track-work/about-labels) (출처)
- Dependabot 공식 문서: <https://docs.github.com/en/code-security/dependabot>

---
*이 문서는 Dependabot 라벨 문제를 해결하기 위한 가이드이며, 필요에 따라 레포지토리 정책에 맞게 조정하세요.*