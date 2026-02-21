---
title: "멀티 에이전트 시스템 – Self‑Healing AI Agents"
description: "대규모 자율 에이전트의 자체 복구 아키텍처와 8 GB VRAM 환경에서의 효율적 배포 방법"
category: "Guide"
tags: ["멀티 에이전트", "Self‑Healing", "AI", "아키텍처"]
status: "draft"
issueNumber: 0
createdAt: "2026-02-21T10:00:00Z"
updatedAt: "2026-02-21T10:00:00Z"
---

# 멀티 에이전트 시스템 – Self‑Healing AI Agents

> 이 문서는 **Self‑Healing AI Agents**(자체 복구 AI 에이전트) 구현 사례를 기반으로, 대규모 자율 에이전트 아키텍처와 8 GB VRAM 환경에서의 효율적인 배포 방법을 소개합니다. 원본 내용은 [euno.news](https://euno.news/posts/ko/i-built-4882-self-healing-ai-agents-on-8-gb-vram-h-f27aa8)에서 발췌했습니다.

---

## 1. Self‑Healing Architecture Overview

대부분의 LLM‑기반 에이전트는 단순한 흐름을 따릅니다.

```
receive task → call model → return result
```

오류(환각, 타임아웃, OOM 등)가 발생하면 에이전트가 충돌하거나 쓰레기를 출력합니다. 기존의 `try‑catch` 방식은 임시 방편에 불과합니다. 여기서는 **자체 복구 루프**를 도입해 에이전트가 스스로 상태를 모니터링하고, 필요 시 복구 전략을 실행하도록 설계했습니다.

```
┌─────────────┐
│   EXECUTE   │ ← 에이전트가 작업 수행
└──────┬──────┘
       │
┌──────▼──────┐
│   MONITOR   │ ← 실시간 건강 점수 측정
└──────┬──────┘
       │
┌──────▼──────┐
│   RECOVER   │ ← 계층적 복구 전략
└──────┬──────┘
       │
       └──────→ EXECUTE 로 돌아감
```

### 1.1 에이전트 상태 머신
```python
from enum import Enum
class AgentState(Enum):
    IDLE = "idle"
    RUNNING = "running"
    DEGRADED = "degraded"      # 기능은 있지만 성능 저하
    RECOVERING = "recovering"  # 자체 복구 중
    FAILED = "failed"          # 외부 개입 필요
```
*핵심 인사이트*: `DEGRADED`는 `FAILED`와 다르며, 대부분의 오류는 여기서 조기에 감지·복구됩니다.

### 1.2 건강 점수
```python
def compute_health(agent_output, context):
    scores = {
        "coherence":   check_coherence(agent_output),
        "completeness": check_completeness(agent_output, context),
        "latency":     check_latency(context.elapsed_time),
        "memory":      check_memory_usage(),
        "consistency": check_cross_agent_consistency(agent_output)
    }
    weights = [0.25, 0.20, 0.15, 0.25, 0.15]
    return sum(s * w for s, w in zip(scores.values(), weights))
```
건강 점수가 임계값 이하이면 복구 전략을 선택하고 실행합니다. 대부분의 복구는 첫 두 단계에서 해결되며, **2.3 %**만이 `FAILED` 상태에 도달합니다.

---

## 2. Resource‑Efficient Deployment (8 GB VRAM)

8 GB VRAM을 가진 단일 머신에서 4,882개의 에이전트를 실행하기 위해 **동적 에이전트 풀링**을 사용합니다. 한 번에 GPU에 상주하는 에이전트 수는 약 12개이며, 나머지는 CPU/디스크에 직렬화됩니다.

```python
from queue import PriorityQueue
class AgentPool:
    def __init__(self, max_concurrent=12, vram_budget_mb=7168):
        self.active   = PriorityQueue()   # priority = urgency
        self.dormant  = {}                # serialized agents
        self.vram_budget = vram_budget_mb
    def activate(self, agent_id, priority):
        while self.current_vram() > self.vram_budget * 0.85:
            _, evicted = self.active.get()
            self.dormant[evicted.id] = evicted.serialize()
            evicted.release_gpu()
        agent = self.dormant.pop(agent_id).deserialize()
        self.active.put((priority, agent))
        return agent
```
4‑bit 양자화와 KV‑캐시 공유를 결합하면 평균 활성화 지연 시간은 **≈ 850 ms** 수준입니다.

---

## 3. Failure Detection & Automatic Recovery

### 3.1 실시간 모니터링
에이전트는 매 실행 사이클 후 **복합 건강 점수**를 계산하고, 점수가 임계값 이하이면 `RECOVER` 단계로 전이합니다.

### 3.2 계층적 복구 전략
1. **경미한 오류** – 재시도, 파라미터 재조정
2. **자원 부족** – 다른 GPU 슬롯으로 이동, 메모리 압축
3. **심각한 오류** – `FAILED` 상태로 전이 후 외부 개입 요청

이러한 접근 방식은 단순 재시도 루프보다 **오탐지 실패를 73 %** 감소시켰습니다.

---

## 4. 실험 결과 (예시)
- **승률**: 96.5 % (201/208)
- **평균 심판 점수**: 4.68/5.0
- **전체 품질**: 93.6 %
- **접근성**: 5.0/5.0
- **안전 점수**: 4.6/5.0

> 위 지표는 독립 LLM 심판이 구조화된 루브릭을 사용해 블라인드 평가한 결과이며, 자체 보고가 아닙니다.

---

## 5. 참고 자료
- 원본 기사: [euno.news – 8 GB VRAM으로 4,882개의 Self‑Healing AI Agents 구축](https://euno.news/posts/ko/i-built-4882-self-healing-ai-agents-on-8-gb-vram-h-f27aa8) (출처)

---

*이 문서는 초안(draft) 상태이며, 검토 후 `published` 로 전환될 예정입니다.*