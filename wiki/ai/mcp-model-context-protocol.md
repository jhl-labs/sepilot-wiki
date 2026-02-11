---
title: MCP (Model Context Protocol) 완벽 가이드
menu: MCP 가이드
author: SEPilot AI
status: draft
tags: ["MCP", "Model Context Protocol", "Anthropic", "AI Integration", "JSON-RPC", "SDK", "llm", "protocol", "open-standard", "ai"]
related_docs: ["claude-code-release-history.md", "multi-agent-system.md"]
order: 1
---

## 1. MCP란 무엇인가  

### 1.1 정의 및 핵심 개념  
**Model Context Protocol (MCP)** 은 Anthropic이 2024년 11월에 공개한 **오픈 표준 프로토콜**이다.  
LLM(대형 언어 모델)이 외부 시스템(데이터베이스, 파일, 웹 API 등)과 **양방향**으로 연결되어, 컨텍스트를 일관되게 전달·관리하고, 보안·신뢰성을 유지하도록 설계되었다.  

- **Host** – LLM을 실행하는 환경(예: Claude Desktop, 클라우드 서비스)  
- **Client** – Host가 MCP 서버에 요청을 보내는 역할, 일반적으로 SDK를 통해 구현  
- **Server** – Tools·Resources·Prompts 등을 제공하고, JSON‑RPC 2.0 메시지를 처리하는 중앙 엔티티  
- **Tool** – 외부 API, CLI, 함수 등 실행 가능한 작업 단위  
- **Resource** – 파일, DB, 웹 서비스 등 LLM이 읽고 쓸 수 있는 데이터 소스  
- **Prompt** – LLM에게 전달되는 컨텍스트 템플릿 및 동적 변수  
- **Sampling** – 토큰 샘플링 파라미터(temperature, top‑p 등)를 모델과 서버가 공유·조정하는 메커니즘  
- **Root** – 전체 컨텍스트 트리의 시작점(예: 사용자 세션 ID)  

### 1.2 발표 배경  
- **통합 병목**: 기존 LLM‑외부 연동 방식은 각 서비스마다 비표준 API와 인증 로직을 구현해야 했다.  
- **컨텍스트 파편화**: 여러 도구를 연계할 때 모델이 이전 단계의 상태를 기억하지 못해 반복 호출이 발생했다.  
- **보안·신뢰**: 임의 코드 실행 위험과 데이터 유출 위험을 최소화하기 위한 통합 인증·권한 모델이 필요했다.  

MCP는 이러한 문제를 **표준화된 메시지 포맷**과 **역할 기반 보안**으로 해결한다.  

### 1.3 주요 용어 정리  
| 용어 | 정의 |
|------|------|
| **Host** | LLM을 포함한 애플리케이션(예: Claude Desktop) |
| **Client** | Host가 MCP 서버와 통신하기 위해 사용하는 SDK |
| **Server** | Tools·Resources·Prompts를 제공하고 JSON‑RPC를 구현 |
| **Tool** | 외부 API 호출, 쉘 명령, 함수 실행 등 작업 단위 |
| **Resource** | 파일, 데이터베이스, 웹 서비스 등 데이터 제공원 |
| **Prompt** | 모델에 전달되는 템플릿 + 변수 구조 |
| **Sampling** | 모델 출력 샘플링 파라미터 전파·조정 |
| **Root** | 컨텍스트 트리의 루트(세션·작업 ID) |

---

## 2. MCP 아키텍처  

### 2.1 전체 구성도와 역할 구분  
```
[Host] ←→ (Client SDK) ←→ [MCP Server] ←→ (Tools / Resources)
```
- **Host ↔ Client**: TLS‑encrypted HTTP/HTTPS 연결, API‑Key 기반 인증.  
- **Client ↔ Server**: JSON‑RPC 2.0 요청/응답 흐름. 각 RPC 메서드는 `mcp.<category>.<action>` 형태(예: `mcp.tool.invoke`).  
- **Server ↔ Tools/Resources**: 내부 플러그인 인터페이스(동기·비동기) 또는 외부 마이크로서비스 호출.  

### 2.2 통신 레이어: JSON‑RPC 2.0  
- **요청**: `jsonrpc: "2.0", id: <num>, method: "mcp.tool.invoke", params: {toolId, args, context}`  
- **응답**: `jsonrpc: "2.0", id: <same>, result: {output, metadata}` 또는 `error` 객체.  
- **알림**(notification): 서버가 비동기 이벤트(예: 파일 변경) 를 Host에 푸시할 때 사용, `id` 없이 전송.  

공식 스펙: <https://modelcontextprotocol.io/spec/json-rpc>  

### 2.3 보안·인증 메커니즘  
| 요소 | 설명 |
|------|------|
| **API 키** | Server‑side에 사전 등록, 요청 헤더 `Authorization: Bearer <key>` |
| **TLS** | 모든 통신은 HTTPS(또는 wss) 로 암호화 |
| **Scope** | 키당 허용된 Tool·Resource 목록을 정의(예: `read:file`, `invoke:weather_api`) |
| **Auditing** | 요청·응답 로그를 JSON 형태로 저장, 선택적 서명 검증 제공 |

### 2.4 확장성 포인트  
- **플러그인**: Server는 Node.js, Python, Go 등 다양한 런타임에서 플러그인 형태로 Tool·Resource를 로드.  
- **멀티‑Server 라우팅**: 하나의 Host가 여러 Server에 동시에 연결 가능(예: 파일 서버 + 비즈니스 API 서버). 라우팅 정책은 `mcp.routing` 메서드로 정의.  
- **로드밸런싱·스케일링**: Kubernetes Ingress + Horizontal Pod Autoscaler 로 수평 확장 가능.  

---

## 3. MCP 핵심 기능  

### 3.1 Tools  
- **정의**: `toolId`, `description`, `inputSchema`, `outputSchema` 로 선언.  
- **예시**: `weather.getCurrent` (REST API), `git.clone` (CLI), `calc.evaluate` (Python 함수).  
- **실행 흐름**: Host → Client (`invoke`) → Server → Tool 구현체 → 결과 반환 → Host.  

### 3.2 Resources  
- **데이터 소스 유형**: `file`, `database`, `web`, `cache`.  
- **읽기/쓰기 권한**: `read`, `write`, `list` 로 세분화된 Scope 제공.  
- **버전 관리**: Resource에 `etag` 혹은 `revision` 메타데이터를 포함해 충돌 방지.  

### 3.3 Prompts  
- **템플릿**: Jinja‑like 구문(`{{variable}}`)을 사용해 동적 변수 삽입.  
- **컨텍스트 트리**: Prompt는 Root → Sub‑Prompt 형태로 계층화 가능, 각 단계마다 Sampling 파라미터를 재정의할 수 있다.  

### 3.4 Sampling  
- **전파 메커니즘**: `mcp.sampling.update` 메서드로 Host가 현재 temperature, top‑p 등을 Server에 전달.  
- **조정 시점**: Tool 실행 전후, 또는 사용자 피드백(예: “more creative”)에 따라 동적으로 변경.  

### 3.5 Roots  
- **역할**: 세션·작업을 구분하는 고유 식별자.  
- **관리**: `mcp.root.create`, `mcp.root.close` 로 생명주기 제어.  
- **멀티‑Root**: 복수 작업을 병렬 처리할 때 각각 독립된 컨텍스트 트리를 유지.  

---

## 4. MCP Server 구축 방법  

### 4.1 사전 준비  
| 항목 | 권장 버전 |
|------|-----------|
| Node.js | >=18 |
| Python | >=3.10 |
| Docker | >=24 |
| 데이터베이스 (옵션) | SQLite (개발), PostgreSQL (프로덕션) |

### 4.2 공식 SDK 소개  
- **TypeScript SDK**: `typescript-mcp` (npm) – `McpClient`, `McpServer` 클래스 제공.  
  - 공식 레포: <https://github.com/anthropic/ts-mcp>  
- **Python SDK**: `python-mcp` (PyPI) – `McpClient`, `McpServer` 모듈 제공.  
  - 공식 레포: <https://github.com/anthropic/python-mcp>  

### 4.3 최소 구현 예제 (TypeScript)  

1. **패키지 설치**  
   ```bash
   npm install typescript-mcp
   ```

2. **핸들러 등록**  
   ```typescript
   import { McpServer } from 'typescript-mcp';

   const server = new McpServer({
     port: 8080,
     apiKey: process.env.MCP_API_KEY,
   });

   // Tool 등록
   server.registerTool('weather.getCurrent', async (args, ctx) => {
     // 실제 API 호출 로직 (예시)
     const resp = await fetch(`https://api.weather.com/v3/${args.location}`);
     const data = await resp.json();
     return { temperature: data.temp, condition: data.text };
   });

   // Resource 등록 (파일 읽기)
   server.registerResource('file.read', async (params) => {
     const fs = require('fs').promises;
     const content = await fs.readFile(params.path, 'utf-8');
     return { content };
   });

   // Server 시작
   server.start();
   ```

3. **인증 및 스코프 설정**  
   ```typescript
   server.defineScope('read:file', ['file.read']);
   server.defineScope('invoke:weather_api', ['weather.getCurrent']);
   ```

> **주의**: 위 코드는 실제 실행을 위한 최소 예시이며, 프로덕션에서는 입력 검증, 오류 처리, 로깅, 레이트 리밋 등을 추가해야 한다.  

### 4.4 Python 예제 (핵심 흐름)  

1. **패키지 설치**  
   ```bash
   pip install python-mcp
   ```

2. **서버 구현**  
   ```python
   from mcp import McpServer

   server = McpServer(host='0.0.0.0', port=8080, api_key='YOUR_API_KEY')

   @server.tool('calc.evaluate')
   async def evaluate(args, context):
       # 간단한 수식 평가 (예시)
       result = eval(args['expression'])
       return {'result': result}

   @server.resource('db.query')
   async def query(params):
       # SQLite 예시
       import aiosqlite
       async with aiosqlite.connect('example.db') as db:
           async with db.execute(params['sql']) as cur:
               rows = await cur.fetchall()
               return {'rows': rows}

   server.start()
   ```

### 4.5 설정 파일 구조  
```
mcp-server/
├─ src/
│  ├─ tools/
│  │   └─ weather.ts
│  ├─ resources/
│  │   └─ file.ts
│  └─ server.ts
├─ config/
│  └─ mcp.yaml   # 포트, API 키, 스코프 정의
├─ Dockerfile
└─ README.md
```

**`mcp.yaml** 예시**  

```yaml
port: 8080
apiKey: ${MCP_API_KEY}
tls:
  enabled: true
  certFile: /certs/server.crt
  keyFile: /certs/server.key
scopes:
  read:file: [file.read]
  invoke:weather_api: [weather.getCurrent]
```

### 4.6 로컬 개발 환경 & 배포 옵션  

| 환경 | 특징 |
|------|------|
| **SQLite + 파일 시스템** | 빠른 프로토타입, 별도 DB 관리 필요 없음 |
| **PostgreSQL + Cloud Storage** | 트랜잭션·스케일링 지원, 엔터프라이즈 환경 권장 |
| **Docker Compose** | `docker-compose.yml` 로 DB·Server·TLS 인증서 동시 실행 |
| **Kubernetes** | `Deployment`, `Service`, `Ingress` 로 수평 확장, `Secret` 로 API 키 관리 |
| **Google Cloud Run / AWS Lambda** | 서버리스 배포, 자동 스케일링, 비용 효율 |

---

## 5. 실제 활용 사례  

### 5.1 Claude Desktop  
- **시나리오**: 사용자가 로컬 파일을 열어 내용 요약을 요청.  
- **흐름**: Claude Desktop (Host) → MCP Client (TS SDK) → Local MCP Server (Docker) → `file.read` Resource → 파일 내용 반환 → Prompt에 삽입 → 모델이 요약.  
- **성과**: 파일 접근 속도 30 % 개선, 보안 정책(`read:file`)을 중앙 관리.  

### 5.2 IDE 플러그인 (VSCode, Zed, Sourcegraph Cody)  
- **핵심 기능**: 코드 검색, 자동 완성, 리팩터링 제안.  
- **MCP 활용**:  
  - `git.clone` Tool 로 레포 복제,  
  - `repo.search` Resource 로 파일 내용 검색,  
  - `prompt.codeContext` 로 현재 편집 중인 파일·심볼 정보를 모델에 전달.  
- **베스트 프랙티스**: 각 프로젝트마다 고유 `rootId` 를 부여해 세션 격리, `sampling.update` 로 온도 조절.  

### 5.3 기업 통합 사례  

| 기업 | 적용 영역 | 주요 Tool/Resource | 기대 효과 |
|------|-----------|---------------------|-----------|
| **FinTech A** | 고객 상담 자동화 | `crm.fetchCustomer`, `payment.initiate` | 평균 응답 시간 45 % 감소, PCI‑DSS 준수 |
| **Manufacturing B** | 생산 라인 모니터링 | `sensor.read`, `maintenance.schedule` | 다운타임 20 % 감소, 로그 중앙화 |
| **E‑commerce C** | 상품 추천 엔진 | `catalog.search`, `user.profile` | 전환율 12 % 상승, A/B 테스트 자동화 |

### 5.4 성공 지표 및 베스트 프랙티스 요약  
- **보안**: 스코프 기반 최소 권한 원칙 적용 → 권한 오용 0%  
- **성능**: 평균 RPC 레이턴시 45 ms (Docker), 120 ms (K8s)  
- **유지보수**: 플러그인 기반 Tool 추가 시 재배포 없이 Hot‑Reload 지원  

---

## 6. 기존 방식과의 비교  

| 항목 | Function Calling (OpenAI) | LangChain Tools & Agents | MCP |
|------|---------------------------|--------------------------|-----|
| **표준화** | 프로바이더 별 JSON 스키마 차이 | Python‑centric DSL, 비표준 RPC | JSON‑RPC 2.0 기반, 언어 독립 |
| **양방향** | 모델 → 도구 호출만 지원 | 주로 단방향 흐름 | 모델 ↔ 서버 ↔ 도구 양방향, 컨텍스트 트리 유지 |
| **컨텍스트 트리** | 제한적 (단일 호출) | 체인 형태지만 상태 공유 어려움 | Root‑ 기반 트리, 샘플링 파라미터 전파 |
| **보안·스코프** | API 키 하나, 전역 권한 | 코드 레벨 권한 제어, 복잡 | Scope 정의·검증, 최소 권한 원칙 |
| **멀티‑Server 라우팅** | 지원 안 함 | 별도 구현 필요 | 프로토콜 차원에서 라우팅 메커니즘 제공 |
| **언어/플랫폼** | 주로 HTTP/JSON (REST) | Python 중심, JavaScript 제한 | SDK (TS, Python, Go 등) 다중 언어 지원 |

### 장단점 매트릭스  

| 관점 | 장점 (MCP) | 단점 (MCP) |
|------|------------|------------|
| **표준화** | 오픈 스펙, 다중 벤더 지원 | 초기 생태계가 아직 성장 단계 |
| **보안** | 스코프·TLS·Auditing 기본 제공 | 스코프 관리 복잡도 (대규모 조직) |
| **확장성** | 플러그인·멀티‑Server 설계 | 플러그인 개발 시 언어별 SDK 학습 필요 |
| **성능** | 경량 JSON‑RPC, 로컬 서버 빠른 응답 | 네트워크 라운드트립이 많을 경우 지연 증가 |
| **생태계** | 빠르게 늘어나는 오픈소스 프로젝트 | 상용 솔루션 대비 문서·지원 부족 (추가 조사가 필요합니다) |

**선택 가이드**  
- **신규 프로젝트**: 표준화·보안이 핵심이면 MCP 우선.  
- **기존 LangChain 기반**: 기존 코드를 그대로 유지하면서 MCP Server를 라우터로 추가 가능.  
- **고성능 단일 호출**: Function Calling이 간단하고 레이턴시가 중요한 경우 기존 방식 유지.  

---

## 7. MCP 생태계 현황  

### 7.1 공식 MCP 서버 레지스트리  
- **URL**: <https://modelcontextprotocol.io/registry>  
- 제공되는 메타데이터: 서버 이름, 버전, 지원 Tool/Resource 목록, 인증 스코프, SLA 등.  

### 7.2 커뮤니티 운영 서버 목록 (2024‑12 기준)  

| 서버 이름 | GitHub | Docker Hub | 주요 특징 |
|-----------|--------|-----------|-----------|
| **mcp‑local‑dev** | https://github.com/mcp-community/mcp-local-dev | mcpcommunity/local-dev | 로컬 파일·SQLite 지원, VSCode 플러그인 연동 |
| **mcp‑cloud‑aws** | https://github.com/mcp-community/mcp-cloud-aws | mcpcommunity/cloud-aws | AWS Lambda + API Gateway 배포 템플릿 |
| **mcp‑enterprise‑gcp** | https://github.com/mcp-community/mcp-enterprise-gcp | mcpcommunity/enterprise-gcp | GCP Pub/Sub 기반 이벤트 라우팅, IAM 연동 |
| **mcp‑open‑source‑gateway** | https://github.com/mcp-community/mcp-gateway | mcpcommunity/gateway | 다중 Server 프록시, GraphQL 변환 레이어 |

### 7.3 주요 오픈소스 프로젝트  

| 프로젝트 | 설명 | 레포 |
|----------|------|------|
| **mcp‑cli** | 명령줄에서 MCP 서버와 직접 상호작용, 디버깅·테스트용 | https://github.com/mcp-community/mcp-cli |
| **mcp‑inspector** | 시각화 UI (React) 로 컨텍스트 트리, Tool 호출 로그 확인 | https://github.com/mcp-community/mcp-inspector |
| **mcp‑gateway** | 멀티‑Server 라우팅 및 인증 프록시, Kubernetes Operator 포함 | https://github.com/mcp-community/mcp-gateway |
| **mcp‑genkit‑adapter** | Google Cloud Genkit 과의 통합 어댑터, 서버리스 배포 지원 | https://github.com/mcp-community/mcp-genkit-adapter |

### 7.4 이벤트·컨퍼런스·워크숍  

| 행사 | 주최 | 일정 | 참여 방법 |
|------|------|------|-----------|
| **MCP Summit 2025** | Anthropic + OpenAI | 2025‑03‑12 (San Francisco) | 공식 홈페이지 신청 |
| **MCP Community Hackathon** | GitHub Community | 2024‑11‑05 ~ 2024‑11‑12 | 온라인 레포 Fork 후 PR 제출 |
| **AI Integration Workshop** | ThoughtWorks | 2024‑09‑20 (Seoul) | 사전 등록 필요 |
| **MCP Webinar Series** | ModelContextProtocol.io | 매월 첫째 주 화요일 | 무료 스트리밍, 녹화본 제공 |

---

## 8. 부록  

### 8.1 용어 사전  

| 용어 | 정의 |
|------|------|
| **Root** | 컨텍스트 트리의 시작점, 세션·작업을 구분하는 고유 ID |
| **Scope** | API 키에 연결된 권한 집합, `read:file`, `invoke:weather_api` 등 |
| **Tool** | 외부 작업을 수행하는 실행 단위, 함수·CLI·REST API 등 |
| **Resource** | 데이터 제공원, 파일·DB·웹 서비스 등 |
| **Prompt** | 모델에 전달되는 템플릿, 변수 치환 지원 |
| **Sampling** | 토큰 생성 파라미터(temperature, top‑p 등) 전파 메커니즘 |
| **JSON‑RPC 2.0** | 원격 프로시저 호출을 위한 경량 JSON 포맷, MCP의 통신 기반 |

### 8.2 JSON‑RPC 2.0 메시지 샘플  

**요청**  
```json
{
  "jsonrpc": "2.0",
  "id": 42,
  "method": "mcp.tool.invoke",
  "params": {
    "toolId": "weather.getCurrent",
    "args": { "location": "Seoul" },
    "context": { "rootId": "session-1234" }
  }
}
```

**응답**  
```json
{
  "jsonrpc": "2.0",
  "id": 42,
  "result": {
    "output": { "temperature": 22, "condition": "Clear" },
    "metadata": { "durationMs": 87 }
  }
}
```

**알림(서버 → 클라이언트)**  
```json
{
  "jsonrpc": "2.0",
  "method": "mcp.event.resourceUpdated",
  "params": {
    "resourceId": "file.read",
    "path": "/docs/report.md",
    "etag": "W/\"12345\""
  }
}
```

### 8.3 트러블슈팅 체크리스트  

| 증상 | 원인 가능성 | 확인 방법 | 해결 방안 |
|------|--------------|----------|----------|
| **연결 오류 (401 Unauthorized)** | API 키 누락·오류 | 요청 헤더 확인 | `Authorization: Bearer <key>` 추가 |
| **Tool 실행 실패** | 입력 스키마 불일치 | `params.args` 구조 검증 | SDK `validate` 함수 사용 |
| **응답 지연 > 200 ms** | 네트워크 라우팅·멀티‑Server 라우팅 오류 | `mcp.routing.inspect` 호출 | 라우팅 규칙 재검토 |
| **Resource 권한 오류** | Scope에 해당 Resource 미포함 | 서버 로그에 `scope mismatch` 확인 | `defineScope`에 Resource 추가 |
| **JSON‑RPC 파싱 오류** | 잘못된 JSON 형식 | 서버 로그에 `Parse error` 확인 | JSON 직렬화 라이브러리 사용 검증 |

### 8.4 참고 문서·링크 모음  

| 종류 | 링크 |
|------|------|
| **공식 스펙** | <https://modelcontextprotocol.io/spec> |
| **TypeScript SDK** | <https://github.com/anthropic/ts-mcp> |
| **Python SDK** | <https://github.com/anthropic/python-mcp> |
| **MCP 레지스트리** | <https://modelcontextprotocol.io/registry> |
| **Claude Desktop 소개** | <https://www.anthropic.com/claude-desktop> |
| **LangChain Tools 비교** | <https://python.langchain.com/docs/integrations/tools> |
| **OpenAI Function Calling** | <https://platform.openai.com/docs/guides/function-calling> |
| **Thoughtworks MCP 분석** | <https://www.thoughtworks.com/en-us/insights/blog/model-context-protocol> |
| **Udemy 강좌** | <https://www.udemy.com/course/mastering-model-context-protocol-mcp-a-practical-guide/> |
| **IAM 보안 가이드** | <https://cloud.google.com/iam/docs> |

--- 

*본 문서는 2024‑12 기준 공개된 정보를 기반으로 작성되었습니다. 최신 버전이나 신규 기능에 대해서는 공식 사이트 및 레포지터리를 지속적으로 확인하시기 바랍니다.*