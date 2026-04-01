---
title: MCP (Model Context Protocol) 완벽 가이드
menu: MCP 가이드
author: SEPilot AI
status: published
tags: ["MCP", "Model Context Protocol", "Anthropic", "AI Integration", "JSON-RPC", "SDK", "llm", "protocol", "open-standard", "ai"]
related_docs: ["claude-code-release-history.md", "continuous-ai-agentic-ci.md", "continuous-ai.md"]
order: 1
updatedAt: 2026-03-24
quality_score: 86
---

## 1. MCP란 무엇인가  

### 1.1 정의 및 핵심 개념  
**Model Context Protocol (MCP)** 은 Anthropic이 2024 년 11월에 공개한 **오픈 표준 프로토콜**이다.  
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
- **통합 병목**: 기존 LLM‑외부 연동 방식은 서비스마다 비표준 API와 인증 로직을 구현해야 했다.  
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
| **TLS** | 모든 통신은 HTTPS(또는 WSS) 로 암호화. Let’s Encrypt 또는 클라우드‑관리 TLS 사용 |
| **Scope‑Based 권한** | 키당 허용된 Tool·Resource 목록을 `scope` 로 정의 (`read:file`, `invoke:weather_api` 등) |
| **조건부 액세스** | IP 화이트리스트, 시간대 제한, MFA 등 추가 정책을 IAM 레이어에서 적용 |
| **RBAC** | 조직·역할에 따라 서로 다른 API 키와 스코프를 발급 (`admin`, `developer`, `viewer` 등) |

#### 4.9.2 권한 최소화 (Least Privilege)  
1. **능력 선언 파일** (`agent-card.kya.json`)에 `allowed` 와 `denied` 리스트를 명시.  
2. 서버 시작 시 선언을 **검증**하고, 선언과 실제 플러그인 매핑이 일치하지 않을 경우 시작 차단.  
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

최근 **EUNO.NEWS**(2026‑02‑24) 보도에 따르면, MCP 권한 부여는 **요청 시점에 서버‑사이드에서 강제 적용**되는 것이 핵심이다. 아래는 **FastAPI** 기반 게이트웨이 미들웨어 구현 예시이다.

```python
# gateway.py
import jwt, time
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from typing import List

JWT_SECRET = "super-secret-key"
ALGORITHM = "HS256"

POLICIES = {
    "admin": {"allow": ["*"]},
    "agent": {"allow": ["read:file", "invoke:weather_api"]},
    "viewer": {"allow": ["read:file"]},
}

def verify_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
    except jwt.PyJWTError as e:
        raise HTTPException(status_code=401, detail="Invalid token") from e

def scope_allowed(scopes: List[str], required: str) -> bool:
    return required in scopes or "*" in scopes

class AuthorizationGateway(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        auth = request.headers.get("Authorization")
        if not auth or not auth.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Missing Bearer token")
        token = auth.split(" ", 1)[1]

        payload = verify_token(token)
        user_id = payload.get("sub")
        token_scopes = payload.get("scope", "").split()
        role = payload.get("role", "viewer")

        body = await request.json()
        tool_name = body.get("method", "").split(".")[-1]

        required_scope = {
            "weather.getCurrent": "invoke:weather_api",
            "file.read": "read:file",
            "file.write": "write:file",
        }.get(tool_name)

        if required_scope is None:
            raise HTTPException(status_code=400, detail="Unknown tool")

        if not scope_allowed(token_scopes, required_scope):
            raise HTTPException(status_code=403, detail="Scope insufficient")

        policy = POLICIES.get(role, {})
        if not scope_allowed(policy.get("allow", []), required_scope):
            raise HTTPException(status_code=403, detail="Role not permitted for this action")

        request.state.auth = {
            "user_id": user_id,
            "role": role,
            "scopes": token_scopes,
            "tool": tool_name,
            "allowed": True,
        }

        response = await call_next(request)
        return response
```

위 흐름은 **Casdoor**·**Logto**가 권장하는 *OAuth Scopes* 사용법과 **Self‑Logging Architecture**와 결합해 모든 허용·거부 이벤트를 영구 저장한다.

---

## 5. 멀티‑LLM 라우팅 사례  

### 5.1 배경 (EUNO.NEWS)  
2026 년 3 월, 한 개발자는 **Claude Code**, **Gemini**, **ChatGPT**, **Claude Web**, 그리고 **Cursor** 네 개의 AI 에이전트를 매일 사용한다. 기존에는 각 에이전트마다 별도의 MCP 설정 파일(`~/.claude.json`, `.cursor/mcp.json`, `dev‑mode UI`, `.gemini/settings.json`)을 유지해야 했으며, 토큰 교체·새 도구 추가 시 4‑5 번의 파일을 수정해야 하는 번거로움과 설정 오류 위험에 시달렸다.  

> “하나의 엔드포인트, 에이전트당 하나의 API 키. 모든 도구(GitHub, Slack, Cloudflare, Exa, DB…)가 즉시 제공되고 동일한 DLP 스캔·감사 로그가 적용된다.” – EUNO.NEWS  

MCP **Hub**(예: `https://mcp.mistaike.ai/hub_mcp`)를 도입하면 위 문제를 한 번에 해결한다.

### 5.2 구성 예시  

```yaml
# mcp-hub-config.yaml
hub:
  url: https://mcp.mistaike.ai/hub_mcp
agents:
  claude_code:
    apiKey: mk_XXXXXXXXXXXXXXXX
  gemini:
    apiKey: mk_YYYYYYYYYYYYYYYY
  chatgpt:
    apiKey: mk_ZZZZZZZZZZZZZZZZ
  cursor:
    apiKey: mk_AAAAAAAAAAAAAAAA
tools:
  - name: github
    type: api
    endpoint: https://api.github.com
    scopes: [repo, read:org]
  - name: slack
    type: webhook
    endpoint: https://hooks.slack.com/services/...
    scopes: [post:message]
  - name: cloudflare
    type: api
    endpoint: https://api.cloudflare.com/client/v4
    scopes: [dns:edit]
  - name: exa
    type: search
    endpoint: https://api.exa.ai
    scopes: [search:web]
  - name: custom-db
    type: sql
    dsn: postgres://user:pass@db.example.com:5432/app
    scopes: [read, write]
```

- **핵심**: 모든 에이전트는 위 파일에 있는 `hub.url` 과 자신에게 할당된 `apiKey` 만을 설정한다.  
- **도구 등록**은 한 번만 수행하면 **모든** 에이전트가 즉시 접근 가능한다.  
- **스코프**는 **키당** 정의되며, Hub는 요청 시 해당 스코프를 검증한다.

#### 5.2.1 에이전트별 설정 (예: Claude Code)  

```json
// ~/.claude.json
{
  "mcpServers": [
    {
      "url": "https://mcp.mistaike.ai/hub_mcp",
      "apiKey": "mk_XXXXXXXXXXXXXXXX"
    }
  ]
}
```

다른 에이전트는 동일한 `url` 과 자신에게 할당된 `apiKey` 만을 포함한다. 파일 경로는 각각의 에이전트가 요구하는 위치에 두면 된다.

### 5.3 인증 흐름  

1. **에이전트 시작** → `hub.url` 과 `apiKey` 로 MCP Hub에 연결.  
2. **요청 전** → 에이전트는 **JWT**(또는 단순 API 키) 를 포함해 `Authorization: Bearer <key>` 헤더 전송.  
3. **Hub**는  
   - TLS 로 암호화된 채널 확인  
   - 키를 **키‑스코프 매핑** 테이블과 대조  
   - 요청된 Tool(예: `github.repo.list`) 에 필요한 **스코프**가 키에 포함돼 있는지 검증  
   - 검증 성공 시 **JSON‑RPC** 요청을 내부 MCP Server 로 라우팅  
4. **MCP Server** → Tool 실행 → 결과 반환 → Hub → 에이전트에 전달  
5. **감사 로그** → Self‑Logging Architecture에 기록 (`user_id = 에이전트명`, `tool_name`, `success`, `duration` 등)  

> 이 흐름은 **EUNO.NEWS** 기사와 **Casdoor**·**Logto** 권장 인증 모델을 그대로 반영한다.

### 5.4 보안·DLP 고려사항  

| 영역 | 적용 내용 |
|------|-----------|
| **DLP 스캔** | 모든 Tool 호출은 **양방향 DLP 파이프라인**을 통과. 90 + 비밀 유형, 35 + PII 엔터티, 프롬프트 인젝션 탐지, 파괴 명령 차단이 적용된다. |
| **비밀 회전** | API 키 교체 시 Hub 대시보드에서 한 번만 업데이트하면, 모든 에이전트에 즉시 반영된다. |
| **프롬프트 인젝션 방어** | Hub는 응답에 포함된 프롬프트 인젝션 페이로드를 탐지하면 에이전트에 전달하기 전에 차단한다. |
| **멀티‑에이전트 일관성** | DLP 정책은 **전역**으로 정의되므로, 개별 에이전트마다 별도 설정이 필요 없다. |
| **감사 로그 연계** | Self‑Logging Architecture와 연동해 **tool_name**, **user_id**, **duration_ms**, **error_message** 등을 중앙 DB에 저장, Streamlit 대시보드에서 실시간 모니터링 가능. |
| **접근 제어** | 각 API 키는 **Scope‑Based** 권한을 갖고, 키당 허용된 Tool·Resource 목록을 최소화한다(Least Privilege). |
| **데이터 보존** | 로그는 최소 30 일 보관, 외부 볼륨에 마운트된 SQLite에 영구 저장. |

---

## 6. 프로토콜 개요 및 추가 프로토콜

### 6.1 전체 프로토콜 스펙  
AI 에이전트 생태계에서는 **여섯 가지 표준 프로토콜**이 상호 보완적으로 동작한다.

| 프로토콜 | 주요 목적 | 핵심 메시징 |
|----------|----------|--------------|
| **MCP** (Model Context Protocol) | LLM‑외부 컨텍스트 교환 | JSON‑RPC 2.0 |
| **A2A** (Agent‑to‑Agent) | 에이전트 간 데이터·명령 교환 | `a2a.<category>.<action>` |
| **UCP** (Universal Commerce Protocol) | 도매·공급망 거래 흐름 | `ucp.<category>.<action>` |
| **AP2** (Authorized Payment Protocol) | 안전한 결제·승인 | `ap2.<category>.<action>` |
| **A2UI** (Agent‑to‑User Interface) | 실시간 대시보드·UI | WebSocket 기반 이벤트 |
| **AG‑UI** (Agent‑Generated UI) | 최종 사용자 스트리밍 UI | HTTP / SSE |

아래에서는 **A2A**, **UCP**, **AP2**를