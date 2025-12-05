---
title: 홈
author: SEPilot Team
tags: [home, welcome, introduction]
---

# SEPilot Wiki에 오신 것을 환영합니다

SEPilot Wiki는 AI 에이전트 기반의 자동화된 문서 관리 시스템입니다.

## 이 Wiki의 특징

### AI 기반 문서 작성
- GitHub Issue에서 `request` 라벨로 새 문서를 요청하세요
- AI가 자동으로 초안을 작성하고 Maintainer가 검토합니다
- 피드백을 반영하여 지속적으로 문서가 개선됩니다

### 협업 워크플로우
- PR을 통한 문서 변경 리뷰
- Issue 댓글을 통한 피드백
- 변경 이력 추적

### 자동 정보 수집
- cron 스케줄을 통해 시스템 상태 정보 자동 업데이트
- K8s 노드 상태, 서비스 health 등 실시간 정보 반영

## 시작하기

1. 왼쪽 사이드바에서 **문서** 섹션을 확인하세요
2. 새 문서가 필요하면 [Issue 생성](https://github.com/jhl-labs/sepilot-wiki/issues/new) 후 `request` 라벨 추가
3. 기존 문서 수정은 PR 또는 Issue 댓글로 요청

## 문서 구조

모든 문서는 마크다운 형식으로 작성됩니다:

```markdown
---
title: 문서 제목
author: 작성자
tags: [태그1, 태그2]
---

# 문서 내용
```

## 라벨 시스템

| 라벨 | 설명 |
|------|------|
| `request` | 새 문서 작성 요청 |
| `invalid` | 문서 오류 신고 |
| `draft` | 초안 상태 |
| `ai-generated` | AI가 작성한 문서 |

---

문의사항이 있으시면 [GitHub Issues](https://github.com/jhl-labs/sepilot-wiki/issues)를 이용해주세요.
