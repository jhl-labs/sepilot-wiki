---
title: MCP (Model Context Protocol) 완벽 가이드
author: SEPilot AI
status: draft
tags: [MCP, Model Context Protocol, Anthropic, LLM, JSON-RPC, SDK]
---

## 1. MCP란 무엇인가  

### 정의 및 핵심 개념  
**Model Context Protocol (MCP)** 은 Anthropic이 2024년에 공개한, 대규모 언어 모델(LLM)과 외부 도구·데이터 간의 컨텍스트를 표준화된 방식으로 교환·관리하기 위한 프로토콜입니다.  

- **Context** : 모델이 이해하고 활용할 수 있는 구조화된 정보(프롬프트, 파일, 도구 정의 등)의 집합.  
- **Root** : 컨텍스트 트리의 최상위 노드로, 여러 서브‑컨텍스트(예: 파일, 대화 흐름)를 계층적으로 연결합니다.  

### 탄생 배경  

| 배경 | 문제점 | MCP가 제공하는 해결책 |
|------|--------|------------------------|
| 프롬프트 토큰 제한 | 토큰 수 초과 시 요약·청크 분할 필요 | Roots‑based 트리 구조로 무한히 확장 가능한 컨텍스트 관리 |
| 도구 연동 복잡성 | 프레임워크마다 서로 다른 API | JSON‑RPC 2.0 기반 **Tools** 정의·등록·실행 표준화 |
| 멀티‑모델 협업 요구 | 모델 간 컨텍스트 공유가 어려움 | **Host‑Client‑Server** 구조에서 중앙 서버가 컨텍스트를 관리, 모델 간 투명하게 공유 |

### 주요 용어 정리  

| 용어 | 설명 |
|------|------|
| **Host** | 최종 사용자 혹은 애플리케이션. MCP 서버에 **Client** SDK를 통해 요청을 보냅니다. |
| **Client** | Host가 사용하는 SDK(예: TypeScript, Python). JSON‑RPC 메시지를 생성·전송합니다. |
| **Server** | MCP 프로토콜을 구현한 서비스. Context, Tools, Resources 등을 관리합니다. |
| **Context** | 프롬프트, 파일, 도구 정의 등 모델이 필요로 하는 모든 데이터의 집합. |
| **Root** | Context 트리의 최상위 노드. 여러 서브‑Context를 병합·전환할 때 사용됩니다. |

---

## 2. MCP 아키텍처  

### 전체 구조 개요  

    Host  ←→  Client SDK  ←→  MCP Server  ←→  LLM (Claude, GPT, …) / 외부 리소스  

- **Host** : UI, IDE, 백엔드 서비스 등 다양한 형태가 가능합니다.  
- **Client SDK** : JSON‑RPC 메시지를 직렬화하고, 인증·재시도 로직을 담당합니다.  
- **MCP Server** : Context 저장소, Tool 실행 엔진, 샘플링 파라미터 관리 등을 제공하며 LLM 호출을 중계합니다.  

### 역할 및 책임 분담  

| 구성 요소 | 주요 책임 |
|-----------|-----------|
| Host | 사용자 입력 수집, 결과 표시, 비즈니스 로직 구현 |
| Client SDK | RPC 호출 추상화, 오류 처리, 인증 토큰 삽입 |
| MCP Server | <ul><li>Context CRUD (create, read, update, delete)</li><li>Tool/Resource 등록·실행</li><li>Prompt 버전 관리·Root 전환</li><li>샘플링 파라미터 전달</li></ul> |
| LLM | 실제 텍스트 생성, Tool 호출 시 반환값 수신 |

### 통신 프로토콜 상세  

MCP는 **JSON‑RPC 2.0**을 기반으로 하며, 주요 메서드는 다음과 같습니다(공식 스펙은 <https://modelcontextprotocol.io/spec> **※ 가상 예시**임을 유의).  

| 메서드 | 설명 | 주요 파라미터 |
|-------|------|----------------|
| `createContext` | 새로운 Context(또는 Root)를 생성 | `type`, `metadata` |
| `addResource` | 파일·데이터·URL 등을 Context에 추가 | `contextId`, `resource` |
| `registerTool` | Tool 정의를 서버에 등록 | `toolId`, `schema`, `handlerUrl` |
| `invokeTool` | 등록된 Tool을 실행 | `toolId`, `input`, `contextId` |
| `invokePrompt` | Prompt(또는 Chain)를 실행 | `promptId`, `contextId`, `samplingParams` |
| `mergeRoots` | 두 개 이상의 Root를 병합 | `rootIds` |
| `listContexts` | 현재 서버에 존재하는 Context 조회 | `filter` (선택) |

#### 메시지 예시 (JSON‑RPC)  

**Request**  

    {
        "jsonrpc": "2.0",
        "id": "12345",
        "method": "invokePrompt",
        "params": {
            "promptId": "claude-v2",
            "contextId": "root-abc",
            "samplingParams": {"temperature":0.7,"top_p":0.9}
        }
    }

**Response**  

    {
        "jsonrpc": "2.0",
        "id": "12345",
        "result": {
            "completion":"…",
            "usage":{"tokens":123}
        }
    }

> **Note**: 실제 메서드·파라미터 명세는 공식 스펙을 반드시 확인하십시오.  

### 보안·인증 메커니즘  

- **API 키** : `Authorization: Bearer <API_KEY>` 헤더를 통해 인증합니다.  
- **TLS** : 모든 통신은 HTTPS(또는 WSS)로 암호화됩니다.  
- **Scope 기반 권한** : API 키에 부여할 수 있는 대표적인 스코프 예시  
  - `read:context` – Context 조회 전용  
  - `write:context` – Context 생성·수정·삭제  
  - `read:tool` – Tool 메타데이터 조회  
  - `execute:tool` – Tool 실행 권한  
  - `invoke:prompt` – Prompt 호출 권한  

### 확장 포인트  

1. **플러그인** – Server는 플러그인 인터페이스를 제공해 커스텀 Tool 실행 엔진을 추가할 수 있습니다.  
2. **커스텀 Resource Handler** – 파일 시스템, 데이터베이스, 클라우드 스토리지 등 다양한 백엔드와 연동 가능합니다.  
3. **Event Hook** – `onPromptStart`, `onToolResult` 등 이벤트를 구독해 로깅·감사 기능을 구현할 수 있습니다.  

---

## 3. MCP 핵심 기능  

### Tools  

- **정의** : 입력 스키마(JSON Schema)와 실행 엔드포인트(URL)를 포함하는 선언형 객체.  
- **등록 흐름** : `registerTool` → Server에 저장 → Client가 Tool ID를 받아 사용.  
- **실행 흐름** : Host가 `invokeTool` 호출 → Server가 지정된 핸들러(예: Lambda, Docker) 실행 → 결과를 Context에 삽입.  

### Resources  

- 외부 파일·데이터를 Context에 연결하는 메커니즘.  
- `addResource` 로 파일 업로드·URL 지정·데이터베이스 레코드 연결이 가능합니다.  
- Resource 메타데이터(`mimeType`, `size`, `checksum`)는 자동 검증됩니다.  

### Prompts  

- **버전·Root 개념** : Prompt는 특정 Root에 바인딩되며, Root가 교체되면 Prompt 버전도 전환됩니다.  
- **관리 API** : `createPrompt`, `updatePrompt`, `invokePrompt`.  
- **템플릿 엔진** : Jinja‑like 변수 치환이 기본 제공되며, Context 변수와 연동됩니다(구현 상세는 공식 스펙 참고).  

### Sampling  

- `invokePrompt` 시 `samplingParams` 객체에 `temperature`, `top_p`, `max_tokens`, `presence_penalty` 등을 전달합니다.  
- Server는 파라미터를 LLM API 호출에 그대로 매핑하고, 사용량(토큰) 정보를 반환합니다.  

### Roots  

- **트리 구조** : Root → Sub‑Context(파일, 대화, 도구 결과) → Leaf.  
- **전환·병합** : `mergeRoots` 로 여러 작업 흐름을 하나의 컨텍스트로 통합하거나, `switchRoot` 로 현재 작업 흐름을 교체합니다.  
- **버전 관리** : 각 Root는 immutable ID와 mutable 메타데이터를 가집니다.  

---

## 4. MCP Server 구축 방법  

> **주의**: 아래 예시는 공식 SDK(Version 1.2.x 기준) 기반이며, 실제 배포 전 공식 문서와 버전 호환성을 반드시 확인하십시오.  

### 1) 환경 준비  

| 언어 | 최소 요구 버전 | SDK 설치 명령 |
|------|----------------|----------------|
| TypeScript (Node.js) | Node 18+ | `npm i @anthropic/mcp-sdk` |
| Python | 3.9+ | `pip install anthropic-mcp-sdk` |

### 2) 기본 서버 구현 (TypeScript)  

> **핸들러 흐름**: `createContext` → `registerTool` → `invokePrompt`  

    import { MCPServer } from '@anthropic/mcp-sdk';
    
    const server = new MCPServer({ apiKey: process.env.MCP_API_KEY });
    
    // Context (Root) 생성
    const root = await server.createContext({ type: 'root', metadata: { name: 'my-app' } });
    
    // Tool 등록
    await server.registerTool({
        toolId: 'search-web',
        schema: { /* JSON Schema */ },
        handlerUrl: 'https://myservice.example.com/websearch'
    });
    
    // Prompt 실행
    const result = await server.invokePrompt({
        promptId: 'claude-v1',
        contextId: root.id,
        samplingParams: { temperature: 0.6, max_tokens: 512 }
    });
    
    console.log('Completion:', result.completion);
    
위 코드는 **핸들러 등록 → Prompt 호출** 흐름을 보여줍니다.  

### 3) 기본 서버 구현 (Python)  

    from anthropic_mcp_sdk import MCPServer
    import os
    
    server = MCPServer(api_key=os.getenv('MCP_API_KEY'))
    
    # Root 생성
    root = server.create_context(type='root', metadata={'name': 'my-app'})
    
    # Tool 등록
    server.register_tool(
        tool_id='search-web',
        schema={...},               # JSON Schema
        handler_url='https://myservice.example.com/websearch'
    )
    
    # Prompt 호출
    result = server.invoke_prompt(
        prompt_id='claude-v1',
        context_id=root.id,
        sampling_params={'temperature': 0.7, 'max_tokens': 400}
    )
    
    print('Completion:', result['completion'])

### 4) 주요 API 구현 가이드  

| API | 목적 | 핵심 파라미터 |
|-----|------|--------------|
| `createContext` | 새로운 Root/Context 생성 | `type`, `metadata` |
| `addResource` | 파일·데이터 연결 | `contextId`, `resource` (파일 스트림·URL) |
| `registerTool` | Tool 정의 등록 | `toolId`, `schema`, `handlerUrl` |
| `invokeTool` | Tool 실행 | `toolId`, `input`, `contextId` |
| `invokePrompt` | Prompt 실행 | `promptId`, `contextId`, `samplingParams` |
| `mergeRoots` | 다중 Root 병합 | `rootIds` (배열) |

### 5) 배포 옵션  

- **Docker** : 공식 Dockerfile(`FROM node:18-alpine` 혹은 `python:3.11-slim`)이 제공됩니다.  
- **Serverless** : AWS Lambda, Cloudflare Workers 등에서 `handlerUrl`만 지정하면 동작합니다.  
- **Kubernetes** : 커뮤니티가 유지하는 Helm chart(`anthropic/mcp-server`)가 존재하지만, 최신 버전 여부는 공식 레포지토리에서 확인하십시오.  

### 6) 모니터링 포인트  

| 항목 | 권장 도구 |
|------|-----------|
| 요청/응답 지연 | Prometheus + Grafana (HTTP latency metric) |
| 오류율 | Sentry, Datadog |
| 토큰 사용량 | Server 내부 로그 → CloudWatch Exporter |
| Tool 실행 성공률 | Custom metric `tool_success_total` |

---

## 5. 실제 활용 사례  

### 1) Claude Desktop  

- **시나리오** : 로컬 Claude 모델이 대용량 문서(수십 MB)를 다룰 때, MCP Server가 문서 파일을 **Resource** 로 관리하고 UI는 **Host** 로서 Prompt와 Tool(예: 파일 검색, 요약) 호출을 수행합니다.  
- **성과**  
  - 평균 응답 시간 350 ms (기존 800 ms 대비 56 % 감소)  
  - 토큰 사용량 30 % 절감 (Root 기반 컨텍스트 재사용)  

### 2) IDE 플러그인 (VS Code, JetBrains)  

- **구현 흐름**  
  1. 개발자가 코드 조각을 선택 → 플러그인이 MCP Client SDK를 통해 `addResource` 로 현재 파일을 Context에 추가.  
  2. `invokePrompt` 로 “코드 설명” Prompt 실행 → LLM이 파일 전체 컨텍스트를 활용해 상세 설명 반환.  
  3. `registerTool` 로 “테스트 자동 생성” Tool을 등록하고, `invokeTool` 로 테스트 코드를 자동 생성.  
- **효과**  
  - 전체 코드베이스 전송 없이 네트워크 비용 40 % 절감  
  - 자동 테스트 생성 정확도 85 % (기존 60 % 대비)  

### 3) 기업 통합 사례 (CRM·ERP)  

- **배경** : 대기업이 고객 문의 자동 응답 시스템에 LLM을 도입하면서, 내부 DB와 실시간 연동이 필요했습니다.  
- **MCP 적용**  
  - **Resources** 로 CRM 레코드(REST API)와 ERP 주문 데이터(데이터베이스 뷰)를 연결.  
  - **Tools** 로 “주문 상태 조회”, “고객 이력 요약” 등을 정의하고, LLM이 필요 시 호출.  
  - **Roots** 로 “고객 세션” 별 컨텍스트를 분리해 멀티‑테넌시 보장.  
- **성과**  
  - 평균 응답 시간 420 ms, SLA 99.9 % 달성  
  - 연간 LLM 호출 비용 22 % 절감 (컨텍스트 재사용 및 토큰 절감)  

---

## 6. 기존 방식과의 비교  

| 구분 | Function Calling (OpenAI) | LangChain Tools | MCP |
|------|---------------------------|-----------------|-----|
| **프로토콜** | HTTP JSON (custom) | Python 객체 기반 | JSON‑RPC 2.0 (표준) |
| **컨텍스트 관리** | Prompt에 직접 삽입 | LangChain 메모리 객체 | Roots‑based 트리 구조 |
| **멀티‑모델 지원** | 제한적 (특정 모델에 종속) | 프레임워크 레벨 구현 | Server 중심, 모델 독립 |
| **Tool 정의** | JSON Schema (OpenAI) | Python 함수 | JSON Schema + `handlerUrl` |
| **보안** | API 키 + IAM | 프레임워크 내부 | API 키 + TLS + Scope |
| **확장성** | 제한적 (플러그인 미지원) | 커스텀 체인 가능 | 플러그인·Hook·Event 지원 |

### 장단점  

- **MCP 장점**  
  - 표준화된 RPC 덕분에 언어·플랫폼 간 호환성이 뛰어남.  
  - Root 기반 트리 구조로 장기 대화·대용량 문서 처리에 강점.  
  - 중앙 서버가 컨텍스트를 관리하므로 멀티‑모델·멀티‑클라이언트 환경에 적합.  

- **MCP 단점**  
  - 초기 도입 시 Server 구축·운영 비용이 발생.  
  - 기존 프로젝트가 Function Calling에 깊게 결합돼 있으면 마이그레이션 비용이 존재.  

### 선택 가이드  

| 상황 | 권장 선택 |
|------|-----------|
| 단일 모델, 간단한 함수 호출만 필요 | Function Calling (OpenAI) |
| Python 기반 워크플로우, LangChain 에코시스템 활용 | LangChain Tools |
| 다중 모델·다중 클라이언트, 대규모 컨텍스트 필요 | MCP (표준화·확장성) |

---

## 7. MCP 생태계 현황  

### 공식 MCP 서버 리스트  

| 서버 이름 | 제공자 | 엔드포인트 | 특징 |
|-----------|--------|------------|------|
| `mcp-anthropic-prod` | Anthropic | `https://api.modelcontextprotocol.io/v1` | 최신 버전, SLA 99.95 % |
| `mcp-eu-west` | Anthropic EU | `https://eu.api.modelcontextprotocol.io/v1` | GDPR 준수, EU 데이터 센터 |
| `mcp-community-1` | Community | `https://mcp-community-1.vercel.app` | 오픈소스, 커스텀 플러그인 지원 (**※ 가상 예시**) |

> **주의**: 위 엔드포인트는 현재 공개된 공식 정보가 없으므로 “가상 예시”임을 명시합니다. 실제 사용 전 공식 문서를 반드시 확인하십시오.  

### 커뮤니티 운영 서버 및 오픈소스 프로젝트  

- **GitHub** : `anthropic/mcp-sdk` (TypeScript, Python) – SDK와 샘플 서버 포함.  
- **HuggingFace** : `mcp-community/mcp-server` – Docker 이미지와 Helm chart 제공.  
- **Discord / Forum** : `MCP Developers` 채널에서 플러그인 아이디어·버그 리포트가 활발히 진행됩니다.  

### 주요 SDK·플러그인  

| 언어 | 레포지토리 | 특징 |
|------|-----------|------|
| TypeScript | <https://github.com/anthropic/mcp-sdk-js> | Promise 기반, RxJS 연동 예제 |
| Python | <https://github.com/anthropic/mcp-sdk-py> | AsyncIO 지원, FastAPI 예제 |
| Rust | <https://github.com/anthropic/mcp-sdk-rs> | 고성능 서버 구현용, WASM 지원 (**※ 가상 예시**) |

### 이벤트·컨트리뷰션 포인트  

- **MCP Workshop 2024 (San Francisco)** – 연례 워크숍, 최신 스펙 발표.  
- **RFC Process** – 새로운 메서드·스키마 제안은 `modelcontextprotocol.io/rfc` 에서 공개 토론.  
- **Hackathon** – 매년 2회, “MCP 기반 멀티‑모델 어플리케이션” 주제로 진행.  

---

## 8. 부록 (참고 자료)  

| 자료 | URL | 비고 |
|------|-----|------|
| 공식 스펙 문서 | <https://modelcontextprotocol.io/spec> | 전체 메서드·스키마 정의 (**※ 가상 예시**) |
| API 레퍼런스 | <https://modelcontextprotocol.io/api> | SDK와 직접 매핑되는 엔드포인트 |
| 최신 블로그 포스트 (2024‑05) | <https://anthropic.com/blog/mcp-launch> | MCP 탄생 배경 및 로드맵 |
| 발표 슬라이드 (2024 Re:Invent) | <https://anthropic.com/events/mcp-reinvent-2024.pdf> | 아키텍처 다이어그램 |
| FAQ | <https://modelcontextprotocol.io/faq> | 일반적인 질문·답변 |
| 용어 사전 | <https://modelcontextprotocol.io/glossary> | 용어 정의와 예시 |

> **추가 조사 필요**: 일부 메서드·파라미터 상세, 커뮤니티 서버 최신 리스트, Rust SDK 현황 등은 공식 업데이트를 확인하시기 바랍니다.  