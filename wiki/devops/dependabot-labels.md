---
title: "Dependabot 라벨 설정 가이드"
description: "Dependabot이 PR에 자동으로 라벨을 추가하도록 `dependencies` 라벨을 생성하고 설정하는 방법을 안내합니다."
category: "Guide"
tags: ["dependabot", "labels", "dependencies"]
status: "draft"
issueNumber: 0
createdAt: "2026-03-09T12:00:00Z"
updatedAt: "2026-03-09T12:00:00Z"
---

# Dependabot 라벨 설정 가이드

## 배경
Dependabot은 보안 및 버전 업데이트 PR을 생성할 때 라벨을 자동으로 붙입니다. 기본 라벨은 `dependencies` 라벨이며, 이 라벨이 레포지토리에 존재하지 않을 경우 **"The following labels could not be found: `dependencies`. Please create it before Dependabot can add it to a pull request."** 라는 오류가 발생합니다. 이는 현재 레포지토리의 라벨 설정이 누락된 경우에 나타납니다.

## 해결 방법
1. **GitHub UI를 이용해 라벨 생성**
   - 레포지토리 메인 페이지 → **Issues** → **Labels** 로 이동합니다.
   - **New label** 버튼을 클릭합니다.
   - **Name**에 `dependencies` 를 입력하고, 색상은 원하는 대로 선택합니다.
   - **Create label**을 눌러 라벨을 저장합니다.

2. **GitHub API를 이용해 라벨 생성 (자동화)**
   ```bash
   curl -X POST \
        -H "Accept: application/vnd.github+json" \
        -H "Authorization: token <YOUR_PERSONAL_ACCESS_TOKEN>" \
        https://api.github.com/repos/<owner>/<repo>/labels \
        -d '{"name":"dependencies","color":"5319e7"}'
   ```
   - `<YOUR_PERSONAL_ACCESS_TOKEN>` 은 `repo` 권한을 가진 토큰이어야 합니다.
   - `<owner>` 와 `<repo>` 를 실제 레포지토리 정보로 교체합니다.

3. **`dependabot.yml` 확인**
   - 레포지토리 루트에 `.github/dependabot.yml` 파일이 존재하는지 확인합니다.
   - 라벨 이름을 커스텀하고 싶다면 `labels:` 섹션에 원하는 라벨을 명시할 수 있습니다.
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

## 적용 후 확인
- Dependabot이 새 PR을 생성하면 자동으로 `dependencies` 라벨이 붙어 있는지 확인합니다.
- 라벨이 정상적으로 표시되지 않으면 **GitHub Actions** 로그와 **Dependabot** 로그를 검토하고, 라벨 이름에 오타가 없는지 재확인합니다.

## 참고
- 이 가이드는 Dependabot이 라벨을 찾지 못한다는 시스템 메시지를 해결하기 위한 일반적인 절차를 다룹니다. 실제 프로젝트에 따라 라벨 이름을 다르게 설정할 수 있습니다.
- 더 자세한 내용은 GitHub 공식 문서의 *[Configuring Dependabot](https://docs.github.com/en/code-security/dependabot/configuration-options)* 를 참고하세요.

---
*이 문서는 Dependabot 라벨 누락 이슈에 대한 해결 방안을 제공하기 위해 생성되었습니다.*