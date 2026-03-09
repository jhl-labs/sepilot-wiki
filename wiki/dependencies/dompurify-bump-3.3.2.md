---
title: "chore(deps): bump dompurify from 3.3.1 to 3.3.2"
description: "DOMPurify 라이브러리를 3.3.1 → 3.3.2 로 업데이트하고, Dependabot 라벨 `dependencies` 가 존재하지 않아 발생한 이슈를 정리합니다."
category: "Reference"
tags: ["dependabot", "dompurify", "dependency-update", "labels"]
status: "draft"
issueNumber: 0
createdAt: "2026-03-09T21:00:00Z"
updatedAt: "2026-03-09T21:00:00Z"
---

# DOMPurify 3.3.2 업데이트

- **업데이트 내용**: `dompurify` 패키지를 **3.3.1** → **3.3.2** 로 버전 업그레이드합니다.
- **PR**: `chore(deps): bump dompurify from 3.3.1 to 3.3.2` (Dependabot)
- **Release notes** (DOMPurify 3.3.2) 
  - jsdom 의 raw‑text 태그 파싱 버그로 인한 우회 가능성 수정
  - 커스텀 엘리먼트 사용 시 발생하던 prototype pollution 문제 해결 ([@christos‑eth](https://github.com/christos-eth))
  - `_isValidAttribute` 의 느슨한 설정 파싱 오류 수정 ([@christos‑eth](https://github.com/christos-eth))
  - 여러 의존성 버전 업데이트 및 정리 ([@Rotzbua](https://github.com/Rotzbua))
  - 의존성 업데이트 후 테스트 스위트 오류 수정 ([@Rotzbua](https://github.com/Rotzbua))

> **출처**: [DOMPurify 3.3.2 릴리즈 노트](https://github.com/cure53/DOMPurify/releases/tag/3.3.2) 

# Dependabot 라벨 문제

PR에 자동으로 붙여야 할 `dependencies` 라벨이 현재 레포지토리에서 정의되지 않아 아래와 같은 오류가 발생했습니다.

```
The following labels could not be found: `dependencies`. Please create it before Dependabot can add it to a pull request.
```

## 해결 방안
1. **라벨 생성**
   - 레포지토리 설정 → *Labels* 페이지에서 `dependencies` 라벨을 새로 만듭니다.
   - 색상은 자유롭게 선택 (예: `#0366d6`).
2. **dependabot.yml 검토**
   - `.github/dependabot.yml` 파일에 `labels:` 섹션이 올바르게 지정되어 있는지 확인합니다.
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
3. **PR 재생성**
   - 라벨이 정상적으로 추가되면 Dependabot이 자동으로 `dependencies` 라벨을 붙이고, 기존 PR을 재시도합니다.

# 참고 자료
- DOMPurify 공식 레포지토리: https://github.com/cure53/DOMPurify
- Dependabot 라벨 설정 가이드: https://docs.github.com/en/github/administering-a-repository/managing-labels-in-a-repository

---
*이 문서는 Dependabot 의존성 업데이트와 라벨 관리에 대한 내부 가이드로, 향후 비슷한 상황에서 빠르게 대응하기 위해 작성되었습니다.*