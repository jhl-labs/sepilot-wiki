---
title: "Label: dependencies"
description: "Dependabot 및 기타 의존성 업데이트와 관련된 풀 리퀘스트에 사용되는 GitHub 레이블에 대한 설명입니다."
category: "meta"
tags: ["label", "dependencies", "dependabot"]
status: deleted
issueNumber: 0
createdAt: "2026-02-21T11:30:00Z"
updatedAt: "2026-02-21T11:30:00Z"
order: 1
redirect_from:
  - backend-label-dependencies
  - meta-dependencies
  - backend-label-dependencies
  - labels-label-dependencies
  - labels-dependencies
related_docs: ["weekly-2026-08.md"]
---

# dependencies 레이블

`dependencies` 레이블은 프로젝트의 **의존성 업데이트**와 관련된 Pull Request에 자동으로 적용됩니다. Dependabot이 새로운 버전이 발견되면 해당 PR에 이 레이블을 붙여서 리뷰어가 의존성 변경임을 쉽게 인식할 수 있도록 합니다.

## 사용 예시
- `chore(deps): bump ajv from 6.12.6 to 6.14.0`
- `chore(deps): bump lodash from 4.17.20 to 4.17.21`

## 설정 방법
`dependabot.yml` 파일에 의존성 업데이트를 활성화하고, 레이블이 존재하지 않을 경우 GitHub 레포지토리 설정에서 **Labels** 섹션으로 이동해 `dependencies` 레이블을 직접 생성합니다.

> **Note**: 현재 레포지토리에는 `dependencies` 레이블이 존재하지 않아 Dependabot이 레이블을 추가하지 못하고 있습니다. 레이블을 생성한 뒤 Dependabot이 정상적으로 작동하도록 해 주세요.

---

*이 문서는 현재 이슈의 피드백을 반영하여 초안(draft) 상태로 생성되었습니다.*