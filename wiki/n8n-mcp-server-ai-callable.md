---
title: n8n MCP Server – 워크플로를 AI‑Callable 도구로 변환하기
author: SEPilot AI
status: published
tags: [n8n, MCP, AI‑Callable, 워크플로, 자동화, 서버]
---

## 1. 소개
### 문서 목적 및 대상 독자
이 문서는 **n8n MCP Server** 기능을 활용해 기존 n8n 워크플로를 AI‑Callable 도구로 전환하고자 하는 개발자·엔지니어·프로덕트 매니저를 위한 가이드입니다.  
- n8n을 이미 사용 중인 팀  
- AI 에이전트(Claude Desktop, Cursor, VS Code 등)와 연동하고 싶은 조직  
- 자체 호스팅·클라우드 옵션을 비교·선택하려는 인프라 담당자  

### n8n MCP Server가 해결하는 문제 정의
전통적인 워크플로 자동화 플랫폼은 **인간이 트리거**하거나 **스케줄러**에 의존합니다. AI‑Driven 애플리케이션에서는 에이전트가 직접 **도구**를 호출해 실시간 의사결정을 해야 합니다. n8n MCP Server는  
- 워크플로를 **HTTP Endpoint** 로 노출해 AI 에이전트가 직접 호출 가능하게 함  
- 양방향 호출 흐름을 제공해 AI가 외부 MCP 도구(GitHub, Slack, DB 등)와도 연동하도록 지원  

### AI‑Callable 워크플로의 비즈니스 가치
- **실시간 고객 응답**: AI가 CRM·티켓 데이터를 즉시 조회·요약해 고객에게 제공  
- **자동화된 운영**: 인프라·배포 파이프라인을 AI가 트리거해 DevOps 효율 향상  
- **보안·감사**: 중앙화된 MCP Hub가 호출 로그와 HITL(인간‑인‑루프) 제어를 제공  

> “n8n은 전체 워크플로 자동화 플랫폼을 양방향 MCP 허브로 변환한다” [출처](https://euno.news/posts/ko/n8n-mcp-server-turn-any-workflow-into-an-ai-callab-3ffff2)

---

## 2. n8n MCP Server 개념
### MCP (Multi‑Channel Protocol)란?
MCP는 **다양한 채널(HTTP, SSE, 스트리밍)로 도구를 호출**하고, 호출 결과를 실시간으로 반환하는 프로토콜입니다. n8n에서는 이 프로토콜을 기반으로 워크플로를 **도구** 형태로 노출합니다.

### n8n이 MCP 허브 역할을 수행하는 방식
1. **MCP Server Trigger** 노드가 워크플로를 `/mcp/<workflow-id>` 엔드포인트에 매핑  
2. 외부 AI 에이전트가 해당 URL에 **베어러 토큰** 등으로 인증 후 호출  
3. n8n은 워크플로를 실행하고, **SSE/스트리밍** 형태로 결과를 반환  
4. 워크플로 내부에서 **MCP Client Tool** 노드를 사용해 다른 MCP 서버(예: GitHub, Slack)와 연동  

> “모든 n8n 워크플로를 Claude Desktop, Cursor, VS Code가 호출할 수 있는 MCP 도구로 노출할 수 있다” [출처](https://euno.news/posts/ko/n8n-mcp-server-turn-any-workflow-into-an-ai-callab-3ffff2)

### 양방향 호출 흐름
```
외부 AI 에이전트 → MCP Server Trigger → n8n 워크플로 → MCP Client Tool → 외부 MCP 서버
```
AI 에이전트는 **도구를 노출**하고, 워크플로는 **도구를 사용**하는 구조로, 오류 처리와 HITL 제어가 중앙화됩니다.

---

## 3. 핵심 기능 요약
| 기능 | 설명 |
|------|------|
| **MCP Server Trigger** | 워크플로를 HTTP Endpoint 로 변환 (`/mcp/<workflow-id>`) |
| **MCP Client Tool** | 워크플로 내에서 GitHub, Slack, DB 등 외부 MCP 도구와 연동 |
| **실시간 스트리밍 (SSE)** | 호출 결과를 실시간 스트림으로 반환, 대용량 데이터에 적합 |
| **400+ 통합** | n8n이 제공하는 400개 이상의 사전 구축 통합 활용 |
| **Fair‑code 라이선스** | 내부 사용은 무료, 상업적 재배포는 Enterprise 라이선스 필요 |
| **자체 호스팅 가능** | Docker, 자체 서버, n8n Cloud 등 다양한 배포 옵션 지원 |

> “특징: SSE + 스트리밍 가능한 HTTP, 400개 이상의 통합” [출처](https://euno.news/posts/ko/n8n-mcp-server-turn-any-workflow-into-an-ai-callab-3ffff2)

---

## 4. 설치 및 환경 요구사항
### 지원 배포 옵션
- **n8n Cloud** (공식 SaaS) – 관리형 인프라  
- **자체 서버** (Docker, Kubernetes, 직접 설치)  
- **Docker Compose** (간편 로컬/테스트)  

### 최소 시스템 사양 및 의존성
| 항목 | 권장 사양 |
|------|-----------|
| OS | Linux (Ubuntu 20.04 이상) / macOS |
| CPU | 2 vCPU 이상 |
| 메모리 | 2 GB 이상 |
| 스토리지 | 워크플로·로그 저장을 위한 10 GB 이상 |
| 런타임 | Node.js 18.x (n8n 기본) |
| DB | SQLite (기본) / PostgreSQL, MySQL (프로덕션) |
| 네트워크 | 공개 HTTPS(443) 포트, TLS 인증서 필요 |

### 네트워크 요구
- **공개 URL**: `https://your-n8n-instance.com/mcp/...` 로 외부 AI 에이전트가 접근 가능해야 함  
- **TLS**: 반드시 HTTPS 사용 (자체 인증서 또는 Let’s Encrypt)  

> “호스팅 및 비용” 섹션에 명시된 n8n Cloud 플랜은 무료(+인프라)부터 €24‑€800/월까지 제공 [출처](https://euno.news/posts/ko/n8n-mcp-server-turn-any-workflow-into-an-ai-callab-3ffff2)

---

## 5. MCP Server Trigger 설정
### 1) 노드 추가
1. n8n 에디터에서 **+** → **Trigger** → **MCP Server Trigger** 선택  
2. 워크플로 상단에 배치 (트리거는 반드시 첫 노드)  

### 2) 기본 구성
| 필드 | 설명 | 예시 |
|------|------|------|
| **Endpoint** | 자동 생성 `/mcp/<workflow-id>` 경로 | `https://my-n8n.com/mcp/get_customer_360` |
| **Authentication** | 베어러 토큰 또는 API 키 선택 | 베어러 토큰 |
| **Response Mode** | `SSE`(스트리밍) 또는 `JSON`(단일 응답) | `SSE` |

### 3) 인증 방식
- **베어러 토큰**: 워크플로 설정 → `Authentication` → `Bearer Token` 입력  
- **API 키**: `Header`에 `x-api-key` 로 전달  

### 4) 테스트 호출
```bash
curl -X POST "https://my-n8n.com/mcp/get_customer_360" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"customerId":"12345"}'
```
Postman에서도 동일 헤더와 바디를 설정해 호출 가능.

---

## 6. MCP Client Tool 활용
### 노드 종류
| 도구 | 지원 프로토콜 | 인증 방식 |
|------|---------------|-----------|
| GitHub | REST API | Personal Access Token |
| Slack | Webhook / API | Bot Token |
| 데이터베이스 | Direct query (PostgreSQL, MySQL) | DB 사용자·비밀번호 |
| 기타 MCP 서버 | HTTP/HTTPS | 베어러 토큰 등 |

### 설정 예시 (GitHub 이슈 생성)
1. 워크플로에 **MCP Client Tool** 노드 추가  
2. **Service** → `GitHub` 선택  
3. **Operation** → `Create Issue`  
4. **Authentication** → `Personal Access Token` 입력  
5. **Payload** → `{ "title": "AI generated issue", "body": {{ $json.body }} }`  

### 데이터 교환 흐름
```
AI Agent → MCP Server Trigger → 워크플로 → MCP Client Tool (GitHub) → GitHub API
```
AI 에이전트는 워크플로를 호출만 하면 GitHub 이슈를 자동 생성할 수 있습니다.

---

## 7. 워크플로 예시 – `get_customer_360`
### 시나리오
- **입력**: `customerId`  
- **단계**  
  1. **CRM 조회** (HTTP Request) → 고객 기본 정보  
  2. **Ticket DB 조회** (PostgreSQL) → 관련 티켓 리스트  
  3. **요약 생성** (ChatGPT 또는 내부 LLM) → 고객 360° 요약  
- **출력**: JSON 형태 요약  

### 주요 노드 구성도
1. **MCP Server Trigger** (`/mcp/get_customer_360`)  
2. **HTTP Request** – CRM API 호출  
3. **PostgreSQL** – 티켓 DB 쿼리  
4. **Function** – 데이터 병합  
5. **ChatGPT (LLM)** – 요약 생성  
6. **Set** – 최종 응답 반환 (SSE)  

### AI Agent에서 호출 방법
```bash
curl -X POST "https://my-n8n.com/mcp/get_customer_360" \
  -H "Authorization: Bearer AGENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"customerId":"CUST-001"}'
```
응답은 SSE 스트림으로 실시간 요약이 전송됩니다.

### 결과 검증 및 로그 확인 팁
- n8n 에디터 → **Execution List** 에서 해당 실행 ID 클릭 → **Logs** 확인  
- **SSE** 로그는 `EventSource` 객체로 브라우저 콘솔에서도 확인 가능  

---

## 8. 보안 및 인증
### 엔드포인트 접근 제어 전략
- **베어러 토큰**을 워크플로 별로 발급하고, 최소 권한 원칙 적용  
- **IP 화이트리스트**: Nginx/Traefik에서 허용 IP 범위 제한  

### 토큰 관리 및 회전 정책
- 토큰은 **30일** 주기로 교체하고, **Revocation List**에 기록  
- n8n **Credentials** 기능을 활용해 토큰을 암호화 저장  

### Rate‑limit 설정
- Nginx `limit_req_zone` 혹은 Cloudflare Rate Limiting 사용  
- 기본 권장값: **60 req/min** per token  

### 데이터 암호화 및 규제 고려사항
- 전송 중 데이터는 **TLS 1.2+** 로 암호화  
- 저장 데이터(고객 정보)는 **AES‑256** 로 암호화(데이터베이스 레벨)  
- GDPR/CCPA 적용 시, **데이터 최소화**와 **삭제 요청** 절차를 워크플로에 포함  

---

## 9. 운영 고려사항
### 다중 복제 제한
> “모든 `/mcp*` 요청은 단일 웹훅 복제본으로 라우팅되어야 한다” [출처](https://euno.news/posts/ko/n8n-mcp-server-turn-any-workflow-into-an-ai-callab-3ffff2)  
- Kubernetes `StatefulSet` 사용 시 `spec.replicas: 1` 로 고정  
- 클러스터 내 **Sticky Session** 설정 필요  

### 리버스 프록시 설정
**Nginx** 예시 (버퍼링 비활성화):
```
location /mcp/ {
    proxy_pass http://n8n:5678;
    proxy_buffering off;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```
Traefik에서도 `buffering: false` 옵션 적용 가능.

### 트리거 신뢰성
- 일부 사용자는 **첫 호출 후 트리거가 중단**되는 현상을 보고했음 → **핵심 로그**(`n8n.log`)에 `Webhook timeout` 확인 후 `timeout` 값 증가 (`WEBHOOK_TIMEOUT=60000`)  

### 실행 인스턴스 외부 접근
- 워크플로 내 **HTTP Request** 노드가 외부 URL에 접근하려면 n8n 인스턴스가 **인터넷 연결**이 필요함  

---

## 10. 호스팅 옵션 및 비용 구조
| 옵션 | 플랜 | 비용 | 특징 |
|------|------|------|------|
| **n8n Cloud** | Free | 무료 (+ 인프라) | 무제한 실행, 기본 SLA |
|  | €24 – €800 / mo | 실행량 2,500 – 40,000 / mo | 기업용 지원, 전용 도메인 |
| **자체 호스팅** | 자체 인프라 | 서버·스토리지·네트워크 비용 | 완전 제어, 무제한 커스텀 플러그인 |
| **Docker** | 로컬/테스트 | 로컬 머신 비용 | 빠른 시작, 개발용 |

> “n8n은 실행(전체 워크플로) 단위로 계산하며, 개별 작업이나 API 호출 단위가 아니다” [출처](https://euno.news/posts/ko/n8n-mcp-server-turn-any-workflow-into-an-ai-callab-3ffff2)

---

## 11. 경쟁 솔루션 대비 비교
| 항목 | n8n | Zapier | Composio | Pipedream |
|------|-----|--------|----------|-----------|
| 통합 수 | 400+ | 8,000+ | 500 | 2,800 |
| 자체 호스팅 | ✅ (무료) | ❌ | ✅ (SDK) | ❌ |
| MCP Client 지원 | ✅ | ❌ | ❌ | ❌ |
| 맞춤 로직 | 전체 (JS/Python) | 제한적 | 제한적 | 제한적 |
| HITL 제어 | 내장 | ❌ | ❌ | ❌ |
| 무료 티어 | 무제한 (자체) | 100 작업/월 | 20 K 호출/월 | 100 크레딧 |

---

## 12. 베스트 프랙티스 & 트러블슈팅
### 모니터링·로깅
- **Prometheus** exporter (`n8n-prometheus`) 사용해 워크플로 실행 수, 오류율 수집  
- **Grafana** 대시보드에 `mcp_requests_total`, `mcp_errors_total` 시각화  

### 재시도 정책
- **HTTP Request** 노드에서 `Retry on Failure` 활성화 (max 3회, exponential backoff)  
- **MCP Server Trigger**는 클라이언트 측에서 재시도 구현 (예: `axios-retry`)  

### 일반적인 오류와 해결
| 오류 | 원인 | 해결 방법 |
|------|------|-----------|
| 502 Bad Gateway | 프록시 버퍼링 활성화 | Nginx `proxy_buffering off` |
| 401 Unauthorized | 토큰 누락/만료 | 토큰 재발급 및 헤더 확인 |
| 복제된 `/mcp` 호출 무시 | 다중 복제 설정 | `replicas: 1` 유지 |
| 첫 호출 후 트리거 중단 | Webhook timeout | `WEBHOOK_TIMEOUT` 환경 변수 증가 |

### 성능 최적화 팁
- **노드 최소화**: 복잡한 로직은 **Function** 노드에 JS로 구현  
- **캐시 활용**: 자주 조회하는 CRM 데이터는 **Redis** 캐시 노드 사용  
- **병렬 실행**: `SplitInBatches` 노드로 대량 레코드 병렬 처리  

---

## 13. 결론 및 다음 단계
### 기대 효과 요약
- AI 에이전트가 **실시간**으로 비즈니스 로직을 호출 → 고객 응답 시간 단축  
- **중앙화된** MCP Hub 로 다양한 도구와 연동 → 운영 복잡도 감소  
- 자체 호스팅으로 **비용 효율** 및 **데이터 주권** 확보  

### 파일럿 프로젝트 설계 권고사항
1. **핵심 워크플로** 1~2개 선정 (예: `get_customer_360`)  
2. **MCP Server Trigger**와 **MCP Client Tool**만 사용해 최소 구성 검증  
3. **보안**: 전용 베어러 토큰, IP 제한, TLS 적용  
4. **모니터링**: Prometheus·Grafana 대시보드 구축  
5. **피드백 루프**: AI 에이전트와 인간 운영자가 결과를 검증하고 HITL 정책을 조정  

### 추가 학습 자료 및 커뮤니티
- n8n 공식 문서: <https://docs.n8n.io>  
- MCP Server Trigger 가이드 (GitHub 예제) – n8n 레포지토리 `examples/mcp-server-trigger`  
- 커뮤니티 포럼: <https://community.n8n.io>  
- AI 에이전트 연동 사례: Claude Desktop Docs, Cursor Docs  

> “n8n은 오류 처리와 인간‑인‑루프(HITL) 제어가 포함된 단일 조정 인터페이스 뒤에서 여러 MCP 서버를 조합하는 미들웨어 역할을 한다” [출처](https://euno.news/posts/ko/n8n-mcp-server-turn-any-workflow-into-an-ai-callab-3ffff2)

---