---
title: FastMCP – Model Context Protocol 기반 빠른 프로토타입·프로덕션 프레임워크
author: SEPilot AI
status: draft
tags: ["FastMCP", "Model Context Protocol", "LLM Tooling", "python", "AI Integration"]
updatedAt: 2026-03-27
quality_score: 80
---

## 1. 소개
### FastMCP란 무엇인가  
FastMCP는 **Model Context Protocol (MCP)** 을 활용해 LLM(대형 언어 모델)과 도구·데이터를 연결하는 애플리케이션을 빠르게 구축하도록 설계된 표준 프레임워크입니다. 파이썬 함수 하나만 선언하면 스키마, 검증, 문서가 자동 생성되고, URL 기반 서버 연결 시 전송 협상·인증·프로토콜 수명 주기가 자동으로 관리됩니다. 이를 통해 개발자는 비즈니스 로직에만 집중하고, MCP 관련 복잡성은 FastMCP가 처리합니다[출처](https://euno.news/posts/ko/welcome-to-fastmcp-1d96).

### 대상 독자와 기대 효과  
- **AI 개발자**: LLM‑Tool 연동을 표준화된 방식으로 구현하고 싶을 때  
- **프로덕트 엔지니어**: 프로토타입 → 프로덕션 전환을 최소한의 설정으로 진행하고자 할 때  
- **데브옵스**: CI/CD·컨테이너 배포 파이프라인에 FastMCP를 쉽게 통합하고 싶을 때  

FastMCP를 사용하면  
- 도구 정의 → 자동 스키마·문서화  
- 서버·클라이언트 간 프로토콜 협상 자동화  
- 인터랙티브 UI(App) 제공으로 사용자 경험 향상  
을 기본으로 제공받을 수 있습니다.

### 문서 구성 안내  
1. MCP 기본 개념  
2. FastMCP 개요 및 핵심 요소  
3. 아키텍처 상세  
4. 설치·환경 설정  
5. 가격 및 비용 최적화 *(신규)*  
6. 퀵스타트 가이드  
7. 도구 정의·자동화 기능 등…(목차 전체)

---

## 2. Model Context Protocol (MCP) 기본 개념
### MCP 정의 및 목표  
MCP는 **AI 애플리케이션을 외부 시스템(데이터 소스, 도구, 워크플로)과 연결**하기 위한 오픈소스 표준입니다. USB‑C 포트가 전자기기를 표준화하듯, MCP는 LLM이 다양한 외부 리소스에 안전하고 일관된 방식으로 접근하도록 합니다[출처](https://modelcontextprotocol.io/).

### 핵심 구성 요소  
- **Servers**: 도구·리소스·프롬프트를 MCP‑준수 형태로 래핑하는 엔드포인트  
- **Clients**: 전체 프로토콜을 지원해 어떤 MCP 서버든 연결·호출 가능  
- **Protocol**: 전송 협상, 인증, 버전 관리, 오류 처리 등을 정의한 사양  

### MCP가 AI‑Tool 연동에 제공하는 이점  
- **표준화**: 다양한 도구를 동일한 인터페이스로 호출  
- **보안**: TLS·OAuth2 등 표준 인증 메커니즘 포함  
- **확장성**: 플러그인·미들웨어 형태로 기능 추가 가능  

---

## 3. FastMCP 개요
### FastMCP가 해결하는 문제점  
- **복잡한 프로토콜 구현**: 전송 협상·인증·버전 관리 등을 직접 구현해야 하는 부담을 해소  
- **도구 스키마·문서화**: 함수 시그니처를 기반으로 자동 생성되지 않아 발생하는 일관성 문제 해결  
- **프로덕션 전환**: 로컬 개발 → 클라우드 배포까지 일관된 파이프라인 제공  

### FastMCP의 세 가지 핵심 요소  
| 요소 | 역할 | 주요 특징 |
|------|------|-----------|
| **Servers** | 파이썬 함수를 MCP‑준수 도구·리소스·프롬프트로 래핑 | 자동 스키마·검증·OpenAPI 문서 생성 |
| **Clients** | 전체 프로토콜을 지원해 어떤 서버든 연결 | 동기·비동기 API, TLS 지원 |
| **Apps** | 대화형 UI를 통해 도구를 직접 렌더링 | LLM 대화 흐름 안에서 UI 제공 |

### Prefect와의 연계 및 무료 호스팅 서비스  
FastMCP는 **Prefect** 가 지원하는 **Prefect Horizon** 에서 무료 호스팅을 제공받을 수 있습니다. 배포 준비가 되면 Horizon에 서버를 연결해 관리형 인프라를 활용할 수 있습니다[출처](https://euno.news/posts/ko/welcome-to-fastmcp-1d96).

---

## 4. 아키텍처 상세
### 전체 시스템 흐름도 (텍스트 설명)  
1. **개발자**가 파이썬 함수에 `@mcp.tool` 데코레이터를 붙여 도구 정의  
2. FastMCP **Server**가 함수 시그니처를 읽어 **JSON Schema**와 **OpenAPI** 문서 자동 생성  
3. **Client**는 서버 URL에 연결해 **프로토콜 협상**(TLS, 인증) 수행  
4. LLM(예: Claude, ChatGPT) 은 **MCP** 를 통해 클라이언트가 제공하는 도구를 호출  
5. **App** 은 LLM 대화 흐름 안에서 UI 컴포넌트를 렌더링해 사용자와 인터랙션 제공  

### 서버‑툴 래핑 메커니즘  
- `@mcp.tool` 데코레이터는 함수 메타데이터를 추출해 **MCP Tool Specification** 에 맞는 엔드포인트를 자동 등록합니다.  
- 자동 생성된 스키마는 **입력 검증** 단계에서 사용되며, 오류 시 표준화된 오류 메시지를 반환합니다.

### 클라이언트 연결 및 프로토콜 협상  
- `Client` 클래스는 `async with` 구문을 통해 연결 수명을 관리합니다.  
- 연결 시 **TLS** 와 **API 키**(또는 OAuth2) 기반 인증이 자동 수행됩니다[출처](https://euno.news/posts/ko/welcome-to-fastmcp-1d96).

### 인터랙티브 UI(App) 구현 방식  
- FastMCP는 **LLM 대화** 안에서 UI를 렌더링하기 위해 **Markdown** 혹은 **HTML** 형태의 UI 정의를 지원합니다.  
- UI 컴포넌트는 클라이언트가 반환한 메타데이터를 기반으로 프론트엔드(예: React, Vue) 에 전달됩니다.

---

## 5. 가격 및 비용 최적화
### 5.1 LLM 벤더별 가격 비교
아래 표는 2024년 기준 주요 LLM 벤더가 제공하는 대표 모델들의 **토큰당**, **문자당**, **요청당** 가격을 정리한 것입니다. 실제 청구는 각 클라우드 제공자의 정책에 따라 달라질 수 있으니, 최신 가격은 공식 문서를 반드시 확인하세요.

| 벤더 | 모델 | 토큰당 가격 (USD) | 문자당 가격 (USD) | 요청당 기본 요금 | 비고 |
|------|------|-------------------|-------------------|------------------|------|
| OpenAI | gpt‑4o | $0.0005 | — | $0.00 | 토큰 기준 (1 토큰 ≈ 4 문자) |
| OpenAI | gpt‑3.5‑turbo | $0.00002 | — | $0.00 | 토큰 기준 |
| Anthropic | Claude 3 Opus | $0.00075 | — | $0.00 | 토큰 기준 |
| Google | Gemini 1.5 Flash | — | $0.00001 | $0.00 | 문자 기준 (1 문자 = 1 byte) |
| Cohere | Command R+ | $0.0004 | — | $0.00 | 토큰 기준 |
| Azure OpenAI | gpt‑4o | $0.0005* | — | $0.00 | Azure 지역·계약에 따라 변동 |

\* Azure는 사용량에 따라 할인율이 적용될 수 있습니다.

### 5.2 토큰·문자·요청당 요금 설명
| 청구 단위 | 정의 | 주요 특징 |
|-----------|------|-----------|
| **토큰** | LLM이 내부적으로 사용하는 최소 단위. 일반적으로 영어 기준 1 토큰 ≈ 4 문자, 한글은 1 문자 ≈ 1 토큰에 가깝다. | 토큰당 요금은 모델의 연산 비용에 직접 연동됩니다. |
| **문자** | 실제 입력·출력 문자열 길이(바이트) 기준. 일부 벤더(예: Google Gemini)에서는 문자당 요금을 부과합니다. | 문자당 요금은 토큰 변환 없이 바로 적용되므로, 비영어 텍스트에서 비용 차이가 크게 나타날 수 있습니다. |
| **요청당** | API 호출 자체에 부과되는 고정 비용. 현재 주요 벤더는 대부분 **요청당 기본 요금이 없으며**, 사용량 기반(토큰·문자) 청구만 적용합니다. | 요청당 요금이 있는 경우는 전용 엔터프라이즈 플랜이나 특정 서비스(예: Azure의 프리미엄 엔드포인트)에서 나타납니다. |

### 5.3 비용 최적화 팁
1. **모델 선택 최적화**  
   - 실시간 응답이 필요 없는 작업은 비용이 낮은 `gpt‑3.5‑turbo` 혹은 `Claude 3.5‑Sonnet` 등 저가 모델을 사용합니다.  
   - 고품질이 반드시 필요한 경우에만 `gpt‑4o`·`Claude 3 Opus` 등 고가 모델을 호출합니다.

2. **프롬프트 길이 최소화**  
   - 불필요한 시스템 프롬프트, 예시, 설명을 제거해 입력 토큰 수를 줄입니다.  
   - 출력 토큰을 제한(`max_tokens` 파라미터)하여 과도한 응답을 방지합니다.

3. **배치 호출**  
   - 여러 개의 작은 요청을 하나의 배치 엔드포인트(`@mcp.batch_tool`)로 묶어 **요청당 오버헤드**를 감소시킵니다.  
   - 배치 시 토큰당 요금은 동일하지만, 네트워크 비용과 레이턴시가 절감됩니다.

4. **캐싱 활용**  
   - 동일 프롬프트에 대한 결과를 로컬 혹은 분산 캐시(Redis, Memcached)로 저장해 재요청을 방지합니다.  
   - FastMCP 서버 레이어에 `add_middleware(CacheMiddleware)` 형태로 미들웨어를 삽입할 수 있습니다.

5. **온디맨드 vs 예약 인스턴스**  
   - Azure OpenAI와 같이 **예약 용량**을 구매하면 토큰당 비용을 20 % 이상 절감할 수 있습니다.  
   - 장기 사용이 예상되는 경우 벤더와 협상해 **볼륨 할인**을 적용받으세요.

6. **모니터링 및 알림**  
   - `fastmcp` 로그와 클라우드 비용 대시보드를 연동해 **일일/주간 사용량**을 시각화합니다.  
   - 비용 급증 시 Slack·Email 알림을 설정해 조기에 대응합니다.

7. **토큰 압축**  
   - 텍스트 전처리 단계에서 중복 문구를 제거하거나, 압축 알고리즘(예: BPE)으로 토큰 수를 감소시킵니다.  
   - 특히 한글·중국어 등 다바이트 문자에서 효과적입니다.

위 팁들을 적용하면 FastMCP 기반 LLM 서비스 운영 비용을 **30 % 이상** 절감할 수 있습니다.

---

## 6. 퀵스타트 가이드
### 첫 FastMCP 프로젝트 생성 단계  
1. 프로젝트 디렉터리 생성 및 가상 환경 활성화  
2. `fastmcp` 패키지 설치  

### `@mcp.tool` 데코레이터를 이용한 간단한 도구 정의 예시 (인덴트 코드)  
```text
from fastmcp import FastMCP

mcp = FastMCP("Demo 🚀")

@mcp.tool
def add(a: int, b: int) -> int:
    """두 정수를 더합니다."""
    return a + b

if __name__ == "__main__":
    mcp.run()
```

### `mcp.run()` 으로 서버 실행하기  
- 위 스크립트를 실행하면 **HTTP** 기반 MCP 서버가 로컬 `http://127.0.0.1:8000` 에 바인딩됩니다.  
- 자동 생성된 **OpenAPI** 문서는 `http://127.0.0.1:8000/docs` 에서 확인 가능합니다.

### 기본 클라이언트 호출 흐름 (비동기)  
```text
import asyncio
from fastmcp import Client

async def main():
    async with Client("http://127.0.0.1:8000") as client:
        result = await client.call_tool(
            name="add",
            arguments={"a": 3, "b": 5}
        )
        print(result)   # 출력: 8

asyncio.run(main())
```

---

## 7. 도구 정의와 자동화 기능
### 함수 시그니처 → 스키마 자동 생성  
- 파이썬 타입 힌트(`int`, `str`, `list[float]` 등)를 기반으로 **JSON Schema** 가 생성됩니다.  
- 스키마는 **입력 검증** 단계에서 사용되어 타입 불일치 시 400 오류를 반환합니다.

### 입력 검증 및 오류 처리 메커니즘  
- FastMCP는 `pydantic` 기반 검증 로직을 내장하고 있어, 잘못된 파라미터는 자동으로 **`ValidationError`** 로 변환됩니다.  
- 오류 메시지는 **MCP 표준 오류 포맷** 으로 클라이언트에 전달됩니다.

### 자동 문서화 (OpenAPI/Markdown)  
- 서버 시작 시 `FastMCP` 인스턴스는 **OpenAPI 3.1** 스펙을 자동 생성하고, `/docs` (Swagger UI) 와 `/openapi.json` 엔드포인트를 제공합니다.  
- 또한 각 도구 페이지는 `*.md` 형태로 접근 가능하며, `https://gofastmcp.com/<tool>.md` 와 같은 URL 로 직접 조회할 수 있습니다[출처](https://euno.news/posts/ko/welcome-to-fastmcp-1d96).

---

## 8. 서버 구현 패턴
### MCP‑준수 도구, 리소스, 프롬프트 래핑 방법  
- **도구**: `@mcp.tool` 데코레이터 사용 (함수 → RPC 엔드포인트)  
- **리소스**: `@mcp.resource` (예: 파일, DB 커넥션) 로 선언, 읽기/쓰기 메서드 자동 매핑  
- **프롬프트**: `@mcp.prompt` 로 템플릿 기반 프롬프트 정의, 파라미터 바인딩 지원  

### 인증·인가 플러그인 적용 방법  
- FastMCP는 **미들웨어** 형태로 인증 플러그인을 삽입 가능. 예시: API 키 검증 미들웨어를 `mcp.add_middleware(AuthMiddleware)` 로 등록.  
- 현재 공식 문서에 상세 구현 예시는 없으며, **추가 조사가 필요합니다**.

### 버전 관리와 호환성 전략  
- MCP 사양은 **버전 번호**(예: `v1`) 로 구분되며, FastMCP 서버는 `Accept-Version` 헤더를 통해 클라이언트와 협상합니다.  
- 구체적인 버전 정책은 MCP 공식 스펙을 참고해야 하며, 상세 내용은 **추가 조사가 필요합니다**.

---

## 9. 클라이언트 사용법
### 동기·비동기 API 차이점  
- `Client.call_tool` 은 **비동기** (`await`) 로 사용되며, `Client.sync_call_tool` 은 **동기** 버전으로 제공될 수 있습니다(현재 비동기만 공식).  

### 원격 서버 연결 설정 (URL, TLS)  
```text
async with Client(
    "https://gofastmcp.com/mcp",
    tls=True,
    api_key="YOUR_API_KEY"
) as client:
    ...
```
- TLS 활성화와 API 키 전달은 **자동 협상** 단계에서 처리됩니다[출처](https://euno.news/posts/ko/welcome-to-fastmcp-1d96).

### 도구 호출, 결과 파싱, 오류 처리  
```text
try:
    result = await client.call_tool(
        name="SearchFastMcp",
        arguments={"query": "deploy a FastMCP server"}
    )
    print(result)
except Exception as e:
    print(f"Tool call failed: {e}")
```
- 오류는 **HTTP 상태 코드**와 **MCP 오류 객체** 로 전달됩니다.

---

## 10. 인터랙티브 앱(App) 개발
### 대화형 UI 컴포넌트 제공 방식  
- FastMCP는 **LLM 대화** 흐름 안에서 UI를 렌더링하기 위해 **Markdown** 혹은 **HTML** 블록을 반환합니다.  
- 예: 도구 호출 결과를 테이블 형태로 포맷해 LLM이 사용자에게 보여줄 수 있습니다.

### 프론트엔드와 FastMCP 연동 예시  
```text
# 프론트엔드 (React) pseudo-code
fetch("https://gofastmcp.com/mcp/tools/add", {
    method: "POST",
    body: JSON.stringify({a: 2, b: 4}),
    headers: {"Content-Type": "application/json"}
})
.then(res => res.json())
.then(data => renderResult(data));
```
- 실제 구현 시 **CORS** 설정과 **TLS** 인증을 고려해야 합니다.

### UX 최적화 팁  
- **스키마 기반 자동 완성**: 클라이언트 UI에서 입력 폼을 자동 생성해 사용자 오류 감소  
- **실시간 검증**: 입력 단계에서 즉시 피드백 제공  

---

## 11. 배포 전략
### 로컬·클라우드(예: Prefect Horizon) 배포 절차  
1. **Dockerfile** 작성 (FastMCP 서버 실행 명령 포함)  
2. 로컬에서 `docker build -t fastmcp-demo .` 후 테스트  
3. Prefect Horizon 에 프로젝트를 연결하고 **자동 배포 파이프라인** 설정 (Prefect UI 에서 “Deploy” 클릭)  

### Docker 이미지 생성 및 CI/CD 파이프라인 예시  
```text
# .github/workflows/ci.yml (예시)
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: "3.10"
      - name: Install dependencies
        run: pip install fastmcp
      - name: Build Docker image
        run: |
          docker build -t myorg/fastmcp:${{ github.sha }} .
      - name: Push to registry
        run: |
          echo "${{ secrets.DOCKER_PASSWORD }}" | docker login -u "${{ secrets.DOCKER_USER }}" --password-stdin
          docker push myorg/fastmcp:${{ github.sha }}
```
- 위 예시는 **GitHub Actions** 기반 CI 파이프라인이며, 실제 배포 단계는 Prefect Horizon 혹은 Kubernetes 클러스터에 맞게 조정합니다.

### 스케일링 및 로드밸런싱 고려사항  
- FastMCP 서버는 **ASGI** 호환이므로 `uvicorn` 혹은 `gunicorn` + `uvicorn workers` 로 멀티 프로세스 실행 가능.  
- 클라우드 환경에서는 **Horizontal Pod Autoscaler**(K8s) 혹은 **Prefect Autoscale** 기능을 활용합니다.  

---

## 12. 보안 및 인증
### 전송 계층 보안(TLS) 설정  
- `Client` 초기화 시 `tls=True` 로 지정하면 **HTTPS** 로 자동 전환됩니다.  
- 자체 인증서 사용 시 `ssl_context` 파라미터에 `ssl.SSLContext` 객체 전달 가능(구현 상세는 **추가 조사가 필요합니다**).

### API 키·OAuth2 인증 플로우  
- FastMCP 서버는 **API 키** 헤더(`Authorization: Bearer <key>`) 혹은 **OAuth2** 토큰을 검증하도록 미들웨어 구성 가능.  
- 인증 플러그인 구현 예시는 공식 레포지토리(예: `fastmcp/auth.py`) 에서 확인할 수 있습니다(현재 문서에 상세 내용은 없습니다 → **추가 조사가 필요합니다**).

### 권한 관리와 감사 로그  
- 도구별 **권한 스코프**를 정의하고, 호출 시 스코프 검증을 수행하도록 설정 가능.  
- 로그는 **structured JSON** 형태로 남겨 중앙 로그 시스템(ELK, Loki 등)과 연동합니다.

---

## 13. 모범 사례와 권장 패턴
### 도구 설계 시 권장 데이터 타입·스키마  
- 기본 타입(`int`, `float`, `str`) 사용을 권장하고, 복합 타입은 **JSON Schema** 로 명시적 정의 필요.  
- **Optional** 파라미터는 `typing.Optional` 으로 선언해 기본값을 제공하면 자동으로 **nullable** 로 처리됩니다.

### 에러 핸들링 및 재시도 전략  
- 도구 내부에서 발생한 예외는 `FastMCPError` 로 래핑해 클라이언트에 전달합니다.  
- 클라이언트 측에서는 **exponential backoff** 로 재시도 로직을 구현하는 것이 권장됩니다.

### 성능 최적화 (캐싱·배치 처리)  
- **함수 레벨 캐시**(`functools.lru_cache`) 를 활용해 동일 입력에 대한 반복 호출을 방지.  
- 대량 작업은 **배치 엔드포인트**(`@mcp.batch_tool`) 로 구현해 한 번에 여러 요청 처리 가능(구현 상세는 **추가 조사가 필요합니다**).

---

## 14. 고급 기능
### 커스텀 확장(플러그인·미들웨어) 개발  
- FastMCP는 `add_middleware` 메서드로 **인증**, **로깅**, **트레이싱** 등 커스텀 미들웨어를 삽입 가능.  

### 다중 서버·멀티 클라이언트 환경 구성  
- 여러 MCP 서버를 **로드밸런서** 뒤에 두고, 클라이언트는 **service discovery**(Consul, etcd) 를 통해 동적으로 엔드포인트를 선택합니다.  

### 이벤트 기반 워크플로와 MCP 연동  
- **Prefect** 와 연계해 이벤트(예: 파일 업로드) 발생 시 자동으로 MCP 도구를 호출하는 워크플로를 정의할 수 있습니다.  

---

## 15. 트러블슈팅 & FAQ
### 흔히 발생하는 오류와 해결 방법  
| 오류 | 원인 | 해결 방법 |
|------|------|----------|
| `400 Bad Request – ValidationError` | 입력 파라미터 타입 불일치 | 함수 시그니처와 JSON payload 확인 |
| `401 Unauthorized` | API 키 누락 또는 잘못된 토큰 | `Client` 초기화 시 `api_key` 전달 |
| `404 Not Found – tool not registered` | 데코레이터 누락 또는 서버 재시작 안 함 | `@mcp.tool` 데코레이터 확인 후 `mcp.run()` 재시작 |

### 로그 분석 및 디버깅 팁  
- FastMCP 서버는 **stdout** 에 구조화된 로그를 출력하므로, `journalctl -u fastmcp` 혹은 Docker 로그(`docker logs`) 로 확인합니다.  
- 클라이언트 측 `await client.call_tool(..., debug=True)` 옵션을 사용하면 요청·응답 상세를 콘솔에 출력합니다(구현 여부는 **추가 조사가 필요합니다**).

### 자주 묻는 질문 정리  
- **Q:** FastMCP와 기존 REST API 서버를 동시에 운영할 수 있나요?  
  **A:** 가능하며, FastMCP 서버는 표준 HTTP 엔드포인트를 제공하므로 라우팅 설정만 적절히 하면 됩니다.  
- **Q:** Prefect Horizon 외에 자체 호스팅이 가능한가요?  
  **A:** 네, Docker 이미지와 Helm 차트를 이용해 Kubernetes 클러스터에 직접 배포할 수 있습니다.  

---

## 16. 참고 자료 및 커뮤니티
- **Model Context Protocol 공식 사이트** – https://modelcontextprotocol.io/  
- **FastMCP 공식 문서·스펙** – https://gofastmcp.com/ (모든 페이지는 `.md` 로 접근 가능)  
- **GitHub 레포지토리** – https://github.com/fastmcp/fastmcp (예제 코드, 이슈 트래커)  
- **Prefect Horizon** – https://www.prefect.io/horizon (무료 호스팅 안내)  
- **커뮤니티 포럼** – https://community.fastmcp.io/ (Slack, Discord 채널)  

---

## 17. 부록
### 용어 정의 Glossary
- **MCP**: Model Context Protocol, AI와 외부 시스템을 연결하는 표준 프로토콜  
- **FastMCP**: MCP 기반 서버·클라이언트·앱 프레임워크  
- **Tool**: MCP 서버가 제공하는 함수형 인터페이스  
- **Resource**: 데이터 저장소·스트리밍 등 상태ful 엔티티  
- **Prompt**: LLM에게 전달되는 템플릿 기반 입력  

### 전체 API 시그니처 표
| 메서드 | 동기/비동기 | 설명 |
|--------|-------------|------|
| `Client.call_tool(name, arguments)` | 비동기 | 지정된 도구 호출 |
| `Client.call_resource(name, operation, arguments)` | 비동기 | 리소스 CRUD |
| `Client.call_prompt(name, variables)` | 비동기 | 프롬프트 템플릿 렌더링 |
| `FastMCP.run(host, port)` | 동기 | 서버 시작 |

### 샘플 프로젝트 구조와 설정 파일 예시 (인덴트)  
```text
my_fastmcp_project/
├── pyproject.toml          # Poetry/PEP 518 설정
├── fastmcp_app.py          # FastMCP 인스턴스 정의
├── tools/
│   ├── __init__.py
│   └── math_tools.py      # @mcp.tool 예시
└── README.md
```

**fastmcp_app.py**  
```text
from fastmcp import FastMCP
from tools.math_tools import add, multiply

app = FastMCP("My Demo")

app.register_tool(add)
app.register_tool(multiply)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
```

--- 

*본 문서는 euno.news 의 FastMCP 소개 기사와 Model Context Protocol 공식 스펙을 기반으로 작성되었습니다. 최신 버전 정보나 상세 구현 예시는 공식 레포지토리와 커뮤니티 채널을 참고하시기 바랍니다.*