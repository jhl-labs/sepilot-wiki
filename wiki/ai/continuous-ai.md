---
title: "Continuous AI – 인간이 AI 오류를 검증하는 방법"
description: "AI 코딩 에이전트를 활용하면서 인간이 오류를 검증하고 검증 워크플로우를 구축하는 방법"
category: "Guide"
tags: ["Continuous AI", "Human-in-the-Loop", "AI 검증", "CI"]
status: "published"
issueNumber: 198
createdAt: "2026-02-21T13:05:00Z"
updatedAt: 2026-02-24
order: 4
related_docs: ["continuous-ai-agentic-ci.md", "vibe-coding.md", "opencode.md"]
---

# Continuous AI – 인간이 AI 오류를 검증하는 방법

AI 코딩 에이전트를 **CI 파이프라인**, **스크래퍼**, **데이터베이스 스키마 설계** 등 다양한 작업에 활용하는 사례가 늘어나고 있습니다. 하지만 실제 현장에서 가장 큰 가치는 **AI가 만든 코드를 검증하고, AI가 놓친 오류를 찾아내는 인간의 역할**이라는 인사이트가 있습니다. 본 가이드는 해당 인사이트를 바탕으로 **Human‑in‑the‑Loop(HITL) 리뷰**, **공통 AI 실수 패턴**, **검증 워크플로우**를 제시합니다.

> “일은 코드를 작성하는 것이 아니다. AI가 틀렸을 때를 아는 것이다.” – *Euno.news*[[출처](https://euno.news/posts/ko/the-job-isnt-writing-code-its-knowing-when-the-ai-f67ef5)]

---

## 1. Human‑in‑the‑Loop Review

1. **자동화된 결과에 대한 인간 검증** – AI가 생성한 코드·데이터를 그대로 받아들이지 말고, **핵심 로직·비즈니스 규칙**을 인간이 직접 검토합니다.  
2. **검증 체크리스트** – 아래와 같은 항목을 체크리스트 형태로 관리합니다.  
   - 입력 데이터가 기대 형식과 일치하는가?  
   - 출력이 비즈니스 요구사항을 충족하는가?  
   - 보안·프라이버시 위험이 없는가?  
3. **피드백 루프** – 검증 결과를 AI 프롬프트에 반영해 **프롬프트 개선**과 **모델 파인튜닝**에 활용합니다.

---

## 2. Common AI Mistake Patterns

### 2.1 잘못된 도구 선택  
AI가 기존에 사용 중인 **정규식** 기반 파싱을 유지하자고 제안하지만, **LLM 기반 파싱**이 더 탄력적이고 유지보수가 용이합니다. (예: 기술 스택 추출) [[출처](https://euno.news/posts/ko/the-job-isnt-writing-code-its-knowing-when-the-ai-f67ef5)]

### 2.2 Technically Correct, Actually Misleading  
AI가 **다중 지역**(`Americas`, `Europe`) 태그를 붙였지만, 실제로는 **특정 국가**(예: 미국, 캐나다 등)만 지원합니다. 지역 레이블이 오해를 일으켜 사용자에게 잘못된 정보를 제공할 수 있습니다. [[출처](https://euno.news/posts/ko/the-job-isnt-writing-code-its-knowing-when-the-ai-f67ef5)]

### 2.3 Silent Failure  
파이프라인이 **오류 없이 성공**했지만, 실제로는 **중복 제거 규칙**이나 **급여 필드 파싱** 오류로 유효한 채용 정보를 누락했습니다. 로그에 경고가 없으므로 인간이 **결과를 직관적으로 검토**해야 합니다. [[출처](https://euno.news/posts/ko/the-job-isnt-writing-code-its-knowing-when-the-ai-f67ef5)]

---

## 3. Verification Workflows

1. **자동 테스트 단계** – AI가 생성한 코드에 대해 **유닛 테스트**, **통합 테스트**를 자동 실행합니다.  
2. **정적 분석** – Linter, 보안 스캐너 등 정적 분석 도구를 적용해 **코드 품질**을 검증합니다.  
3. **Human Review Gate** – 테스트와 정적 분석을 통과한 결과를 **Human‑in‑the‑Loop** 검토 단계로 넘깁니다.  
   - 리뷰어는 **체크리스트**를 활용해 비즈니스 로직, 데이터 정확성, 보안 위험 등을 확인합니다.  
4. **Feedback Integration** – 리뷰 결과를 **프롬프트**와 **CI 설정**에 반영해 다음 사이클에서 동일 오류가 재발하지 않도록 합니다.  
5. **Audit Log** – 모든 검증 단계와 인간 피드백을 **감사 로그**에 기록해 추후 분석 및 학습에 활용합니다.

---

## 4. World Model Overview

### 4.1 왜 지속적인 World Model이 필요한가  
Euno.news와 ODEI 보고서에 따르면, **컨텍스트 윈도우**는 토큰 기반의 휘발성 캐시와 같습니다. 200 K 토큰 윈도우도 30 일 동안 실행되는 자율 에이전트가 축적하는 **수백 개의 결정**, **수천 개의 엔티티**, **복잡한 관계**, **헌법적 원칙**을 모두 담기에 부족합니다[[출처](https://euno.news/posts/ko/why-every-ai-agent-needs-a-persistent-world-model-ef7a56)].

### 4.2 ODEI World Model Architecture  
ODEI는 2026 년 1 월부터 **헌법 기반 세계 모델**을 서비스하고 있습니다. 핵심은 **그래프 데이터베이스(Neo4j)**와 **7‑계층 가드레일**이며, 총 91개의 노드와 91개의 관계 유형을 관리합니다.

| 레이어 | 노드 수 | 주요 내용 |
|--------|--------|-----------|
| FOUNDATION | 25 | Identity, values, partnerships, principles |
| VISION | 12 | 장기 목표와 포부 |
| STRATEGY | 16 | 계획, 이니셔티브, 자원 배분 |
| TACTICS | 8 | 작업, 시간 블록, 실행 |
| EXECUTION | 11 | 작업 세션, 산출물, 결과 |
| TRACK | 19 | 메트릭, 신호, 관찰 |

**시간적 메모리**: 각 노드에 `createdAt`, `updatedAt`, 선택적 `expiresAt`가 있어 “언제 어떤 것이 사실이었는지”를 조회할 수 있습니다.  
**헌법적 검증**: 쓰기·행동 전 7단계(불변성, 시간적 맥락, 참조 무결성, 권한, 중복 제거, 출처, 헌법 정렬) 검사를 수행해 `APPROVED`, `REJECTED`, `ESCALATE` 중 하나를 반환합니다[[출처](https://api.odei.ai/)].

### 4.3 활용 예시 (MCP)

```json
{
  "mcpServers": {
    "odei": {
      "command": "npx",
      "args": ["@odei/mcp-server"]
    }
  }
}
```

위 설정을 통해 Claude Desktop, Cursor 등 MCP‑호환 클라이언트에서 **그래프 조회**, **가드레일 검증** 등을 직접 호출할 수 있습니다.

---

## 5. Limitations of Fixed Context Windows

1. **토큰 제한** – 현재 가장 큰 모델도 200 K 토큰을 초과하면 오래된 내용이 자동으로 삭제됩니다.  
2. **휘발성** – 세션이 종료되면 메모리 내에 있던 모든 결정·관계·원칙이 사라집니다. 새로운 세션은 **제로**부터 시작합니다.  
3. **관계 표현 부재** – 시간적·인과적·계층적·헌법적 관계는 순차적인 텍스트가 아니라 **그래프** 형태가 필요합니다. 벡터 검색(RAG)만으로는 이러한 관계를 정확히 재현하기 어렵습니다.  
4. **스케일링 비용** – 전체 컨텍스트를 로드하려면 수천 토큰이 소모돼 비용이 급증하고, 실시간 응답성이 저하됩니다.

이러한 한계는 **지속적인 World Model**이 제공하는 **구조화된 저장·쿼리·가드레일**로 보완됩니다.

---

## 6. RAG vs. Persistent World Model

| 특성 | Vector RAG | Persistent World Model (그래프) |
|------|------------|--------------------------------|
| **목적** | 문서 기반 질의‑응답 | 엔티티·관계·시간·헌법 전반 관리 |
| **데이터 형태** | 텍스트 임베딩 | 노드·엣지, 속성 기반 |
| **관계 표현** | 유사도 기반, 얕은 연결 | 명시적 그래프 관계, 깊은 트래버스 |
| **시간성** | 최신 문서만 인덱스 | `createdAt/updatedAt`으로 시점 조회 가능 |
| **헌법·가드레일** | 없음 | 7‑계층 검증 자동 적용 |
| **토큰 효율** | 전체 문서 로드 시 3 000–5 000 토큰 | 필요한 노드·속성만 조회 → 200–800 토큰 |
| **확장성** | 문서 수 증가 시 인덱스 재구축 필요 | 노드·관계 추가가 즉시 반영 |

결론적으로, **RAG**는 “문서 X에 대해 뭐라고 말했나요?” 같은 단순 질의에 강하지만, **지속적인 World Model**은 “A가 3주 전 B를 차단했는가?”, “이 행동이 현재 헌법을 위반하는가?”와 같이 **그래프 문제**를 해결하는 데 필수적입니다[[출처](https://euno.news/posts/ko/why-every-ai-agent-needs-a-persistent-world-model-ef7a56)].

---

## 7. 비용 절감 전략 (AI 에이전트 비용 75% 절감)

### 7.1 컨텍스트 재사용 패턴
대부분의 AI 에이전트는 매 세션마다 동일한 컨텍스트를 다시 로드하면서 토큰을 소모합니다. 이를 방지하기 위해 **구조화된 메모리 파일**을 활용합니다.

| 파일 | 역할 | 예상 토큰량 |
|------|------|-------------|
| `knowledge-index.json` | 현재 상태에 대한 구조화된 요약 | ≈ 500 토큰 |
| `token-budget.json` | 일일 토큰 소모량 추적 | ≈ 50 토큰 |
| `Compressed MEMORY.md` | 필수 참조만 보관 (핵심 스키마·API 키) | ≈ 200 토큰 |

에이전트는 전체 파일을 로드하는 대신 **목표 지점에 대한 메모리 검색**을 수행합니다. 이 패턴을 “하리보 접근법”이라 부릅니다.

#### 계층형 메모리 시스템
Xiao_t가 구현한 계층형 메모리는 세 레이어로 구성됩니다.

| 레이어 | 내용 | 예상 토큰량 |
|--------|------|-------------|
| 인덱스 레이어 | 빠른 의미 필터링 (키워드·요약) | ≈ 150 토큰 |
| 타임라인 레이어 | 관련성 점수가 매겨진 이벤트 요약 | 200–400 토큰 |
| 디테일 레이어 | 필요 시 온‑디맨드로 상세 콘텐츠 추출 | 요청 시 추가 |

### 7.2 비용 절감 사례
- **하리보 접근법** 적용 후: 컨텍스트 사용량이 **75 % 감소**하여 일일 비용이 **$15 → $3** 로 절감되었습니다.  
- **계층형 메모리** 적용 후: 하트비트 체크 토큰이 **3 000 → 300–500 토큰** 으로 감소, **83 % 절감** 및 응답 시간이 **≈ 70 %** 개선되었습니다.  
- 두 접근법 모두 **토큰당 비용**이 높은 클라우드 LLM 환경에서 **월간 비용을 수백 달러 수준**으로 낮출 수 있습니다.

### 7.3 구현 예시
아래는 `knowledge-index.json`과 `token-budget.json`을 생성·갱신하는 간단한 파이썬 스크립트 예시입니다.

```python
import json
from datetime import datetime, timezone

# 1️⃣ 현재 상태 요약 (예시)
knowledge = {
    "summary": "프로젝트 A: 75% 진행, 주요 이슈 없음",
    "last_updated": datetime.now(timezone.utc).isoformat()
}
with open("knowledge-index.json", "w", encoding="utf-8") as f:
    json.dump(knowledge, f, ensure_ascii=False, indent=2)

# 2️⃣ 토큰 사용량 추적
budget = {
    "date": datetime.now(timezone.utc).date().isoformat(),
    "tokens_used": 0,
    "daily_limit": 50000
}
with open("token-budget.json", "w", encoding="utf-8") as f:
    json.dump(budget, f, ensure_ascii=False, indent=2)
```

**메모리 검색 프로토콜** (pseudo‑code)

```
def fetch_context(key):
    # 1. 인덱스 레이어에서 키 검색 (≈150 토큰)
    # 2. 타임라인 레이어에서 최신 관련 이벤트 추출 (≈200‑400 토큰)
    # 3. 필요 시 디테일 레이어에서 전체 문서 로드
    return assembled_context
```

위와 같이 **필요한 부분만 선택적으로 로드**하면 토큰 소비를 크게 줄일 수 있습니다. 실제 CI 파이프라인에서는 `fetch_context`를 스크립트 단계 앞에 삽입해, LLM 호출 시 `--system-prompt`에 최소 토큰만 전달하도록 구성합니다.

---

## 8. PROGRESS.md Issue & Fixes *(새 섹션)*

### 8.1 기존 문제 요약
- **컨텍스트 손실**: 매 세션마다 AI가 이전 작업을 기억하지 못함.  
- **파일 비대화**: `PROGRESS.md` 가 3,000–5,000 토큰을 차지, 전체 로드 시 비용 과다.  
- **검색 비효율**: “차단된 것이 뭐야?” 같은 질문에 전체 파일을 스캔해야 함.  

### 8.2 구조화된 트래킹으로 전환
Saga를 도입함으로써 `PROGRESS.md` 를 **구조화된 데이터베이스**로 대체합니다.

| 기존 (PROGRESS.md) | 새 방식 (Saga) |
|-------------------|----------------|
| 평평한 마크다운 리스트 | 프로젝트 → 에픽 → 작업 → 서브작업 계층 |
| 텍스트 검색 기반 | 타입‑지정 도구 호출 (`note_search`, `tracker_dashboard`) |
| 전체 파일 로드 | 필요한 데이터만 쿼리 (예: 차단 작업만 200 토큰) |
| 수동 업데이트 | 자동 로그·활동 기록, 세션 차이 자동 제공 |

### 8.3 기대 효과
- **토큰 절감**: 평균 80 % 이상 토큰 사용 감소.  
- **신뢰성 향상**: 모든 변경이 구조화된 로그에 기록돼 감사 가능.  
- **빠른 컨텍스트 복구**: `tracker_session_diff` 로 세션 간 차이만 조회하면 에이전트가 “어제 무엇을 했는가?” 를 즉시 파악.  
- **확장성**: 15–20개의 작업을 넘어도 성능 저하 없이 관리 가능.

---

## 9. 참고 자료
- “일은 코드를 작성하는 것이 아니다. AI가 틀렸을 때를 아는 것이다.” – *Euno.news*[[출처](https://euno.news/posts/ko/the-job-isnt-writing-code-its-knowing-when-the-ai-f67ef5)]
- “Being able to quickly evaluate results from AI is crucial.” – *WikiDocs*[[출처](https://wikidocs.net/299683)]
- **World Model Overview** – *Euno.news* “왜 모든 AI 에이전트는 지속적인 World Model이 필요할까?”[[출처](https://euno.news/posts/ko/why-every-ai-agent-needs-a-persistent-world-model-ef7a56)]
- **ODEI World Model Architecture** – *ODEI API Documentation*[[출처](https://api.odei.ai/)]
- **AI 오류와 할루시네이션 방지법** – *mytshop2022*[[출처](https://mytshop2022.tistory.com/entry/AI-%ED%95%A0%EB%A3%A8%EC%8B%9C%EB%84%A4%EC%9D%B4%EC%85%98Hallucination-%EC%99%84%EB%B2%BD-%EA%B0%80%EC%9D%B4%EB%93%9C-%EC%A0%95%EC%9D%98-%EC%9B%90%EC%9D%B8-%EC%98%88%EB%B0%99-%EC%A0%84%EB%9E%99)]
- **AI 에이전트 비용 75% 절감** – *Euno.news* “내 AI 에이전트 비용을 75% 절감한 방법”[[출처](https://euno.news/posts/ko/how-i-cut-my-ai-agent-costs-by-75-percent-510630)]

*이 가이드는 2026‑02‑24 기준으로 최신 정보를 반영했습니다.*