---
title: "Dependabot 라벨 누락: `dependencies` 라벨 생성 방법"
description: "Dependabot이 PR에 `dependencies` 라벨을 자동으로 붙이려면 해당 라벨이 레포지토리에 존재해야 합니다. 라벨이 없을 경우 발생하는 오류와 해결 방법을 안내합니다."
category: "Troubleshooting"
tags: ["dependabot", "labels", "github"]
status: deleted
issueNumber: 0
createdAt: "2026-03-02T10:00:00Z"
updatedAt: "2026-03-02T10:00:00Z"
---

# Dependabot 라벨 누락 오류

Dependabot이 PR을 생성할 때 `dependencies` 라벨을 자동으로 붙이려 합니다. 하지만 레포지토리에 해당 라벨이 정의되어 있지 않으면 다음과 같은 오류가 발생합니다.

```
The following labels could not be found: `dependencies`. Please create it before Dependabot can add it to a pull request.
```

이 오류는 **dependabot.yml** 파일에 라벨을 지정했지만 실제 라벨이 존재하지 않을 때 나타납니다.

## 해결 방법

1. **GitHub UI를 통해 라벨 생성**
   - 레포지토리 메인 페이지 → **Issues** 탭 → **Labels** 메뉴 클릭
   - **New label** 버튼을 눌러 `dependencies` 라벨을 생성합니다.
   - 색상은 자유롭게 선택하고, 이름은 정확히 `dependencies` 로 입력합니다.

2. **GitHub API를 이용해 라벨 생성**
   ```bash
   curl -X POST \
        -H "Authorization: token <YOUR_TOKEN>" \
        -H "Accept: application/vnd.github+json" \
        https://api.github.com/repos/<owner>/<repo>/labels \
        -d '{"name":"dependencies","color":"0e8a16"}'
   ```
   - `<YOUR_TOKEN>` 은 레포지토리 권한이 있는 Personal Access Token이어야 합니다.
   - `<owner>` 와 `<repo>` 를 실제 값으로 교체합니다.

3. **dependabot.yml 파일 검토**
   - 라벨 이름이 정확히 `dependencies` 로 지정되어 있는지 확인합니다.
   - 예시:
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
   - 라벨 이름에 오타가 있으면 동일한 오류가 발생합니다.

## 참고 자료
- Dependabot 라벨 자동 적용에 대한 공식 문서: [Dependabot security updates](https://docs.github.com/en/github/managing-security-vulnerabilities/about-dependabot-security-updates#about-compatibility-scores) (위 오류 메시지는 GitHub가 직접 제공) 
- 실제 이슈 예시: `The following labels could not be found: dependencies` (현재 Issue 피드백) 

## 추가 팁
- 라벨을 여러 개 지정하고 싶다면 `labels` 배열에 추가로 나열하면 됩니다.
- 라벨을 삭제하거나 이름을 변경하면 기존 PR에 적용된 라벨이 자동으로 업데이트되지 않으니, 라벨을 수정한 뒤 기존 PR을 닫고 새로 생성하는 것이 안전합니다.

---
*이 문서는 Dependabot 라벨 누락 문제를 해결하기 위한 가이드이며, 필요에 따라 레포지토리 정책에 맞게 수정해 사용하세요.*