---
title: "OpenClaw Complete Guide"
description: "OpenClaw 사용 가이드와 MailCat 이메일 인증 자동화 섹션을 포함한 종합 안내서"
category: "Guide"
tags: ["OpenClaw", "MailCat", "Email 인증", "AI 에이전트"]
status: "draft"
issueNumber: 0
createdAt: "2026-02-22T02:15:00Z"
updatedAt: "2026-02-22T02:15:00Z"
---

# OpenClaw Complete Guide

OpenClaw는 AI 에이전트가 웹을 탐색하고, 코드를 작성하며, 다양한 작업을 자동화할 수 있도록 돕는 프레임워크입니다. 본 가이드는 OpenClaw의 기본 설정, 주요 기능, 그리고 실제 사용 예시를 다룹니다.

> **※ 현재 문서는 초안(draft) 상태이며, 추후 검토 후 발행될 예정입니다.**

---

## 📧 MailCat 이메일 인증 자동화

### MailCat 소개
MailCat은 AI 에이전트가 이메일 인증 과정을 자동으로 처리할 수 있게 해주는 서비스입니다. 단 한 번의 프롬프트만으로 메일박스를 생성하고, 토큰을 안전하게 저장한 뒤, 필요할 때마다 인증 코드를 추출합니다.

- **One‑prompt setup**: AI가 `skill.md` 문서를 읽고 스스로 통합합니다.
- **Auto‑extraction**: 인증 코드와 링크를 자동으로 추출합니다.
- **1‑hour retention**: 인증 흐름에 최적화된 짧은 보관 기간.
- **Self‑hostable**: Cloudflare 계정에 배포 가능.
- **Open source**: MIT 라이선스.

### 단일 프롬프트 설정 방법
다음 프롬프트를 OpenClaw(또는 Claude Code, 기타 AI 에이전트)에게 전달하면 MailCat 통합이 자동으로 이루어집니다.

```text
Read https://mailcat.ai/skill.md and set up a MailCat mailbox for yourself. Save the token securely.
```

위 명령을 실행하면 에이전트는:
1. `skill.md` 문서를 읽음
2. API를 통해 MailCat 메일박스 생성
3. 토큰을 안전하게 저장
4. 필요 시 받은 편지함을 확인하고 인증 코드를 자동 추출

추가적인 설정이나 별도의 API 키가 필요하지 않습니다. AI에게 문서를 읽으라고 지시하면 나머지는 스스로 처리합니다.

### 통합 예시
```yaml
# OpenClaw workflow example
steps:
  - name: Setup MailCat
    run: |
      echo "Read https://mailcat.ai/skill.md and set up a MailCat mailbox for yourself. Save the token securely."
  - name: Perform Email Verification
    run: |
      # 에이전트가 자동으로 인증 이메일을 확인하고 코드를 추출합니다.
      openclaw verify-email --service your-service
```

### 왜 작동하나요?
AI가 문서를 읽고 이해할 수 있다면, 해당 문서에 정의된 API 호출과 토큰 관리 절차를 그대로 실행할 수 있습니다. `skill.md`는 AI 에이전트를 위해 특별히 설계된 문서로, 명확한 구조와 완전한 API 예시를 제공하여 통합을 손쉽게 만듭니다.

---

## 참고 자료
- **출처**: [EUNO.NEWS – OpenClaw 이메일 액세스를 부여하는 한 번의 프롬프트](https://euno.news/posts/ko/one-prompt-to-give-your-openclaw-email-access-db7c36) (Dev.to)

---

*이 문서는 자동 생성된 초안이며, 검토 후 업데이트될 수 있습니다.*