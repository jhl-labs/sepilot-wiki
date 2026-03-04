---
title: "AI 코드 리뷰 에이전트 구축 가이드"
description: "CI 파이프라인에 AI 기반 코드 리뷰 에이전트를 통합하는 방법과 베스트 프랙티스"
category: "Guide"
tags: ["AI", "코드 리뷰", "CI", "GitHub Actions", "에이전트"]
status: "draft"
issueNumber: 0
createdAt: "2026-02-22T02:00:00Z"
updatedAt: 2026-03-04
order: 3
related_docs: ["github-agentic-workflows.md", "continuous-ai.md", "opencode.md", "claude-code-release-history.md"]
redirect_from:
  - ai-code-review-agent-guide
  - ai-continuous-ai-agentic-ci
quality_score: 75
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

## SODAX Builder MCP 연동 가이드
SODAX는 **Builder MCP** 엔드포인트(`https://builders.sodax.com/mcp`)를 공개했으며, Claude, Cursor, Windsurf 등 MCP를 지원하는 AI 코딩 에이전트와 직접 연결할 수 있습니다. 이를 통해 에이전트는 실시간 DeFi 프로토콜 데이터를 캐시가 아닌 현재 상태 그대로 조회할 수 있습니다.

### 1. Model Context Protocol (MCP) 개요
- **MCP**는 AI 어시스턴트가 런타임에 외부 도구에 접근하도록 하는 오픈 표준입니다.  
- 에이전트는 “어떤 토큰이 지원되는가?” 혹은 “어떤 네트워크가 활성화되어 있는가?”를 추측하지 않고, Builder MCP에 직접 질의합니다.  
- 응답은 실시간 프로토콜 데이터이며, 학습 데이터가 아니라 현재 네트워크 상태를 반영합니다.

### 2. 에이전트 설정에 Builder MCP 추가
```json
{
  "modelContext": {
    "endpoints": [
      "https://builders.sodax.com/mcp"
    ]
  }
}
```
위와 같이 `modelContext.endpoints`에 Builder MCP URL을 추가하면 Claude, Cursor, Windsurf 등 MCP를 지원하는 에이전트가 자동으로 사용 가능합니다.

### 3. 주요 MCP 메서드와 반환값
| 메서드 | 설명 | 주요 반환 예시 |
|-------|------|----------------|
| `sodax_get_supported_chains` | SODAX가 운영하는 전체 네트워크 목록 조회 | `["Ethereum","Arbitrum","Base","Optimism","Polygon","Avalanche","BNB Chain","Sonic","HyperEVM","LightLink","ICON","Solana","Stellar","Sui","Kaia", …]` |
| `sodax_get_swap_tokens` | 네트워크별 스와핑 가능한 토큰 목록 | `{ "Ethereum": ["USDC","WETH","DAI"], "Polygon": ["USDC","WMATIC"] }` |
| `sodax_get_money_market_assets` | 대출/차입용 머니 마켓 자산 (≈20개) | `["USDC","USDT","DAI","WETH", …]` |
| `sodax_get_orderbook` | 솔버 큐에 대기 중인 실시간 인텐트 | `{ "bids": [...], "asks": [...] }` |
| `sodax_get_transaction` | 해시로 개별 트랜잭션 조회 | `{ "hash":"0x...", "status":"success", "logs":[...] }` |
| `sodax_get_user_transactions` | 특정 지갑의 거래 내역 | `[{ "hash":"0x...", "type":"swap", "amount":... }, …]` |
| `sodax_get_user_position` | 지갑의 현재 대출/차입 포지션 | `{ "collateral": {...}, "debt": {...} }` |
| `sodax_get_volume` | 필터링 가능한 솔버 거래량 데이터 | `{ "24h": 12345, "7d": 98765 }` |
| `docs_searchDocumentation` | SODAX SDK 문서 검색 | `["sodax_get_swap_tokens", "sodax_get_supported_chains", …]` |

### 4. Claude, Cursor, Windsurf와의 연동 예시
#### Claude (Anthropic) 사용 예시
```bash
# .anthropic/config.json
{
  "model": "claude-3-5-sonnet",
  "mcpEndpoints": ["https://builders.sodax.com/mcp"]
}
```
프롬프트 예시:
```
Please list all supported chains on SODAX using the MCP method `sodax_get_supported_chains`. Return the result as a JSON array.
```

#### Cursor 사용 예시
```json
// cursor.config.json
{
  "model": "cursor-llama-3",
  "mcp": {
    "endpoints": ["https://builders.sodax.com/mcp"]
  }
}
```
프롬프트:
```
Query `sodax_get_swap_tokens` for the Ethereum chain and suggest a code snippet that swaps 100 USDC to WETH using the SODAX SDK.
```

#### Windsurf 사용 예시
```yaml
# windsurf.yaml
model: windsurf-2
mcp:
  endpoints:
    - https://builders.sodax.com/mcp
```
프롬프트:
```
Retrieve the current orderbook for the SOLANA network via `sodax_get_orderbook` and generate a TypeScript function that prints the top 5 bids and asks.
```

### 5. 베스트 프랙티스
| 항목 | 권장 방법 |
|------|-----------|
| **쿼리 최소화** | 필요한 데이터만 요청하고, `limit` 파라미터가 지원되는 경우 사용 |
| **에러 핸들링** | MCP 응답에 `error` 필드가 있으면 재시도 로직을 구현 (exponential backoff) |
| **레이트 제한** | SODAX MCP는 기본 레이트 제한이 있으므로, 1초당 5~10 요청 이하로 유지 |
| **캐시 전략** | 변동성이 낮은 메타데이터(`supported_chains`)는 로컬 캐시(TTL 12h) 후 재조회 |
| **보안** | `OPENAI_API_KEY`와 동일하게 `SODAX_MCP_TOKEN` 같은 비밀을 GitHub Secrets에 저장하고 `env`에 전달 |
| **테스트** | Mock MCP 응답을 사용해 유닛 테스트 작성 (예: `nock` 또는 `msw` 라이브러리) |
| **문서화** | `docs_searchDocumentation`을 활용해 최신 SDK 사용법을 자동으로 문서에 삽입 |

#### CI 파이프라인에 SODAX MCP 연동 예시
```yaml
name: SODAX Data Check
on:
  workflow_dispatch:
jobs:
  query:
    runs-on: ubuntu-latest
    steps:
      - name: Install SODAX SDK
        run: npm install @sodax/sdk
      - name: Query supported chains
        run: |
          node -e "
          const { queryMCP } = require('@sodax/sdk');
          queryMCP('sodax_get_supported_chains')
            .then(res => console.log('Supported chains:', res))
            .catch(err => console.error('MCP error:', err));
          "
        env:
          SODAX_MCP_TOKEN: ${{ secrets.SODAX_MCP_TOKEN }}
```

## 참고 자료
- 원본 기사: [CI에서 나만의 AI 코드 리뷰 에이전트 만들기 | EUNO.NEWS](https://euno.news/posts/ko/build-your-own-ai-code-review-agent-in-ci-738404) (Dev.to 번역)  
- SODAX Builder MCP 소개 및 메서드 목록: https://euno.news/posts/ko/your-ai-coding-agent-can-now-query-sodax-live-data-d40192  
- Model Context Protocol (MCP) 개요: 위 기사 및 dev.to 원문  

---
*이 문서는 Issue 피드백을 반영하여 초안(draft) 상태로 생성되었습니다.*