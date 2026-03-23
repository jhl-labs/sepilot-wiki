---
title: 첫 AI 에이전트 만들기 – 단계별 튜토리얼
author: SEPilot AI
status: published
tags: [AI, Agent, Tutorial, DevOps, CI/CD]
---

## 소개
- **AI 에이전트 vs. 챗봇**  
  - 챗봇은 입력을 받아 바로 응답을 반환하고, 상태를 거의 유지하지 않으며 실제 세계에 행동을 취하지 않는다.  
  - AI 에이전트는 **Perceive → Reason → Act → Remember** 라는 루프를 통해 환경을 인식하고, 계획을 세우며, 외부 도구를 실행하고, 결과를 저장한다. 이는 euno.news 기사에서 제시된 핵심 차이점이다[[euno.news](https://euno.news/posts/ko/how-to-build-your-first-ai-agent-a-step-by-step-tu-d97ba7)].
- **튜토리얼 목표**  
  - 파이썬 기반 에이전트를 설계·구현하고, 로컬에서 디버깅한 뒤 CI/CD 파이프라인(GitHub Actions)으로 자동 배포한다.  
  - 배포 후 모니터링·관찰성을 확보해 운영 단계에서 비용·성능을 관리한다.
- **전체 흐름 개요**  
  1. 사전 준비 → 2. 프로젝트 구조 설계 → 3. 로컬 개발·디버깅 → 4. 인지·추론·행동·기억 루프 구현 → 5. 테스트 전략 → 6. CI/CD 설정 → 7. 컨테이너 배포 → 8. 운영·모니터링 → 9. 다중 에이전트 확장

## 사전 준비
| 항목 | 권장 버전/도구 | 비고 |
|------|----------------|------|
| Python | 3.10 이상 | 가상환경 사용 권장 |
| 가상환경 | `venv`, `conda`, `uv` 등 | 프로젝트 격리를 위해 필수 |
| Git | 최신 | 코드 버전 관리 |
| LLM 옵션 | Claude, GPT‑4, Llama 3 등 | 선택에 따라 SDK 설치 필요[[euno.news](https://euno.news/posts/ko/how-to-build-your-first-ai-agent-a-step-by-step-tu-d97ba7)] |
| 주요 라이브러리 | LangChain, OpenAI SDK, FastAPI | 공식 문서: [LangChain Docs](https://python.langchain.com/docs), [OpenAI API](https://platform.openai.com/docs/api-reference), [FastAPI](https://fastapi.tiangolo.com/) |
| API 키 | OpenAI, Anthropic 등 | `.env` 파일에 `OPENAI_API_KEY=...` 형태로 저장 |

## 프로젝트 구조와 핵심 에이전트 설계
```
my-agent/
├─ src/
│   ├─ __init__.py
│   ├─ agent.py          # Orchestrator & main loop
│   ├─ llm.py            # LLM 래퍼 (LangChain 혹은 직접 SDK)
│   ├─ tools/
│   │   ├─ __init__.py
│   │   ├─ file_reader.py
│   │   ├─ api_caller.py
│   ├─ memory/
│   │   ├─ __init__.py
│   │   ├─ short_term.py
│   │   ├─ long_term.py
│   └─ config.yaml
├─ tests/
│   ├─ test_llm.py
│   ├─ test_tools.py
│   └─ test_agent_loop.py
├─ infra/
│   ├─ Dockerfile
│   └─ docker-compose.yml
├─ .github/
│   └─ workflows/
│       └─ ci.yml
├─ .env.example
└─ pyproject.toml   # poetry 혹은 uv 설정
```

- **LLM 래퍼** (`llm.py`) : LangChain `ChatModel` 혹은 OpenAI `ChatCompletion`을 감싸서 `generate(prompt)` 메서드 제공.  
- **Tool 인터페이스** (`tools/`) : 각 도구는 `def run(**kwargs) -> Any` 시그니처를 갖고, 모델이 함수 호출 형태로 요청할 수 있도록 설계한다.  
- **Memory 모듈** (`memory/`) :  
  - *단기* – 파이썬 딕셔너리 기반 스크래치패드, 루프 내에서 빠르게 읽고 쓰기.  
  - *장기* – 파일 혹은 벡터 DB(Redis, Chroma)와 연동해 세션 간 지속성을 제공.  
- **Planner / Orchestrator** (`agent.py`) : while‑loop 구현, 목표 달성 여부를 `self.goal_achieved()` 로 판단한다.  
- **설정 파일** (`config.yaml`) : 목표, 모델 파라미터, 도구 매핑 등을 선언형으로 관리한다.  

## 로컬 개발·디버깅
1. **가상환경 생성 및 의존성 설치**  
   ```bash
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt   # 혹은 poetry install
   ```
2. **자동 재로드** – `uvicorn`(FastAPI) 혹은 `watchgod`를 이용해 파일 변경 시 자동 재시작.  
3. **인터랙티브 REPL** – `ipython` 혹은 `python -i src/agent.py` 로 에이전트 객체를 직접 호출해 단계별 동작을 확인한다.  
4. **구조화된 로깅** – `logging` 모듈을 JSON 포맷으로 설정하고, `DEBUG` 레벨에서 각 단계(`perceive`, `reason`, `act`, `remember`)의 입력·출력을 기록한다.  
5. **샘플 워크플로 테스트**  
   - 파일 읽기 → API 호출 → 결과 파일 저장 순서대로 `tools/file_reader.py`, `tools/api_caller.py` 를 호출해 정상 동작을 검증한다.  

## 인지·추론·행동·기억 루프 구현
### 기본 while‑loop 구조
```python
while not agent.goal_achieved():
    observation = agent.perceive()
    plan = agent.reason(observation)
    result = agent.act(plan)
    agent.remember(observation, plan, result)
```
- **Perceive** 예시 (파일, API, 로그)  
  ```python
  def perceive(self):
      data = self.tools['file_reader'].run(path='input.txt')
      api_resp = self.tools['api_caller'].run(url='https://api.example.com')
      return {'file': data, 'api': api_resp}
  ```
- **Reason** : 프롬프트 템플릿에 현재 관찰값을 삽입해 LLM에게 “다음에 해야 할 작업”을 계획하도록 요청한다.  
- **Act** : LLM이 반환한 함수 호출 스키마에 따라 해당 Tool을 실행한다. OpenAI 함수 호출 혹은 Model Context Protocol(MCP) 사용을 권장한다[[euno.news](https://euno.news/posts/ko/how-to-build-your-first-ai-agent-a-step-by-step-tu-d97ba7)].
- **Remember** : 단기 메모리(`self.short_term`)에 최신 상태를 저장하고, 필요 시 장기 메모리(`self.long_term`)에 영속화한다.

## 도구 통합 및 확장
- **OpenAI 함수 호출**: `openai.ChatCompletion.create(..., functions=[...])` 형태로 도구 스키마를 전달하면 모델이 자동으로 함수 호출 JSON을 반환한다.  
- **Model Context Protocol (MCP)**: 모델이 외부 도구와 상호작용할 표준 프로토콜이며, LangChain에서도 `tool` 객체를 MCP와 매핑하는 헬퍼가 제공된다[[LangChain Docs](https://python.langchain.com/docs/integrations/tools)].
- **커스텀 툴 플러그인**: `tools/base_tool.py`에 추상 클래스 `BaseTool`을 정의하고, 새로운 도구는 이를 상속해 `run` 메서드만 구현하면 된다.
- **다중 에이전트 협업**: 간단한 Pub/Sub 패턴(예: Redis Streams) 혹은 HTTP 기반 메시지 버스(FastAPI + WebSocket)로 에이전트 간 메시지를 교환한다.  

## 테스트 전략
| 테스트 종류 | 대상 | 주요 내용 |
|-------------|------|-----------|
| 유닛 테스트 | `llm.py`, `tools/*` | Mock LLM 응답 (`unittest.mock`), 외부 API 모킹 (`responses` 라이브러리) |
| 통합 테스트 | `agent.py` 전체 루프 | 실제 도구와 메모리 연동, 목표 달성 시나리오 검증 |
| CI 테스트 커버리지 | `tests/` 전체 | `pytest --cov=src` 로 80 % 이상 커버리지 목표 |
| 자동화 | GitHub Actions 워크플로 | PR마다 lint, test, build 실행 |

## CI/CD 파이프라인 설정 (GitHub Actions)
`.github/workflows/ci.yml` 예시 (코드 블록 없이 서술):
- **trigger**: `push`와 `pull_request` on `main` 및 `feature/*` 브랜치.  
- **jobs**:  
  1. `lint` – `ruff` 혹은 `flake8` 실행.  
  2. `test` – `pytest`와 커버리지 리포트.  
  3. `build` – Docker 이미지 빌드 (`docker build -t ghcr.io/<owner>/my-agent:${{ github.sha }}`)  
  4. `push` – `ghcr.io` 레지스트리에 이미지 푸시 (시크릿 `GHCR_TOKEN` 사용).  
  5. `deploy` – `aws ecs` 혹은 `gcloud run`에 배포 (수동 승인 단계 포함).  

- **시크릿 관리**: GitHub Settings → Secrets에 `OPENAI_API_KEY`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` 등을 저장한다.  

## 배포와 운영
### 컨테이너화
- **Dockerfile** (핵심 내용)  
  - `FROM python:3.11-slim`  
  - `WORKDIR /app`  
  - `COPY pyproject.toml .` → `pip install .`  
  - `COPY src/ ./src`  
  - `CMD ["uvicorn", "src.agent:app", "--host", "0.0.0.0", "--port", "8080"]`  
- **베스트 프랙티스**: 멀티‑스테이지 빌드, `--no-cache` 옵션 최소화, `USER` 지정으로 루트 권한 회피.  

### 클라우드 배포 옵션
| 플랫폼 | 배포 방식 | 주요 특징 |
|--------|----------|-----------|
| AWS ECS/Fargate | Docker 이미지 직접 실행 | 서버리스 컨테이너, 자동 스케일링 |
| GCP Cloud Run | 컨테이너 이미지 배포 | 요청당 인스턴스 자동 확대·축소 |
| Azure Container Apps | 마이크로서비스형 배포 | KEDA 기반 오토스케일링 |

### 스케일링 전략
- **수평 스케일링**: 트래픽 증가 시 복제본 수를 늘리고, 로드밸런서(ALB, Cloud Load Balancer)로 분산.  
- **오토스케일링 정책**: CPU 사용률 70 % 초과 시 복제본 1개 추가, 최소 2개, 최대 10개.  

### 롤백·버전 관리
- Docker 이미지 태그에 Git SHA 사용 (`my-agent:${{ github.sha }}`) → 특정 커밋으로 즉시 롤백 가능.  
- 배포 파이프라인에 `blue/green` 혹은 `canary` 전략을 적용한다.  

## 모니터링·관찰성
- **메트릭 수집**: `prometheus-client` 라이브러리로 `request_duration_seconds`, `tool_execution_success_total` 등 커스텀 메트릭 노출.  
- **트레이싱**: OpenTelemetry Python SDK를 이용해 각 단계(`perceive`, `reason`, `act`, `remember`)에 Span 생성, Jaeger 혹은 AWS X-Ray에 전송.  
- **로그 집계**: 구조화된 JSON 로그를 `Fluent Bit` → `Elasticsearch` 혹은 `Loki` 로 전송, Kibana 혹은 Grafana Loki 대시보드에서 조회.  
- **알림**: Prometheus Alertmanager와 Grafana 알림 채널(Slack, Email) 연동, 비용 초과 혹은 오류율 급증 시 알림 발생.  

## 다중 에이전트 시스템으로 확장
1. **에이전트 레지스트리**: Consul 혹은 etcd에 각 에이전트의 메타데이터(목표, 상태) 등록.  
2. **라우팅 메커니즘**: HTTP 라우터(FastAPI) 혹은 메시지 버스(Redis Pub/Sub)로 들어오는 요청을 담당 에이전트에 전달.  
3. **협업 프로토콜**: A2A (Agent‑to‑Agent) 혹은 Pub/Sub 패턴을 사용해 작업을 분할하고 결과를 합산한다.  
4. **상태 공유와 충돌 방지**: 중앙 메모리(벡터 DB)와 락 메커니즘을 활용해 동일 리소스에 대한 동시 접근을 제어한다.  
5. **사례 연구**: 고객 지원 워크플로 – 하나의 에이전트가 티켓 분류, 다른 에이전트가 해결책 제시, 세 번째 에이전트가 후속 조치를 자동화하는 시나리오를 구현할 수 있다(개념은 euno.news 기사와 동일).  

## 베스트 프랙티스·주요 함정
- **프롬프트 엔지니어링**: 명확한 목표와 제한 조건을 프롬프트에 포함하고, 함수 호출 스키마와 일치하도록 설계한다.  
- **비용 관리**: 배치 호출과 캐싱을 활용해 동일 질문에 대한 재사용을 최소화한다.  
- **보안·권한 관리**: API 키는 `.env`에 저장하고, GitHub Secrets와 Kubernetes Secrets로 전달한다. 최소 권한 원칙을 적용한다.  
- **흔히 발생하는 오류**:  
  - LLM 응답 형식 불일치 → 함수 호출 스키마 검증 로직 추가.  
  - 도구 타임아웃 → 재시도 정책과 백오프 적용.  
  - 메모리 누수 → 단기 메모리 주기적 정리 구현.  

## 부록
### 참고 자료·링크
- 원문 기사: [첫 AI 에이전트 만들기 – 단계별 튜토리얼 (euno.news)](https://euno.news/posts/ko/how-to-build-your-first-ai-agent-a-step-by-step-tu-d97ba7)  
- LangChain 공식 문서: https://python.langchain.com/docs  
- OpenAI 함수 호출 가이드: https://platform.openai.com/docs/guides/function-calling  
- FastAPI 튜토리얼: https://fastapi.tiangolo.com/tutorial/  
- Docker 베스트 프랙티스: https://docs.docker.com/develop/develop-images/dockerfile_best-practices/  
- GitHub Actions 공식 워크플로 예시: https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions  
- Prometheus & Grafana: https://prometheus.io/docs/introduction/overview/, https://grafana.com/docs/grafana/latest/  

### 용어 정의 (Glossary)
- **LLM**: Large Language Model, 대규모 언어 모델.  
- **MCP**: Model Context Protocol, 모델이 외부 도구와 상호작용하기 위한 표준 프로토콜.  
- **Tool**: 에이전트가 환경과 상호작용하기 위해 호출하는 함수·서비스.  
- **Memory**: 에이전트가 상태를 저장·조회하는 메커니즘, 단기와 장기로 구분.  

### 샘플 프로젝트 GitHub 레포지토리
> 현재 공개된 공식 레포지토리는 없으며, 필요 시 내부 레포지토리를 생성하고 README에 위 구조를 그대로 반영한다.  

### FAQ 및 커뮤니티 지원
- **Q1. LLM 비용이 급증할 때 대처법?** → 배치 호출, 캐시, 저비용 모델(Claude Opus 4 등) 전환.  
- **Q2. 도구 호출 시 인증 오류가 발생하면?** → `.env`에 API 키가 올바르게 설정됐는지, GitHub Secrets에 최신 값이 반영됐는지 확인.  
- **커뮤니티**: LangChain Discord, OpenAI Community Forum, Reddit r/AI_Agents 등에서 질문 및 사례 공유 가능.  

--- 

*이 문서는 euno.news 기사와 공개된 웹 자료를 기반으로 작성되었습니다. 추가적인 세부 구현 예제나 최신 라이브러리 버전은 공식 문서를 참고하시기 바랍니다.*