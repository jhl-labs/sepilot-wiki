---
title: "AI 코드 리뷰 에이전트 구축 가이드"
description: "CI 파이프라인에 AI 기반 코드 리뷰 에이전트를 통합하는 방법과 베스트 프랙티스"
category: "Guide"
tags: ["AI", "코드 리뷰", "CI", "GitHub Actions", "에이전트"]
status: "draft"
issueNumber: 0
createdAt: "2026-02-22T02:00:00Z"
updatedAt: "2026-02-22T02:00:00Z"
order: 10
related_docs: ["github-agentic-workflows.md", "continuous-ai.md", "opencode.md", "claude-code-release-history.md"]
redirect_from:
  - ai-continuous-ai-agentic-ci
---

# AI 코드 리뷰 에이전트 구축 가이드

## 개요
수동 PR 리뷰는 리뷰어가 피곤할 때 놓치는 부분이 생기고, 동일한 코멘트가 반복되는 등 비효율적인 문제가 있습니다. AI‑powered 솔루션을 활용하면 모든 풀 리퀘스트에 대해 구조화된 코드 리뷰(정확성, 보안, 성능, 테스트)를 CI가 자동으로 수행하도록 할 수 있습니다. 원하는 모델(OpenAI, Anthropic, OpenRouter, 혹은 로컬 Ollama 인스턴스)을 사용해 별도의 구독료 없이도 리뷰를 제공할 수 있습니다.

## AI 코드 리뷰 에이전트 설계
- **리뷰 루브릭(프롬프트/워크플로)**: 모델이 아니라 리뷰 기준을 정의합니다.
  - 고위험 이슈와 사소한 지적을 구분
  - 구체적인 수정 방안과 테스트 제안 요구
  - "내가 살펴본 내용"과 "내가 확신하지 못하는 부분" 명시
- **모델 선택**: 비용·속도·정확도에 따라 모델 라우팅
- **실행 시점**: PR 발생 시 자동 트리거
- **제어 파라미터**: 최대 토큰 수, 검토 기준 등 사용자 정의 가능

## CI 파이프라인 통합 단계
1. **GitHub Action 워크플로 파일 생성** (`.github/workflows/ai-code-review.yml`)
   ```yaml
   name: AI Code Review
   on:
     pull_request:
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
         - name: Install Jazz
           run: npm install -g jazz-ai
         - name: Run code review workflow
           run: jazz --output raw workflow run code-review --auto-approve
           env:
             OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
   ```
   - `--output raw`는 CI 환경에서 출력 캡처가 용이하도록 합니다.
   - `--auto-approve`는 완전 자동화를 의미합니다.
2. **리뷰 루브릭 파일 생성** (`workflows/code-review/WORKFLOW.md`)
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
3. **리뷰 캡처 및 PR 코멘트**
   ```yaml
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
   인라인 주석은 선택 사항이며, 기본적인 가치 제공을 위해서는 위 단계만으로 충분합니다.

## 예제 워크플로우와 베스트 프랙티스
- **읽기 전용 모드**: `autoApprove`를 읽기 전용으로 유지해 에이전트가 저장소를 수정하지 못하도록 합니다.
- **이슈 순위 매기기**: 모든 이슈에 중요도(High/Medium/Low)를 부여해 실제 중요한 문제에 집중합니다.
- **오탐 예산 관리**: 리뷰가 너무 잡음이 많으면 무시될 수 있으니, 오탐 비율을 조정합니다.
- **모델 라우팅 전략**:
  - 작은 PR → 저비용 모델 (예: Ollama, OpenRouter의 경량 모델)
  - 대규모 리팩터링 → 고성능 모델 (예: OpenAI GPT‑4o)
- **투명성**: 에이전트가 검토한 파일 목록, 가정한 내용, 검토하지 않은 항목을 명시하도록 요구합니다.
- **실제 사례**: Jazz 저장소는 자체 코드 리뷰와 릴리즈 노트에 Jazz를 사용합니다. 워크플로 파일은 [GitHub - lvndry/jazz](https://github.com/lvndry/jazz/tree/main/.github) 에서 확인할 수 있습니다.

## 참고 자료
- 원본 기사: [CI에서 나만의 AI 코드 리뷰 에이전트 만들기 | EUNO.NEWS](https://euno.news/posts/ko/build-your-own-ai-code-review-agent-in-ci-738404) (Dev.to 번역)

---
*이 문서는 Issue 피드백을 반영하여 초안(draft) 상태로 생성되었습니다.*