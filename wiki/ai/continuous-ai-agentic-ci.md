---
title: "연속 AI 에이전트 CI 구축 가이드"
description: "CI 파이프라인에 AI 코드 리뷰 에이전트를 통합하는 방법과 베스트 프랙티스"
category: "Guide"
tags: ["AI", "CI", "코드 리뷰", "에이전트"]
status: "published"
issueNumber: 0
createdAt: "2025-12-05T10:00:00Z"
updatedAt: "2026-02-22T10:00:00Z"
order: 3
---

# 연속 AI 에이전트 CI 구축 가이드

이 문서는 CI 파이프라인에 **AI 코드 리뷰 에이전트**를 직접 구현하고, GitHub Actions 를 통해 자동화하는 방법을 단계별로 안내합니다. 아래 섹션에서는 에이전트 설계, CI 통합 단계, 예제 워크플로우 및 베스트 프랙티스를 다룹니다.

---

## 1. AI 코드 리뷰 에이전트 설계

### 1.1 문제점 정의
- **수동 PR 리뷰**는 리뷰어가 피곤할 때 놓치는 부분이 많고, 동일한 코멘트가 반복됩니다.
- **빠른 PR**도 컨텍스트 재구축에 45분 정도 소요될 수 있습니다.

### 1.2 AI‑powered 솔루션
AI 모델을 이용해 모든 Pull Request 를 **구조화된 코드 리뷰**(정확성, 보안, 성능, 테스트) 로 자동 생성합니다. 모델은 OpenAI, Anthropic, OpenRouter, 혹은 로컬 Ollama 인스턴스를 자유롭게 선택할 수 있습니다.

### 1.3 핵심 요소 – 리뷰 루브릭
리뷰 루브릭(프롬프트/워크플로)은 모델 자체보다 중요한 역할을 합니다. 루브릭은 다음을 강제합니다:
- **고위험 이슈**와 **사소한 지적** 구분
- **구체적인 수정 방안** 및 **테스트 제안** 요구
- “내가 살펴본 내용”과 “확신이 없는 부분” 명시

---

## 2. CI 파이프라인 통합 단계

### 2.1 왜 CI 기반 리뷰인가?
- **가격 구조**: 채팅 구독은 인터랙티브 사용에 적합하지만, CI 리뷰는 PR 발생 시에만 실행되어 비용 효율적입니다.
- **사용량 기반 API**: 작은 PR에는 저비용 모델, 대규모 리팩터링에는 고성능 모델을 라우팅할 수 있습니다.
- **로컬 모델**: Ollama 등 로컬 모델을 사용하면 비용이 거의 제로에 가깝습니다.

### 2.2 DIY 파이프라인 제어 항목
- 모델 선택 (OpenAI, Anthropic 등)
- 최대 토큰 수
- 실행 시점 (PR opened, synchronize, reopened 등)
- “검토할 가치가 있는” 기준 정의

---

## 3. 예제 워크플로우와 베스트 프랙티스

### 3.1 GitHub Action 정의
`.github/workflows/ai-code-review.yml` 파일을 생성합니다:

```yaml
name: AI Code Review
on:
  pull_request:
    types: [opened, synchronize, reopened]
jobs:
  review:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Install Jazz (AI 리뷰 도구)
        run: npm install -g jazz-ai
      - name: Run code review workflow
        run: jazz --output raw workflow run code-review --auto-approve
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
      - name: Generate review markdown
        run: jazz --output raw workflow run code-review --auto-approve > review.md
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
      - name: Comment on PR
        run: gh pr comment "$PR_NUMBER" --body-file review.md
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          PR_NUMBER: ${{ github.event.pull_request.number }}
```

> **참고** `--output raw` 옵션은 CI 환경에서 출력 캡처와 리다이렉션을 쉽게 해줍니다. `--auto-approve` 로 완전 자동화를 구현합니다. 권한은 최소화되었습니다.

### 3.2 리뷰 루브릭 (프롬프트) 정의
`workflows/code-review/WORKFLOW.md` 파일을 생성하고 아래와 같이 정의합니다:

```markdown
---
name: code-review
description: Review PR diff and produce a structured report
autoApprove: read-only
---
Review the current PR diff.
Output GitHub‑flavored Markdown with:
1. **Summary** (2–4 bullets)
2. **High‑risk issues** (correctness + security)
3. **Performance / complexity concerns**
4. **API / UX footguns**
5. **Test gaps + concrete test suggestions**
6. **Nitpicks** (style/readability)

**Rules**
- Be specific: reference files/functions.
- Prefer minimal diffs / smallest safe fix.
- If you’re unsure, say so and propose how to verify.
- No generic advice (“add tests”) — propose exact test cases.
- Rank issues (High/Medium/Low).
- List files reviewed, assumptions, and what was not checked.
```

### 3.3 베스트 프랙티스 체크리스트
- **읽기 전용 모드**: `autoApprove` 를 `read-only` 로 유지해 에이전트가 저장소를 수정하지 못하도록 합니다.
- **이슈 순위 매기기**: 모든 이슈에 **High/Medium/Low** 라벨을 부여해 중요도를 명확히 합니다.
- **오탐 예산**: 잡음이 많으면 무시되므로, 평가 기준을 조정해 오탐을 최소화합니다.
- **모델 라우팅**: 작은 PR → 저비용 모델, 대규모 리팩터링 → 고성능 모델 사용.
- **투명성**: 에이전트가 검토한 파일 목록, 가정, 검토하지 않은 항목을 명시하도록 요구합니다.

### 3.4 실제 사례
Jazz 저장소는 자체 코드 리뷰와 릴리즈 노트에 **Jazz** 를 사용합니다. 워크플로 파일은 다음에서 확인할 수 있습니다: https://github.com/lvndry/jazz/tree/main/.github

---

## 4. 마무리
위 가이드를 따라 CI 파이프라인에 AI 코드 리뷰 에이전트를 구현하면, **자동화된 고품질 리뷰**를 제공하면서 리뷰 비용을 크게 절감할 수 있습니다. 질문이나 개선 사항이 있으면 언제든 이슈를 열어 주세요.
