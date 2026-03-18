---
title: MCP (Model Context Protocol) 완벽 가이드
menu: MCP 가이드
author: SEPilot AI
status: published
tags: ["MCP", "Model Context Protocol", "Anthropic", "AI Integration", "JSON-RPC", "SDK", "llm", "protocol", "open-standard", "ai"]
related_docs: ["claude-code-release-history.md", "continuous-ai-agentic-ci.md", "continuous-ai.md"]
order: 1
updatedAt: 2026-03-18
quality_score: 88
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
- **알림**(notification): 서버가 비동기 이벤트(예: 파일 변경)를 Host에 푸시할 때 사용, `id` 없이 전송.  

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

> **주의**: 위 코드는 최소 예시이며, 프로덕션에서는 입력 검증, 오류 처리, 로깅, 레이트 리밋 등을 추가해야 한다.  

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
       result = eval(args['expression'])
       return {'result': result}

   @server.resource('db.query')
   async def query(params):
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

**`mcp.yaml`** 예시  

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
| **PostgreSQL + Cloud Storage** | 트랜잭션·스케일링 지원, 엔터프라이즈 권장 |
| **Docker Compose** | `docker-compose.yml` 로 DB·Server·TLS 인증서 동시 실행 |
| **Kubernetes** | `Deployment`, `Service`, `Ingress` 로 수평 확장, `Secret` 로 API 키 관리 |
| **Google Cloud Run / AWS Lambda** | 서버리스 배포, 자동 스케일링, 비용 효율 |

---

### 4.7 Self‑Logging Architecture (새로운 요구사항)

#### 4.7.1 Self‑Logging Requirements  
| 요구사항 | 설명 |
|----------|------|
| **전체 호출 가시성** | 모든 Tool·Resource 호출을 중앙 DB에 기록해, 클라이언트(Desktop, 서버, API) 구분 없이 추적 가능 |
| **멀티‑유저 태깅** | `user_id` 혹은 `role` 파라미터를 로그에 포함해, 동일 서버를 사용하는 여러 사용자를 구분 |
| **정확한 실행 시간** | 네트워크 왕복을 제외하고 실제 Tool 실행에 걸린 **duration_ms** 를 측정 |
| **오류·예외 기록** | `success` 플래그와 `error_message` 를 반드시 저장해, 실패 원인 분석 가능 |
| **증분 업로드 & 중복 방지** | 로컬 로그 파일을 파싱할 때 **bookmark**(파일 오프셋) 방식을 사용해 이미 전송된 라인은 재전송하지 않음 |
| **데이터 보존** | 최소 30 일 이상 보관하고, 배포 시 DB 파일이 덮어지지 않도록 외부 볼륨에 마운트 |
| **대시보드 연동** | Streamlit 기반 UI에서 `source`(remote/local), `tool_name`, `user_id`, 시간 범위 등으로 필터링·드릴‑다운 가능 |

> 출처: EUNO.NEWS, “왜 당신의 MCP 서버는 자체 로깅이 필요할까” (2026‑02‑24)  

#### 4.7.2 Implementation with SQLite, FastAPI, Streamlit  

1. **프로젝트 레이아웃**  

```
mcp-logging/
├─ app/
│  ├─ main.py          # FastAPI 엔드포인트
│  ├─ middleware.py    # FastMCP 로깅 미들웨어
│  ├─ db.py            # SQLite 연결 & ORM (SQLModel)
│  └─ models.py        # LogRecord Pydantic/SQLModel 정의
├─ dashboard/
│  └─ app.py           # Streamlit 대시보드
├─ Dockerfile
├─ docker-compose.yml
└─ README.md
```

2. **SQLite 스키마 (SQLModel)**  

```python
# models.py
from sqlmodel import SQLModel, Field
from datetime import datetime
from typing import Optional, Dict, Any

class LogRecord(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    source: str                     # "remote" or "local"
    user_id: Optional[str] = None
    tool_name: str
    parameters: Dict[str, Any] = Field(sa_column_kwargs={"type": "JSON"})
    success: bool
    duration_ms: Optional[float] = None
    result_summary: Optional[str] = None
    error_message: Optional[str] = None
```

3. **FastAPI 미들웨어**  

```python
# middleware.py
import time, json
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from .db import get_session
from .models import LogRecord

class MCPLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = time.time()
        body = await request.json()
        tool_name = body.get("method", "").split(".")[-1]
        user_id = request.headers.get("X-User-Id")
        log = LogRecord(
            source="remote",
            user_id=user_id,
            tool_name=tool_name,
            parameters=body.get("params", {}),
            success=False,
        )
        try:
            response: Response = await call_next(request)
            duration = (time.time() - start) * 1000
            log.duration_ms = duration
            log.success = response.status_code == 200
            try:
                result = await response.body()
                log.result_summary = json.dumps(json.loads(result)[:200])
            except Exception:
                log.result_summary = None
            return response
        except Exception as exc:
            log.success = False
            log.error_message = str(exc)
            raise
        finally:
            async with get_session() as session:
                session.add(log)
                await session.commit()
```

4. **FastAPI 엔드포인트**  

```python
# main.py
from fastapi import FastAPI
from .middleware import MCPLoggingMiddleware
from .db import init_db

app = FastAPI()
app.add_middleware(MCPLoggingMiddleware)

@app.on_event("startup")
async def startup():
    await init_db()
```

5. **Streamlit 대시보드**  

```python
# dashboard/app.py
import streamlit as st
import pandas as pd
import sqlite3

@st.cache_data
def load_logs():
    conn = sqlite3.connect("../app/logs.db")
    df = pd.read_sql_query("SELECT * FROM logrecord", conn, parse_dates=["timestamp"])
    conn.close()
    return df

df = load_logs()

st.title("MCP Server Observability Dashboard")
source = st.sidebar.selectbox("Source", ["remote", "local", "all"], index=2)
user = st.sidebar.text_input("User ID (optional)")

if st.sidebar.button("Apply Filters"):
    mask = (df["source"] == source) if source != "all" else True
    if user:
        mask &= df["user_id"] == user
    filtered = df[mask]
else:
    filtered = df

st.metric("Total Calls", len(filtered))
st.metric("Success Rate", f"{filtered['success'].mean():.1%}")
st.metric("Avg Duration (ms)", f"{filtered['duration_ms'].mean():.1f}")

st.dataframe(
    filtered.sort_values("timestamp", ascending=False)[
        ["timestamp", "source", "user_id", "tool_name", "success", "duration_ms"]
    ]
)
```

6. **Docker‑Compose** (볼륨을 외부에 마운트해 데이터 보존)  

```yaml
version: "3.9"
services:
  api:
    build: ./app
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=sqlite:////data/logs.db
    volumes:
      - mcp_data:/data
  dashboard:
    build: ./dashboard
    ports:
      - "8501:8501"
    depends_on:
      - api
volumes:
  mcp_data:
```

#### 4.7.3 Performance & Reliability Considerations  

| 고려사항 | 권장 구현 |
|----------|-----------|
| **쓰기 성능** | SQLite `WAL` 모드 활성화 (`PRAGMA journal_mode=WAL;`) |
| **동시성** | FastAPI + async DB 세션 사용, 필요 시 PostgreSQL 전환 준비 |
| **백업** | `cron` 으로 매일 `sqlite3 /data/logs.db ".backup '/backup/logs_$(date +%F).db'"` 실행 |
| **지연 시간 측정** | 미들웨어가 네트워크 RTT 제외하고 Tool 실행 시간만 기록 |
| **오류 격리** | `finally` 블록에서 로그 저장 보장 |
| **스케일 아웃** | 로그 전용 서비스로 분리하고 Kafka/PubSub 로 이벤트 스트림 전송 가능 |
| **보안** | API‑Key + Scope 검증 유지, 로그 조회는 읽기 전용 토큰만 허용 |
| **데이터 보존** | 최소 30 일 보관, 오래된 레코드 자동 삭제 (`DELETE FROM logrecord WHERE timestamp < datetime('now','-30 days');`) |
| **대시보드 연동** | Streamlit UI에서 `source`, `tool_name`, `user_id`, `time range` 로 필터링·드릴‑다운 가능 |
| **모니터링** | Prometheus `/metrics` 엔드포인트 추가 (`mcp_log_writes_total`, `mcp_log_errors_total`) |
| **리소스 제한** | 레코드당 최대 1 MB 제한, 오래된 레코드 TTL 정책 적용 |

> 위 설계는 **EUNO.NEWS** 기사(2026‑02‑24)에서 제시된 **FastMCP 미들웨어**, **SQLite 중앙 로그**, **Streamlit 대시보드** 구현을 그대로 반영한 것이다.  

---

### 4.8 보안 위협 모델  

MCP 서버는 LLM과 외부 인프라 사이의 **신뢰 다리** 역할을 수행한다. 현재 표준화된 검증·감사 메커니즘이 부재한 상황에서 다음과 같은 주요 위협이 존재한다(출처: EUNO.NEWS).

| 위협 카테고리 | 가능한 악용 시나리오 |
|---------------|----------------------|
| **파일 시스템 접근** | `file.read`, `file.write`, `file.delete` 도구를 통해 민감 파일 탈취·파괴 |
| **코드 실행** | `exec`, `shell`, `git.clone` 등 도구가 임의 명령을 실행해 서버 장악 |
| **네트워크 아웃바운드** | `http.request`, `curl` 등 도구가 외부 C2 서버와 통신하거나 데이터 유출 |
| **자격 증명 접근** | 환경 변수·설정 파일을 읽어 API 키, DB 비밀번호 등을 획득 |
| **도구 메타데이터 변조** | 악의적인 Tool 선언을 삽입해 권한 상승 또는 권한 회피 시도 |

위 위험을 완화하려면 **능력 선언**(what‑can‑do)과 **거부된 능력**(what‑cannot‑do)를 기계가 읽을 수 있는 형식으로 명시하고, 선언과 실제 동작을 지속적으로 **감사**해야 한다.

---

### 4.9 서버‑사이드 인증·인가  

#### 4.9.1 기본 인증 메커니즘  
| 요소 | 권장 구현 |
|------|-----------|
| **API 키** | 서버‑사이드에 사전 등록하고 `Authorization: Bearer <key>` 헤더로 전달 (MongoDB MCP 보안 권장사항) |
| **TLS** | 모든 통신은 HTTPS(또는 WSS) 로 암호화. 인증서 자동 갱신을 위해 Let’s Encrypt 또는 Cloud‑Managed TLS 사용 |
| **Scope‑Based 권한** | 키당 허용된 Tool·Resource 목록을 `scope` 로 정의. 예: `read:file`, `invoke:weather_api` (Casdoor OAuth Scopes) |
| **조건부 액세스** | IP 화이트리스트, 시간대 제한, MFA 등 추가 정책을 IAM 레이어에서 적용 |
| **RBAC** | 조직·역할에 따라 서로 다른 API 키와 스코프를 발급. 예: `admin`, `developer`, `viewer` 역할 |

#### 4.9.2 권한 최소화 (Least Privilege)  
1. **능력 선언 파일** (`agent-card.kya.json`)에 `allowed` 와 `denied` 리스트를 명시.  
2. 서버 시작 시 선언을 **검증**하고, 선언과 실제 플러그인 매핑이 일치하지 않을 경우 시작을 차단.  
3. **동적 스코프 검증**: 요청 시 `scope` 헤더와 선언된 `allowed` 를 교차 검증해 허용되지 않은 Tool 호출 차단.  

#### 4.9.3 인증 연동 예시 (TypeScript)  

```typescript
import { McpServer } from 'typescript-mcp';
import { verifyJwt, getUserScopes } from './auth';

const server = new McpServer({
  port: 8080,
  authMiddleware: async (req) => {
    const token = req.headers.get('authorization')?.split(' ')[1];
    const payload = await verifyJwt(token!);
    const scopes = await getUserScopes(payload.sub);
    return { userId: payload.sub, scopes };
  },
});

server.defineScope('read:file', ['file.read']);
server.defineScope('invoke:weather_api', ['weather.getCurrent']);
```

#### 4.9.4 **Authorization Model – Request‑time Enforcement**  

최근 **EUNO.NEWS**(2026‑02‑24) 보도에 따르면, MCP 권한 부여는 **요청 시점에 서버‑사이드에서 강제 적용**되는 것이 핵심이다. 초기 연결 시점에만 인증을 수행한다는 오해가 흔하지만, 실제로는 **각 Tool·Resource 실행 요청마다** 다음 절차가 수행된다.

1. **토큰 검증** – 클라이언트가 전송한 JWT(또는 Casdoor‑발급 OAuth 토큰)를 검증하고, `exp`, `nbf`, `iss` 등을 확인한다.  
2. **Scope 매핑** – 토큰의 `scope` 클레임을 현재 요청의 `toolName`·`resourceId`와 매핑한다. 스코프가 일치하지 않으면 즉시 `403 Forbidden` 응답을 반환한다.  
3. **RBAC 체크** – 토큰에 포함된 `role`(예: `agent`, `admin`)을 기반으로 사전 정의된 정책과 교차 검증한다. 정책은 `policy.yaml` 같은 파일에 선언한다.  
4. **감사 로그** – 허용·거부 여부, 사용자 ID, 요청 파라미터, 실행 시간을 **Self‑Logging Architecture**(섹션 4.7)와 연계해 기록한다.  

> **핵심 원칙**  
> - **Zero‑Trust**: 세션 상태에 의존하지 않고, 모든 호출마다 권한을 재검증한다.  
> - **단기간 토큰**: 토큰 TTL을 짧게(예: 5 분) 설정해 탈취 시 피해를 최소화한다.  

#### 4.9.5 **Token‑Based Permissions and Scope Definitions**  

MCP는 **OAuth 2.0 Scopes**와 유사하게 권한을 선언한다. 주요 포인트는 다음과 같다.

| 요소 | 설명 | 참고 |
|------|------|------|
| **Scope 문자열** | `read:file`, `write:file`, `invoke:weather_api` 등 **동사:리소스** 형태. | Casdoor OAuth Scopes (MCP authorization and scopes) |
| **Scope 요청** | 클라이언트는 토큰 발급 시 필요한 스코프를 `scope` 파라미터에 열거한다. 예: `scope=read:file invoke:weather_api` | Casdoor 문서 |
| **Scope 검증** | 서버는 토큰의 `scope` 클레임을 파싱하고, 요청된 `toolId`·`resourceId`와 매핑한다. 불일치 시 `403` 반환. | 위 섹션 4.9.4 |
| **동적 스코프** | 토큰 발급 시 **조건부** 스코프를 부여할 수 있다(예: 특정 세션 ID와 연결). | Logto 블로그(2025‑06‑18) |
| **범위 최소화** | 필요 최소한의 스코프만 포함하도록 설계해, 권한 상승 위험을 방지한다. | 보안 베스트 프랙티스 |

#### 4.9.6 **Implementation Example – Gateway Validation Flow**  

아래는 **FastAPI** 기반 MCP 게이트웨이 미들웨어 예시이다. 이 미들웨어는 **요청‑시점**에 토큰·스코프·RBAC를 검증하고, 검증 결과를 `request.state`에 저장해 이후 Tool 핸들러가 사용할 수 있게 한다.

```python
# gateway.py
import jwt, time
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from typing import List

JWT_SECRET = "super-secret-key"
ALGORITHM = "HS256"

# 간단 정책 예시
POLICIES = {
    "admin": {"allow": ["*"]},
    "agent": {"allow": ["read:file", "invoke:weather_api"]},
    "viewer": {"allow": ["read:file"]},
}

def verify_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        return payload
    except jwt.PyJWTError as e:
        raise HTTPException(status_code=401, detail="Invalid token") from e

def scope_allowed(scopes: List[str], required: str) -> bool:
    return required in scopes or "*" in scopes

class AuthorizationGateway(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # 1️⃣ 토큰 추출
        auth = request.headers.get("Authorization")
        if not auth or not auth.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Missing Bearer token")
        token = auth.split(" ", 1)[1]

        # 2️⃣ 토큰 검증
        payload = verify_token(token)
        user_id = payload.get("sub")
        token_scopes = payload.get("scope", "").split()
        role = payload.get("role", "viewer")

        # 3️⃣ 요청 파싱 (method 형식: mcp.<category>.<action>)
        body = await request.json()
        tool_name = body.get("method", "").split(".")[-1]

        # 4️⃣ 요청에 매핑되는 필수 스코프 정의
        required_scope = {
            "weather.getCurrent": "invoke:weather_api",
            "file.read": "read:file",
            "file.write": "write:file",
        }.get(tool_name)

        if required_scope is None:
            raise HTTPException(status_code=400, detail="Unknown tool")

        # 5️⃣ 스코프 검증
        if not scope_allowed(token_scopes, required_scope):
            raise HTTPException(status_code=403, detail="Scope insufficient")

        # 6️⃣ RBAC 검증
        policy = POLICIES.get(role, {})
        if not scope_allowed(policy.get("allow", []), required_scope):
            raise HTTPException(status_code=403, detail="Role not permitted for this action")

        # 7️⃣ 감사 로그 (Self‑Logging과 연계)
        request.state.auth = {
            "user_id": user_id,
            "role": role,
            "scopes": token_scopes,
            "tool": tool_name,
            "allowed": True,
        }

        # 8️⃣ 실제 핸들러 호출
        response = await call_next(request)
        return response
```

**핵심 흐름**  

1. `Authorization` 헤더에서 JWT를 받아 `verify_token` 로 검증.  
2. `scope` 클레임을 파싱하고, 요청된 Tool에 매핑된 **필수 스코프**와 비교.  
3. 역할 기반 정책(`POLICIES`)과 교차 검증.  
4. 검증 성공 시 `request.state.auth` 에 메타데이터 저장 → 이후 Tool 핸들러가 이를 활용해 추가 로깅·감사를 수행.  
5. 검증 실패 시 즉시 `401` 혹은 `403` 응답 반환.  

이 패턴은 **Casdoor**에서 권장하는 *OAuth Scopes* 사용법과 **Logto**가 제시한 *gateway‑style token validation*을 그대로 구현한다. 또한 **Self‑Logging Architecture**와 결합해 모든 허용·거부 이벤트를 영구 저장한다.

---

### 4.10 감사 및 로깅 권고사항  

#### 4.10.1 로그 내용 (KYA 표준)  
| 필드 | 설명 |
|------|------|
| **identity** | 서버 소유자, 연락처, 버전 |
| **capabilities** | `allowed` (가능한 작업)와 `denied` (불가능한 작업) |
| **auditHistory** | 마지막 감사 일시, 사용 도구, 점수, 발견된 취약점 |
| **riskClassification** | `low`, `medium`, `high` 및 PII·GDPR 등 규제 적용 여부 |
| **compliance** | EU AI Act, NIST AI RMF 매핑 |
| **operationalControls** | 로깅, 속도 제한, 킬‑스위치 구현 여부 |

KYA 에이전트 카드 생성 예시:

```bash
pip install kya-agent
kya init --agent-id "my-org/mcp-server" --name "My MCP Server"
kya validate agent-card.kya.json
kya score agent-card.kya.json
```

#### 4.10.2 실시간 감사 로그  
* 기존 **Self‑Logging Architecture**(섹션 4.7) 를 그대로 활용하면서, 아래 항목을 추가한다.

- **user_id / role**: `X-User-Id` 헤더 또는 JWT `sub` 클레임을 기록.  
- **duration_ms**: 네트워크 RTT 제외하고 Tool 실행 시간만 측정.  
- **error_message**: 예외 발생 시 요약 메시지 저장.  
- **audit_timestamp**: UTC 기준 자동 삽입.  

#### 4.10.3 로그 보존 및 접근 제어  

| 정책 | 구현 |
|------|------|
| **보존 기간** | 최소 30 일, 필요 시 GDPR‑compliant 보관 정책 적용. |
| **외부 볼륨** | Kubernetes `PersistentVolumeClaim` 혹은 Docker `volume`에 `/data` 마운트. |
| **읽기 전용 조회** | 로그 조회 API는 읽기 전용 토큰만 허용하도록 IAM 정책 적용. |

---

## 5. 비밀 스캔 (Secret Scanning)

### 5.1 비밀 스캔 개요  
GitHub가 제공하는 **MCP Server 기반 비밀 스캔** 기능은 커밋 또는 풀 리퀘스트를 열기 전에 코드 변경 사항에 노출된 자격 증명·시크릿을 자동으로 탐지한다. 이 기능은 **GitHub Secret Protection**이 활성화된 저장소에 대해 현재 **공개 프리뷰** 단계에 제공되며, MCP와 호환되는 IDE와 AI 코딩 에이전트가 실시간으로 비밀을 감지하도록 설계되었다.  

- **탐지 시점**: 로컬 변경, `git add` 단계, 혹은 AI 코딩 에이전트가 프롬프트를 통해 명시적으로 요청할 때.  
- **결과 형태**: 발견된 비밀의 파일 경로, 라인 번호, 비밀 종류(예: API 키, 토큰) 등을 포함한 구조화된 JSON 응답.  

> 출처: GitHub Changelog, EUNO.NEWS (2026‑02‑24)  

### 5.2 MCP와 AI 코딩 에이전트 연동  
1. **AI 코딩 에