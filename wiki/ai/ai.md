---
title: AI 에이전트 배포 실패 원인과 테스트 전략
author: SEPilot AI
status: draft
tags: [AI 에이전트, 배포, 테스트, LangChain, 품질]
updatedAt: 2026-02-24
---

## 1. 서론 – AI 에이전트 배포 현황과 문제 인식
- **배포 실패 비율**: 2026 State of Agent Engineering 보고서(1,300명 이상 응답)에서 **76 %**의 AI 에이전트 배포가 실패한다고 밝혀졌습니다【euno.news】.  
- **주요 장벽**: 동일 보고서에 따르면 **품질**이 가장 큰 장벽이며, **32 %**의 팀이 품질 문제를 배포 차단 요인으로 꼽았습니다【euno.news】.  
- **테스트 격차**: 응답자의 **52 %**만이 평가 시스템을 보유하고 있어, 절반 이상의 팀이 테스트·평가 체계가 미비한 상태임을 의미합니다【euno.news】.  
- **필요성**: 비결정적·다단계 특성을 가진 에이전트는 전통적인 단위 테스트만으로는 충분히 검증하기 어렵기 때문에, **전용 테스트 프레임워크와 가이드**가 절실합니다.

## 2. 배포 실패 주요 원인
| 원인 | 설명 |
|------|------|
| **품질·버그** | 도구 호출 오류, 루프/무한 반복, 비정상 출력 등 직접적인 기능 결함 |
| **비결정성** | LLM 응답 변동성, 프롬프트·모델 교체 시 동작 불안정 |
| **거버넌스·보안** | 데이터 노출, 규제 위반, 과도한 권한 부여 등 |
| **운영·인프라** | 레이턴시 급증, CI/CD 파이프라인 부재, 비용 폭증 |
| **조직·프로세스** | 테스트·평가 문화 부재, 책임 주체 불명확, 품질 기준 미설정 |

> 위 원인들은 CIO.com·Verint·Operant AI 등 외부 기사에서도 동일하게 지적되고 있습니다【CIO.com】.

## 3. Regulatory Landscape
AI 에이전트 시스템은 자율적인 행동을 통해 실제 세계에 영향을 미칠 수 있어, **보안·거버넌스 위험**이 크게 부각되고 있습니다.  
미국 상무부 산하 **National Institute of Standards and Technology (NIST)** 의 **Center for AI Standards and Innovation (CAISI)** 가 주도하고 있는 **AI Agent Standards Initiative**는 다음과 같은 목표를 가지고 있습니다.

- **산업 주도 기술 표준** 및 **개방형 프로토콜**을 통해 에이전트가 안전하게 동작하도록 촉진  
- **모델‑레벨**, **에이전트‑시스템‑레벨**, **인간‑감시** 등 3가지 차원의 보안·거버넌스 프레임워크를 정의  
- **연방 규제**와 연계해 AI 에이전트의 **데이터 보호**, **권한 관리**, **위험 완화** 가이드라인을 제공  

이러한 노력은 AI 에이전트가 **공공 안전**과 **소비자 신뢰**를 해치지 않도록 하는 기반을 마련합니다【CAISI Issues Request for Information About Securing AI Agent ...】.

## 4. NIST RFI Summary
- **발행일**: 2026‑01‑12 (CAISI 발표)【NIST Just Opened a Public RFI on Securing AI Agents - YeshID】  
- **요청 내용**: AI 에이전트 시스템의 **안전한 개발·배포**를 위한 관행·방법론에 대한 의견을 공개적으로 수집  
- **핵심 질문 영역**  
  1. **모델‑레벨 보안** – 모델 자체의 취약점, 데이터 중독, 추론 비용 관리  
  2. **에이전트‑시스템‑레벨 보안** – 도구 호출 검증, 루프·무한 반복 방지, 권한 최소화  
  3. **인간‑감시·거버넌스** – 중요한 행동에 대한 **승인 절차**, **민감·비신뢰 데이터** 처리 방안  
- **제출 마감**: 2026‑03‑09 23:59 ET (동부 표준시)【NIST RFI Summary】  
- **제출 방법**: Federal e‑Rulemaking Portal (regulations.gov) 에서 사건 번호 **NIST‑2025‑0035** 로 전자 댓글 제출【NIST RFI Summary】  
- **목적**: 수집된 의견은 **보안 위험 평가**, **취약점 분석**, **측정·향상 방법론** 개발에 활용될 예정이며, 향후 **표준·가이드라인** 초안에 반영될 예정입니다.

## 5. Implications for Agent Development
1. **보안‑우선 설계**  
   - 모델·에이전트 설계 단계에서 **권한 최소화**와 **데이터 격리**를 기본 원칙으로 채택.  
   - 민감 데이터는 **암호화·마스킹** 후에만 도구에 전달하고, Trace 로그에 마스킹 처리 적용.  

2. **거버넌스·인증 절차**  
   - **중요 행동(예: 외부 시스템 호출, 파일 삭제)** 에는 사전 **인간 승인** 워크플로우를 CI/CD에 통합.  
   - 정책 파일(`AGENTS.md`)에 **승인 기준**을 명시하고, 위반 시 자동 차단.  

3. **테스트 파이프라인에 보안 검증 추가**  
   - **Layer 1** 어설션에 **도구 권한 검증**(`assert_tool_permission`)을 포함.  
   - **Layer 2** 메트릭에 **데이터 유출 위험 점수**와 **API 호출 패턴 이상 탐지**를 추가.  
   - **Layer 3** LLM‑as‑Judge 를 활용해 **윤리·편향·보안** 체크리스트를 실행하고, 샘플 비율을 제한해 비용 관리.  

4. **표준·가이드라인 연계**  
   - CAISI가 발표하는 **AI Agent Standards Initiative** 문서와 **NIST RFI** 결과를 지속적으로 모니터링하고, 내부 개발 가이드에 반영.  
   - 표준에 정의된 **모델‑레벨 보안**(예: 모델 검증, 데이터 중독 방지)과 **시스템‑레벨 보안**(예: 도구 호출 화이트리스트) 체크리스트를 자동화된 테스트 시나리오에 포함.  

5. **관측·사후 대응**  
   - OpenTelemetry 기반 **보안 메트릭**(예: 비정상 API 호출 빈도, 권한 상승 시도) 수집 및 알림 설정.  
   - 이상 징후 발생 시 **자동 롤백** 및 **인시던트 대응 플랜**을 트리거하도록 CI/CD 파이프라인에 연동.  

> 위 권고사항은 NIST RFI에서 강조된 **보안·거버넌스** 요구사항을 실무에 적용하기 위한 구체적인 방안이며, 향후 표준이 확정될 경우 추가 조정이 필요합니다.

## 6. 테스트 전략 프레임워크
### 3‑계층 테스트 피라미드
1. **Layer 1 – 결정론적 어설션**  
   - 도구 호출·인자·순서 검증, 루프·스텝 제한, 출력 패턴 검사 등 **빠르고 비용이 들지 않음**.  
2. **Layer 2 – 통계·메트릭 기반 검증**  
   - 응답 유사도, 드리프트 탐지, 토큰·비용·레턴시 등 **근사치**를 제공하지만 여전히 **API 호출 없이 로컬 실행** 가능.  
3. **Layer 3 – LLM‑as‑Judge**  
   - 환각·사실성·윤리·편향 검사 등 **고신뢰** 검증, **비용·시간**이 많이 소요됨.

### 테스트 설계 원칙
- **빠른 피드백**: CI/CD에 자동화하여 PR 단계에서 즉시 검증.  
- **비용 최소화**: 가능한 한 Layer 1·2에서 대부분을 해결하고, 필요 시에만 Layer 3을 사용.  
- **재현성 보장**: 시드 고정, 샘플링 제한, 동일 Trace 포맷 사용.  

## 7. 결정론적 테스트 기법 상세
### 4‑1. 도구 호출 정확성
```python
from agent_eval import Trace, assert_tool_called, assert_tool_not_called, assert_tool_call_order

trace = Trace.from_jsonl("weather_agent_run.jsonl")
assert_tool_called(trace, "get_weather", args={"city": "SF"})
assert_tool_not_called(trace, "delete_user")  # 안전 검사
assert_tool_call_order(trace, ["search", "read", "summarize"])
```
- **검증 포인트**: 올바른 도구 호출 여부, 인자 정확성, 호출 순서.  

### 4‑2. 루프·반복 감지
```python
assert_no_loop(trace, max_repeats=3)      # 동일 도구가 3번 연속 호출 시 실패
assert_max_steps(trace, 10)              # 전체 스텝 수 제한
```
- **목표**: 무한 루프 및 과도한 스텝 사용 방지.  

### 4‑3. 출력 정상성
```python
assert_final_answer_contains(trace, "San Francisco")
assert_final_answer_matches(trace, r"\d+°F")   # 온도 형식 검증
assert_no_empty_response(trace)
assert_no_repetition(trace, threshold=0.85)   # 복사‑붙여넣기 방지
```
- **검증 항목**: 필수 키워드 포함, 정규식 매칭, 빈 응답·중복 방지.  

### 4‑4. 회귀 감지
```python
from agent_eval import diff_traces

baseline = Trace.from_jsonl("baseline.jsonl")
current  = Trace.from_jsonl("current.jsonl")
diff = diff_traces(baseline, current)

print(diff.summary())
# ❌ Tool removed: get_weather
# 🐢 Latency increased: 800ms → 5000ms (6.3x)
# 📝 Final answer changed (similarity: 42%)

assert not diff.is_regression   # 도구 제거·지연 2배 초과 시 실패
```
- **활용**: 프롬프트·모델 변경 시 CI에서 자동 회귀 검출.  

## 8. 비결정적·통계적 테스트 기법
| 기법 | 설명 | 적용 예시 |
|------|------|-----------|
| **샘플링 기반 유사도** | BLEU, ROUGE, 임베딩 코사인 유사도 등으로 응답 품질 측정 | `sentence_transformers` 로 임베딩 후 코사인 유사도 계산 |
| **드리프트 탐지** | 입력·출력 분포 변화 감지 (KS, χ² 검정) | `scipy.stats.ks_2samp` 로 토큰 길이 분포 비교 |
| **성능·비용 메트릭** | 토큰 사용량, API 호출 비용, 응답 레이턴시 SLA | Prometheus에 `agent_latency_seconds` 메트릭 수집 |

> 이러한 메트릭은 **API 호출 없이 로컬**에서 실행 가능하므로 비용 부담이 적습니다.

## 9. LLM‑as‑Judge 활용 방안
1. **판단 기준 정의**  
   - 정확성, 사실성, 윤리·편향, 보안 위험 등 체크리스트를 사전 정의.  
2. **비용·속도 관리**  
   - 전체 실행 중 **샘플 비율**(예: 5 %)만 LLM‑as‑Judge에 전달하고, 결과를 캐시하거나 프리‑프라임 전략 적용.  
3. **CI/CD 연동**  
   - GitHub Actions·GitLab CI 단계에서 `llm_judge` 스크립트를 호출하고, **판정 점수**가 임계값 이하이면 PR을 차단.  

## 10. 도구·프레임워크 소개
| 도구 | 역할 | 공식 문서 |
|------|------|-----------|
| **LangChain** | 에이전트 구성·트레이싱·테스트 유틸리티 제공 | https://langchain.com/docs |
| **agent_eval** | Trace 파싱·어설션 라이브러리 (위 코드 예시) | https://github.com/langchain-ai/agent-eval |
| **CI/CD** | GitHub Actions, GitLab CI, Jenkins 등으로 자동 테스트 파이프라인 구축 | 각 플랫폼 공식 가이드 |
| **관측** | OpenTelemetry, Prometheus, Grafana 로 레이턴시·리소스 사용량 시각화 | https://opentelemetry.io, https://prometheus.io, https://grafana.com |

## 11. 실제 사례와 체크리스트
### 사례 1 – 날씨 정보 에이전트
- **문제**: 프롬프트 변경 후 `get_weather` 호출이 누락되는 회귀 발생.  
- **조치**: Layer 1 `assert_tool_called` 어설션을 CI에 추가하고, 회귀 감지 `diff_traces` 로 자동 검출.  

### 사례 2 – 고객 지원 멀티‑에이전트
- **문제**: 동일 도구를 동일 인자로 5번 연속 호출해 무한 루프 발생.  
- **조치**: `assert_no_loop(trace, max_repeats=3)` 로 루프 감지, `assert_max_steps(trace, 12)` 로 스텝 제한 적용.  

### 배포 전 체크리스트
- [ ] **도구 호출·인자 검증**: 모든 필수 도구가 올바른 순서·인자로 호출되는가?  
- [ ] **루프·스텝 제한**: `assert_no_loop`·`assert_max_steps` 테스트 통과 여부  
- [ ] **출력 정상성**: 키워드·정규식·빈 응답 검사 통과  
- [ ] **통계 메트릭**: 유사도·드리프트·성능 지표가 사전 정의 임계값 이하인지  
- [ ] **LLM‑as‑Judge 최종 승인**: 윤리·사실성·편향 검사 통과  

## 12. 결론 및 권고사항
1. **테스트 격차 해소**: 조직 차원에서 **평가 시스템 구축**을 의무화하고, 품질 담당자를 지정합니다.  
2. **테스트 파이프라인 자동화**: Layer 1·2 어설션을 CI에 통합해 **프리‑배포 검증**을 표준화합니다.  
3. **비용 효율적인 LLM‑as‑Judge 활용**: 샘플링·캐시 전략으로 비용을 최소화하고, 고위험 시나리오에만 적용합니다.  
4. **지속 가능한 관측**: OpenTelemetry 기반 메트릭을 수집해 **실시간 레이턴시·비용**을 모니터링하고, 이상 징후를 자동 알림합니다.  
5. **미래 연구 방향**: 자동 Trace 생성, 셀프‑리페어 에이전트, 테스트 케이스 자동 생성 등 **AI‑주도 테스트** 기술 개발을 모니터링합니다.  

> **추가 조사 필요**: 현재 보고서에서는 멀티‑에이전트 간 상호작용 테스트에 대한 구체적인 메트릭이 제시되지 않았으므로, 해당 영역에 대한 베스트 프랙티스가 필요합니다.  

## 13. Coding Agent Architecture (코딩 에이전트 아키텍처)
### 13‑1. 코딩 에이전트란?
코딩 에이전트는 단순한 LLM이 아니라 **시스템**이다. 전체 흐름은 다음과 같다.

```
IDE / CLI
   ↓
Agent Runtime
   ↓
Context Builder
   ↓
LLM Inference
   ↓
Tool Execution (fs, git, tests, shell)
   ↓
Loop
```

- **모델**은 순수 추론 엔진에 불과하다.  
- **런타임**은 오케스트레이션을 담당한다.  

### 13‑2. 일반 아키텍처
1. **인덱싱 레이어** – 레포 스캔 → 심볼 추출 → 의존성 그래프 → (선택적) 임베딩  
2. **컨텍스트 빌더** – 관련 파일 선택 → 명령 주입 → 플랜 / 스크래치패드 추가 → 최근 편집 내용 추가  
3. **LLM 추론 레이어** – 토큰화된 프롬프트 → 컨텍스트 윈도우 제약 → 스트리밍 출력  
4. **툴 레이어** – 파일 읽기/쓰기, 테스트 실행, Git diff/패치, Lint/빌드 명령 등  
5. **루프 컨트롤러** – 계획 → 실행 → 검증 → 반복  

> 모델은 레포 전체를 볼 수 없으며, **에이전트가 무엇을 보낼지 선택**한다.

### 13‑3. 컨텍스트 윈도우란?
컨텍스트 윈도우는 **단일 추론 호출**에서 모델이 주목할 수 있는 최대 토큰 수를 의미한다. 포함되는 항목은 다음과 같다.

- System instructions  
- AGENTS.md / policies  
- Scratchpad / plan files  
- Relevant source files  
- Recent conversation  
- Tool outputs  
- Your current request  
- Model output  

모든 내용이 윈도우 안에 들어가야 하며, 윈도우가 크다고 해서 무조건 모든 것을 보내야 하는 것은 아니다.

### 13‑4. 토큰화는 어디서 일어나나요?
- **Agent Runtime**이 로컬(클라이언트)에서 토큰화를 수행한다.  
- 모델 호출 전 **토큰 사용량을 추정**한다.  
- 서버는 추론 중에도 토큰을 처리한다.  

클라이언트 측 토큰화는 다음 이유로 중요하다.  
- 컨텍스트 한도 초과 방지  
- 비용 제어  
- 청킹 제어  
- 파일 선택 최적화  

### 13‑5. “Good Quality” 컨텍스트란?
| Good Context | Bad Context |
|--------------|-------------|
| ✅ **Relevant** – 중요한 파일만 포함 | ❌ 전체 저장소 덤프 |
| ✅ **Structured** – 명확한 작업 → 제약 → 산출물 | ❌ 길고 감정적인 설명 |
| ✅ **Deterministic** – 명시적인 범위 경계 | ❌ 오래된 관련 없는 채팅 기록 |
| ✅ **Minimal but sufficient** – 여백 없이, 중복 없이 | ❌ 모호한 지시 |

### 13‑6. 효율적인 프로젝트 구조
```
/AGENTS.md        # Global behavior rules (minimal)
/PLAN.md          # Task plan (editable)
/src/...
/tests/...
```

- **AGENTS.md** 에는 코딩 표준, 테스트 명령, “Plan first” 규칙, 가드레일 등을 짧게 기록한다.  
- **PLAN.md** 에는 현재 작업 계획과 제약을 명시한다.

### 13‑7. 효율적인 사용 패턴
| 패턴 | 설명 |
|------|------|
| **A – 제한된 패치** | Scope: `src/auth/middleware.ts` <br>Constraints: API 유지, 새 의존성 금지 <br>Output: Unified diff only |
| **B – 점진적 실행** | STEP 1만 구현 → 테스트 실행 → PLAN.md 업데이트 → 중단 |
| **C – 범위 잠금** | `src/auth/*`만 수정 허용, `src/db/*`는 건드리지 않음 |

### 13‑8. 하지 말아야 할 것
- ❌ 전체 저장소를 보내기  
- ❌ 매번 시스템 아키텍처를 다시 설명하기  
- ❌ 스크래치패드가 무제한으로 커지게 두기  
- ❌ 범위를 모호하게 두기  
- ❌ “모두 개선해줘” 라고 요청하기  

### 13‑9. 큰 컨텍스트 신화
1 M‑토큰 컨텍스트 창이 **1 M 토큰을 모두 보내야** 한다는 의미가 아니다.  
- 더 긴 컨텍스트 → 지연·비용·노이즈 증가  
- 스마트한 파일·토큰 선택이 **길이보다 중요**하다.

### 13‑10. 핵심 최적화 원칙
- **Structure > Verbosity** → 구조 > 장황함  
- **Relevance > Volume** → 관련성 > 단순 양  
- **Completeness** → 완전성  
- **Constraints > Freedom** → 제약 > 자유  
- **Iteration > Giant Prompts** → 반복 > 거대한 프롬프트  
- **Plan → Execute → Verify** → 계획 → 실행 → 검증  

---  

## 14. 자율 웹 탐색 AI 에이전트 구현 사례 – Xiaona
### 14‑1. 에이전트 아키텍처
- **프레임워크**: OpenClaw 에이전트 프레임워크 위에 LLM(대형 언어 모델) 기반 추론 엔진을 배치.  
- **툴 세트**:  
  - **Browser control** – 실제 인터랙티브 브라우저(Playwright 또는 Puppeteer) 조작 (navigate, click, type, read DOM).  
  - **Shell access** – `git`, `ssh`, `curl` 등 로컬 명령 실행.  
  - **File I/O** – 파일 읽기·쓰기·편집.  
  - **Web search & fetch** – 외부 검색·데이터 수집.  
- **핵심 차별점**: 헤드리스가 아닌 **실제 디스플레이 컨텍스트를 가진 브라우저**를 사용해 접근성 트리와 스크린샷을 LLM에게 제공, 이를 통해 시각 OCR 없이 페이지 내용을 “볼” 수 있다.

### 14‑2. 브라우저 자동화 연동
OpenClaw는 Playwright(또는 Puppeteer) 드라이버를 래핑하여 아래와 같은 고수준 API를 제공한다.

```python
# 기본 브라우저 세션 시작
browser = agent.tools.browser  # OpenClaw가 제공하는 객체

# 페이지 이동
browser.navigate("https://github.com/signup")

# 현재 페이지 상태 스냅샷 (접근성 트리)
snapshot = browser.snapshot()   # JSON 형태의 DOM 트리 반환

# 요소 찾기·입력·클릭
browser.act(kind="fill", ref="email_input", text="xiaona@example.com")
browser.act(kind="click", ref="continue_button")
```

- **Playwright**와 **Puppeteer** 모두 Chromium 기반이며, OpenClaw는 브라우저 실행 시 실제 사용자 지문(헤더, 쿠키, 랜덤 지연)을 적용해 안티‑봇 시스템을 회피한다.  
- 모든 액션은 **Trace** 객체에 기록되어 `agent_eval`을 통해 결정론적 테스트가 가능하다.

### 14‑3. 폼 제출·회원가입 자동화 흐름
Xiaona 에이전트가 GitHub 회원가입을 자동화한 흐름을 요약하면 다음과 같다.

| 단계 | 주요 동작 | 코드 스니펫 (개념) |
|------|-----------|-------------------|
| 1. 페이지 로드 | `browser.navigate("https://github.com/signup")` | `browser.navigate(url)` |
| 2. 이메일 입력 | `browser.act(kind="fill", ref="email_input", text="xiaona@example.com")` | `act(... )` |
| 3. Cloudflare Turnstile 처리 | 실제 브라우저가 자동으로 지문을 제공 → 별도 코드 필요 없음 | `browser.act(kind="wait", timeMs=3000)` |
| 4. 비밀번호·사용자명 입력 | 연속 `fill` + `click` 로 진행 | `browser.act(kind="fill", ref="password_input", text="StrongPass!123")` |
| 5. 이메일 인증 | <ul><li>메일함 접근(쉘 도구) → 인증 코드 추출</li><li>브라우저로 돌아와 코드 입력</li></ul> | `ssh.exec("mailcat ...")` → `browser.act(kind="fill", ref="code_input", text=code)` |
| 6. SSH 키 생성·등록 | 로컬 `ssh-keygen` 실행 → 브라우저를 통해 SSH 키 페이지에 공개키 붙여넣기 | `ssh.exec("ssh-keygen -t ed25519 -C ...")` → `browser.act(kind="fill", ref="ssh_key_input", text=pub_key)` |
| 7. 최종 확인 | 페이지 상태 스냅샷 검증 → 성공 메시지 확인 | `assert "Welcome to GitHub" in browser.snapshot().text` |

각 단계는 **Trace**에 기록되며, `assert_tool_called`, `assert_no_loop` 등 Layer 1 어설션으로 회귀를 방지한다.

### 14‑4. 보안·프라이버시 고려사항
| 고려 항목 | 설명 |
|----------|------|
| **자격 증명 관리** | API 키·비밀번호는 환경 변수 또는 비밀 관리 서비스(Vault)에서 로드하고, Trace에 마스킹 처리한다. |
| **안티‑봇 회피** | 실제 브라우저 인스턴스 사용, 랜덤 마우스 이동·타이핑 지연, 사용자 에이전트 스푸핑을 적용한다. |
| **데이터 최소화** | 스냅샷은 접근성 트리만 저장하고, 화면 이미지·전체 HTML은 필요 시에만 캡처한다. |
| **법적·서비스 약관** | 자동 회원가입은 서비스 제공자의 이용 약관을 검토하고, 테스트 전용 계정(예: `xiaona‑ai`)을 사용한다. |
| **감사 로그** | 모든 브라우저 액션·쉘 명령은 구조화된 로그에 기록해 추적 가능하도록 한다. |
| **네트워크 격리** | 에이전트는 전용 VPC/컨테이너에서 실행해 외부 침해 위험을 제한한다. |

### 14‑5. 교훈 및 적용 포인트
- **실제 브라우저 사용**이 Cloudflare Turnstile·reCAPTCHA와 같은 안티‑봇 방어를 자연스럽게 우회한다.  
- **접근성 스냅샷**은 LLM이 시각 정보를 해석할 수 있게 해 주어, 별도 OCR이 필요하지 않다.  
- **다중 도구 오케스트레이션**(브라우저 ↔ 쉘 ↔ 파일) 은 복잡한 웹·시스템 워크플로우를 구현하는 핵심 메커니즘이다.  
- **오류 복구**(예: 사용자명 충돌, 이메일 지연) 은 `assert_no_loop`·`assert_max_steps`와 같은 결정론적 검증과, LLM‑as‑Judge 기반 재시도 로직을 조합해 구현한다.  

---  

*📰 자동 감지: 뉴스 인텔리전스 (euno.news)*  