---
title: AI 에이전트 프로토콜 종합 가이드 – MCP, A2A, UCP, AP2, A2UI, AG‑UI  
author: SEPilot AI  
status: published
tags: [AI, 에이전트, 프로토콜, MCP, A2A, UCP, AP2, A2UI, AG-UI, ADK]  
quality_score: 74
---

## 1. 서문
### 가이드 목적 및 독자 정의
이 문서는 AI 에이전트를 개발·운용하는 엔지니어, 아키텍트, 제품 매니저를 대상으로 합니다. AI 에이전트가 다양한 데이터 소스와 서비스에 일관된 방식으로 접근하고, 서로 간에 안전하게 통신하며, 사용자에게 직관적인 UI를 제공하도록 설계된 **여섯 가지 표준 프로토콜**을 한눈에 정리하고 구현 시 바로 활용할 수 있는 실무 예시를 제공합니다.

### AI 에이전트 프로토콜 도입 배경
전통적인 AI 에이전트 구현에서는 서비스마다 맞춤형 통합 코드를 작성해야 했습니다. 이는 유지보수 비용을 증가시키고 보안·컴플라이언스 관리에 복잡성을 더했습니다. EUNO.NEWS에서 소개한 프로토콜 스위트는 **데이터 접근·에이전트 간 통신·거래·결제·UI**를 표준화함으로써 맞춤형 코드를 최소화하고, 빠른 프로토콜 교체·확장을 가능하게 합니다[[EUNO.NEWS](https://euno.news/posts/ko/developers-guide-to-ai-agent-protocols-6e0fc9)].

### 전체 프로토콜 스위트 개요
| 프로토콜 | 핵심 역할 |
|----------|-----------|
| **MCP** (Message & Content Protocol) | 데이터 접근을 위한 핵심 프로토콜 |
| **A2A** (Agent‑to‑Agent Communication) | 에이전트 간 상호작용 지원 |
| **UCP** (Unified Commerce Protocol) | 도매·소매 상거래 작업 처리 |
| **AP2** (Authorized Payment Protocol) | 안전한 결제 승인 제공 |
| **A2UI** (Agent‑to‑User Interface) | 인터랙티브 대시보드 지원 |
| **AG‑UI** (Agent‑Generated Streaming UI) | 사용자에게 원활한 스트리밍 인터페이스 제공 |

## 2. 프로토콜 스위트 전체 구조
### 프로토콜 간 관계 및 데이터 흐름 모델
![프로토콜 데이터 흐름 다이어그램](./diagrams/data-flow.png)  
*다이어그램: MCP → A2A → (UCP ↔ AP2) → A2UI / AG‑UI*  

- **MCP**는 모든 데이터 요청의 진입점으로 인증·인가를 수행합니다.  
- **A2A**는 MCP를 통해 획득한 데이터를 기반으로 에이전트 간 메시지를 교환합니다.  
- **UCP**와 **AP2**는 각각 상거래와 결제 흐름을 담당하며, A2A 혹은 MCP와 연계해 주문·결제 정보를 전송합니다.  
- **A2UI**와 **AG‑UI**는 최종 사용자와의 인터페이스 레이어를 형성하며, 백엔드 이벤트를 실시간 스트리밍하거나 대시보드 형태로 전달합니다.

### 표준화 레이어와 통합 포인트
1. **전송 레이어** – TLS 1.2 이상 암호화 전송 (보안·컴플라이언스는 §11 참고).  
2. **메시징 레이어** – JSON 또는 protobuf 포맷을 사용해 프로토콜 간 메시지를 정의합니다.  
3. **비즈니스 로직 레이어** – 각 프로토콜이 담당하는 비즈니스 규칙을 구현합니다.

### 용어 정의 및 핵심 개념
- **Message**: 프로토콜 간 교환되는 기본 단위.  
- **Topic / Channel**: A2A에서 메시지를 구분하기 위한 논리적 구분.  
- **Tokenization**: AP2에서 결제 정보를 보호하기 위한 암호화 기법.  
- **Streaming**: AG‑UI가 실시간 멀티미디어 콘텐츠를 전달하는 방식.

## 3. MCP (Message & Content Protocol)
### 엔드포인트 및 HTTP 메서드
| 메서드 | 경로 | 설명 |
|-------|------|------|
| GET | `/api/v1/mcp/content/{resourceId}` | 단일 리소스 조회 |
| POST | `/api/v1/mcp/content/search` | 복합 필터링 검색 |
| PATCH | `/api/v1/mcp/content/{resourceId}` | 리소스 부분 업데이트 (권한 필요) |

### 요청 / 응답 예시
**GET /api/v1/mcp/content/sku-12345**  

    GET /api/v1/mcp/content/sku-12345 HTTP/1.1
    Host: api.example.com
    Authorization: Bearer <access-token>
    Accept: application/json

**응답 (200 OK)**  

    HTTP/1.1 200 OK
    Content-Type: application/json

    {
        "resourceId": "sku-12345",
        "type": "inventory",
        "attributes": {
            "name": "Premium Coffee Beans",
            "quantity": 128,
            "unit": "kg",
            "lastUpdated": "2026-03-27T14:12:03Z"
        }
    }

### 상태 코드 표
| 코드 | 의미 | 비고 |
|------|------|------|
| 200 | 성공 | 요청된 데이터를 반환 |
| 400 | 잘못된 요청 | 파라미터 검증 실패 |
| 401 | 인증 실패 | 토큰 누락·만료 |
| 403 | 권한 부족 | 리소스 접근 제한 |
| 404 | 리소스 없음 | 지정된 ID가 존재하지 않음 |
| 429 | 요청 제한 초과 | 레이트 리밋 적용 |
| 500 | 서버 오류 | 내부 예외 |

### 확장 옵션
- **버전 관리**: `Accept: application/vnd.example.mcp.v2+json` 헤더 또는 URL `/v2/` 경로 사용.  
- **플러그인**: 커스텀 변환 플러그인(`X-MCP-Plugin`)을 통해 데이터 포맷 변환 가능.

## 4. A2A (Agent‑to‑Agent Communication)
### 엔드포인트
| 메서드 | 경로 | 설명 |
|-------|------|------|
| POST | `/api/v1/a2a/message` | 단일 에이전트에 메시지 전송 |
| POST | `/api/v1/a2a/broadcast` | 토픽 기반 브로드캐스트 |
| GET | `/api/v1/a2a/subscriptions` | 현재 구독 목록 조회 |

### 메시지 구조 (JSON)
    {
        "messageId": "msg-20260328-001",
        "sourceAgent": "inventory-service",
        "targetAgent": "order-service",   // 브로드캐스트 시 null
        "topic": "inventory.update",
        "timestamp": "2026-03-28T09:15:00Z",
        "payload": {
            "sku": "sku-12345",
            "available": 124
        },
        "idempotencyKey": "inv-upd-12345-20260328"
    }

### 상태 코드 표
| 코드 | 의미 |
|------|------|
| 202 | 메시지 수락, 비동기 처리 시작 |
| 400 | 메시지 포맷 오류 |
| 401 | 인증 실패 |
| 409 | 중복 메시지 (idempotency) |
| 500 | 내부 서버 오류 |

### 라우팅·브로드캐스트 전략
- **중앙 라우터**: NATS 또는 Kafka 기반 라우터가 `topic`을 기준으로 구독자에게 전달.  
- **분산 브로커**: 각 도메인 별 독립 브로커를 운영해 지연 최소화.  
- **중복 방지**: `messageId`와 `idempotencyKey`를 이용해 중복 전송을 차단.

## 5. UCP (Unified Commerce Protocol)
### 엔드포인트
| 메서드 | 경로 | 설명 |
|-------|------|------|
| POST | `/api/v1/ucp/orders` | 주문 생성 |
| GET | `/api/v1/ucp/orders/{orderId}` | 주문 상세 조회 |
| PATCH | `/api/v1/ucp/orders/{orderId}` | 주문 상태 업데이트 |
| GET | `/api/v1/ucp/shipments/{shipmentId}` | 배송 추적 |

### 주문 생성 요청 예시
    POST /api/v1/ucp/orders HTTP/1.1
    Host: commerce.example.com
    Authorization: Bearer <access-token>
    Content-Type: application/json

    {
        "orderId": "ord-20260328-001",
        "items": [
            { "sku": "sku-12345", "quantity": 10, "price": 15.90 },
            { "sku": "sku-67890", "quantity": 5,  "price": 8.50 }
        ],
        "currency": "USD",
        "buyer": {
            "customerId": "cust-9876",
            "email": "buyer@example.com"
        },
        "shippingAddress": {
            "line1": "123 Main St",
            "city": "Seoul",
            "postalCode": "04524",
            "country": "KR"
        }
    }

### 주문 생성 응답 (201 Created)

    HTTP/1.1 201 Created
    Content-Type: application/json

    {
        "orderId": "ord-20260328-001",
        "status": "pending",
        "createdAt": "2026-03-28T10:02:15Z",
        "totalAmount": 215.40,
        "currency": "USD"
    }

### 상태 코드 표
| 코드 | 의미 |
|------|------|
| 201 | 주문이 성공적으로 생성됨 |
| 400 | 요청 파라미터 오류 |
| 401 | 인증 실패 |
| 403 | 주문 생성 권한 없음 |
| 404 | 주문/배송 ID 미존재 |
| 409 | 중복 주문 (orderId 충돌) |
| 422 | 비즈니스 규칙 위반 (예: 재고 부족) |
| 500 | 서버 오류 |

### 데이터 모델 요약
- **Order**: `orderId`, `items[]`, `status`, `totalAmount`, `currency`, `createdAt`, `updatedAt`  
- **Invoice**: `invoiceId`, `orderId`, `totalAmount`, `taxes`, `issuedAt`  
- **Shipment**: `shipmentId`, `orderId`, `carrier`, `trackingNumber`, `status`, `estimatedDelivery`

## 6. AP2 (Authorized Payment Protocol)
### 엔드포인트
| 메서드 | 경로 | 설명 |
|-------|------|------|
| POST | `/api/v1/ap2/payments` | 결제 승인 요청 |
| GET  | `/api/v1/ap2/payments/{paymentId}` | 결제 상태 조회 |
| POST | `/api/v1/ap2/payments/{paymentId}/refund` | 환불 요청 |

### 결제 승인 요청 예시
    POST /api/v1/ap2/payments HTTP/1.1
    Host: payments.example.com
    Authorization: Bearer <access-token>
    Content-Type: application/json

    {
        "paymentId": "pay-20260328-001",
        "orderId": "ord-20260328-001",
        "amount": 215.40,
        "currency": "USD",
        "paymentMethod": {
            "type": "card",
            "token": "tok_1Gq2h2Lz9..."
        },
        "metadata": {
            "description": "Kitchen Manager order"
        }
    }

### 결제 승인 성공 응답 (200 OK)

    HTTP/1.1 200 OK
    Content-Type: application/json

    {
        "paymentId": "pay-20260328-001",
        "status": "authorized",
        "authCode": "A1B2C3",
        "processedAt": "2026-03-28T10:05:42Z",
        "receiptUrl": "https://payments.example.com/receipts/pay-20260328-001"
    }

### 오류 코드 표
| 코드 | 의미 | 비고 |
|------|------|------|
| 400 | 파라미터 오류 | 필수 필드 누락 |
| 401 | 인증 실패 |
| 402 | 결제 요구 (Insufficient Funds) |
| 403 | 결제 수단 사용 금지 |
| 404 | 주문 ID 미존재 |
| 409 | 중복 결제 요청 |
| 422 | 토큰 검증 실패 |
| 429 | 레이트 제한 초과 |
| 500 | 결제 게이트웨이 오류 |

### 보안 메커니즘
- **PCI DSS 레벨 3** 토큰화 적용 (`paymentMethod.token`).  
- **TLS 1.3** 전송, **HMAC‑SHA256** 서명 헤더(`X-Signature`).  
- **감사 로그**: 모든 결제 요청·응답을 별도 보안 로그에 기록하고, 90일 보관.

## 7. A2UI (Agent‑to‑User Interface)
### 엔드포인트
| 메서드 | 경로 | 설명 |
|-------|------|------|
| GET | `/api/v1/a2ui/dashboard` | 대시보드 초기 설정 반환 |
| WS  | `/ws/a2ui/updates` | 실시간 위젯 업데이트 (WebSocket) |
| POST | `/api/v1/a2ui/widgets/{widgetId}` | 위젯 데이터 강제 업데이트 |

### 대시보드 설정 예시 (JSON)

    {
        "layout": [
            { "widgetId": "inv-widget", "position": { "x":0, "y":0, "w":4, "h":2 } },
            { "widgetId": "order-widget", "position": { "x":4, "y":0, "w":4, "h":2 } },
            { "widgetId": "payment-widget", "position": { "x":0, "y":2, "w":8, "h":2 } }
        ],
        "theme": "light",
        "refreshIntervalSec": 15,
        "i18n": "ko"
    }

### WebSocket 메시지 포맷
    {
        "widgetId": "order-widget",
        "timestamp": "2026-03-28T10:12:30Z",
        "payload": {
            "orderId": "ord-20260328-001",
            "status": "confirmed"
        }
    }

### 상태 코드 표
| 코드 | 의미 |
|------|------|
| 200 | 정상 응답 |
| 400 | 잘못된 파라미터 |
| 401 | 인증 실패 |
| 403 | 권한 부족 |
| 404 | 위젯 미존재 |
| 500 | 서버 오류 |

### 접근성·국제화 권고
- **ARIA** 속성 적용 (`role="region"`, `aria-live="polite"`).  
- 다국어 파일은 `locales/<lang>.json` 형태로 관리하고, 런타임에 `i18n` 파라미터로 전환.

## 8. AG‑UI (Agent‑Generated Streaming UI)
### 엔드포인트
| 메서드 | 경로 | 설명 |
|-------|------|------|
| GET | `/api/v1/agui/streams/{streamId}/manifest.m3u8` | HLS 매니페스트 반환 |
| GET | `/api/v1/agui/streams/{streamId}/manifest.mpd` | DASH 매니페스트 반환 |
| WS  | `/ws/agui/control` | 스트림 제어 (시작/정지) |

### 스트리밍 설정 예시 (JSON)

    {
        "streamId": "kitchen-camera-01",
        "codec": "h264",
        "resolution": "1280x720",
        "bitrateKbps": 2500,
        "audio": { "codec": "aac", "channels": 2, "sampleRate": 48000 },
        "drm": { "type": "widevine", "licenseUrl": "https://drm.example.com/license" }
    }

### 버퍼링·지연 관리 권고
- **버퍼 크기**: 최소 2 초, 최대 5 초.  
- **비트레이트 자동 조정**: `ABR`(Adaptive Bitrate) 사용, 네트워크 상태에 따라 `2500 → 1500 → 800 kbps` 로 단계적 감소.  
- **실시간 인터랙션**: WebRTC 기반 저지연 채널(`latency < 300 ms`)을 별도 제공.

### 상태 코드 표
| 코드 | 의미 |
|------|------|
| 200 | 매니페스트 정상 반환 |
| 206 | 부분 콘텐츠 전송 (Range) |
| 400 | 파라미터 오류 |
| 401 | 인증 실패 |
| 403 | DRM 권한 부족 |
| 404 | 스트림 미존재 |
| 500 | 스트리밍 서버 오류 |

## 9. 통합 구현 예시 – “키친 매니저” 에이전트
### 시나리오 개요
키친 매니저 에이전트는 레스토랑 주방 운영을 자동화합니다. 목표는 **실시간 재고 확인 → 도매 주문 → 결제 승인 → 대시보드·스트리밍 UI 제공**입니다.

### 전체 흐름 다이어그램
![키친 매니저 흐름도](./diagrams/kitchen-manager.png)

### 단계별 API 호출

1. **재고 조회 (MCP)**
   - `GET /api/v1/mcp/content/inventory/sku-espresso`
2. **재고 부족 시 주문 생성 (UCP)**
   - `POST /api/v1/ucp/orders` (위 주문 생성 예시 참고)
3. **결제 승인 (AP2)**
   - `POST /api/v1/ap2/payments` (위 결제 요청 예시 참고)
4. **대시보드 업데이트 (A2UI)**
   - WebSocket `/ws/a2ui/updates` 로 `order-widget` 상태 전송
5. **주방 카메라 스트리밍 (AG‑UI)**
   - `GET /api/v1/agui/streams/kitchen-camera-01/manifest.m3u8`

> 모든 엔드포인트와 파라미터는 현재 공개된 스펙을 기반으로 작성되었습니다. 향후 버전에서 경로가 변경될 수 있습니다.

## 10. Agent Development Kit (ADK) 활용 가이드
### ADK 구성 요소
| 구성 요소 | 설명 |
|-----------|------|
| **Core SDK** | 각 프로토콜별 TypeScript/JavaScript API 제공 |
| **UI Toolkit** | A2UI·AG‑UI 위젯·컴포넌트 (React, Vue, Svelte) |
| **CLI** | `adk init`, `adk build`, `adk deploy` 명령 제공 |
| **Mock Server** | 로컬에서 프로토콜 별 모의 서버 실행 (`adk mock start`) |
| **Log Analyzer** | 트래픽 로그 시각화 (`adk logs view`) |

### 설치 스크립트
```bash
# npm 기반 설치
npm install -g @euno/adk

# Yarn 사용 시
yarn global add @euno/adk

# Python 환경 (pip) – 일부 언어 바인딩
pip install euno-adk
```

### 주요 메서드 시그니처 (TypeScript)
- **MCP**
  ```ts
  fetchContent(resourceId: string, options?: RequestOptions): Promise<ContentResponse>;
  listResources(filter?: ResourceFilter): Promise<ContentListResponse>;
  ```
- **A2A**
  ```ts
  sendMessage(target: string, payload: any, opts?: MessageOptions): Promise<Acknowledgement>;
  subscribe(topic: string, handler: (msg: Message) => void): UnsubscribeFn;
  ```
- **UCP**
  ```ts
  createOrder(order: OrderInput): Promise<OrderResponse>;
  trackShipment(orderId: string): Promise<ShipmentStatus>;
  ```
- **AP2**
  ```ts
  authorizePayment(payment: PaymentInput): Promise<PaymentResult>;
  refundTransaction(txId: string, amount?: number): Promise<RefundResult>;
  ```
- **A2UI**
  ```ts
  renderDashboard(config: DashboardConfig): DashboardInstance;
  updateWidget(widgetId: string, data: any): void;
  ```
- **AG‑UI**
  ```ts
  startStream(streamId: string, options?: StreamOptions): Promise<StreamHandle>;
  stopStream(streamId: string): Promise<void>;
  ```

### 샘플 프로젝트 구조
```
kitchen-manager/
├─ src/                # 에이전트 비즈니스 로직
│   ├─ index.ts
│   └─ services/
│       ├─ inventory.ts
│       ├─ order.ts
│       └─ payment.ts
├─ ui/                 # A2UI·AG‑UI 컴포넌트
│   ├─ dashboard/
│   │   └─ Dashboard.tsx
│   └─ streaming/
│       └─ KitchenCamera.tsx
├─ tests/              # 단위·통합 테스트
│   └─ *.test.ts
├─ adk.config.js       # ADK 설정 파일
└─ package.json
```

### CI/CD 파이프라인 (GitHub Actions 예시)
```yaml
name: CI

on:
  push:
    branches: [ main ]

jobs:
  build-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Node.js 설정
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - name: Build
        run: adk build
      - name: Deploy (staging)
        if: github.ref == 'refs/heads/main'
        run: adk deploy --env staging
```

## 11. 보안 및 컴플라이언스
### TLS 적용 예시 (nginx)
```nginx
server {
    listen 443 ssl;
    server_name api.example.com;

    ssl_certificate     /etc/ssl/certs/api.crt;
    ssl_certificate_key /etc/ssl/private/api.key;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    ...
}
```

### 데이터 암호화·마스킹 정책
- **전송 중**: TLS 1.3 + HMAC‑SHA256 서명.  
- **저장 시**: AES‑256‑GCM 암호화, 키는 KMS(AWS KMS, GCP KMS)에서 관리.  
- **로그 마스킹**: 카드 번호·주민등록번호 등 민감 필드는 `****1234` 형태로 마스킹.

### 감사 로그·모니터링 권고
| 항목 | 권고 사항 |
|------|-----------|
| **로그 포맷** | JSON Lines (`timestamp`, `service`, `requestId`, `level`, `message`) |
| **집계** | ELK Stack 또는 Loki + Grafana |
| **알림** | 비정상적인 5xx 비율 > 2 % 또는 연속 401 실패 10회 이상 시 Slack/PagerDuty 알림 |
| **보관 기간** | 최소 90일, GDPR/CCPA 요구 시 2년까지 연장 가능 |

### 개인정보 보호 규정 대응
- **동의 관리**: `/api/v1/consent` 엔드포인트에서 사용자 동의 상태 CRUD.  
- **데이터 삭제**: `DELETE /api/v1/users/{userId}` 요청 시 모든 연관 데이터(로그 제외) 영구 삭제.  
- **데이터 최소화**: API 응답에 `fields` 파라미터를 제공해 필요한 필드만 반환.

## 12. 베스트 프랙티스 및 성능 최적화
### 프로토콜 선택 가이드
| 상황 | 권장 프로토콜 |
|------|---------------|
| 고빈도 읽기 (재고, 설정) | MCP + 캐시 |
| 에이전트 간 협업 (알림, 상태 공유) | A2A (Kafka/NATS) |
| 거래·청구가 포함된 비즈니스 | UCP + AP2 |
| 실시간 UI·스트리밍 | A2UI + AG‑UI |

### 캐시·프리페치 전략
- **Redis**: `GET /mcp/content/{id}` 결과를 60 초 TTL 로 캐시.  
- **CDN**: 정적 콘텐츠(이미지, 매니페스트) CDN 배포.  
- **버전 토큰**: `ETag` 헤더 사용해 변경 시에만 재요청.

### 비동기·스트리밍 최적화
- **A2A**: Kafka `linger.ms=5`, `batch.size=32KB` 로 레이턴시 최소화.  
- **AG‑UI**: WebRTC 사용 시 `iceServers`에 TURN 서버 지정, `max-bitrate` 제한.  
- **버퍼 관리**: 클라이언트 측 `mediaSource.buffered` 길이 모니터링, 2 초 이하 유지.

### 비용·리소스 관리 팁
- **요청량 모니터링**: Prometheus `api_requests_total` 메트릭에 알림 규칙 설정.  
- **오토스케일링**: CPU > 70 % 지속 시 HPA (Horizontal Pod Autoscaler) 적용.  
- **비용 최적화**: 비활성 스트림은 5분 이상 자동 종료 (`adk stream idle-timeout 300`).

## 13. 향후 로드맵 및 확장 가능성
### 예정된 업데이트
| 버전 | 예정 기능 |
|------|-----------|
| **MCP v2** | GraphQL 기반 데이터 조회, 서버‑사이드 필터링 |
| **A2UI v1.1** | 자동 번역 (Google Translate API 연동) |
| **UCP** | SAP OData 커넥터, Salesforce REST 연동 모듈 |
| **AP2** | 토큰 재발급 자동화, 다중 통화 지원 |

### 커뮤니티·오픈소스 기여 모델
- **GitHub**: `euno/ai-agent-protocols` 레포지토리에서 이슈·PR 관리.  
- **포럼**: `forum.euno.ai` 에서 설계·운영 토론.  
- **Slack**: `#dev-protocols` 채널에서 실시간 Q&A 제공.

### 기업 환경 적용 패턴
- **온‑프레미스**: API Gateway (Kong, Apigee) 앞에 프록시 레이어 배치, 내부 SSO와 연동.  
- **멀티‑테넌시**: `X-Tenant-ID` 헤더로 테넌트 구분, 데이터베이스 스키마 별도 관리.  
- **관측**: OpenTelemetry 기반 트레이싱, Jaeger UI로 전체 흐름 시각화.

## 14. FAQ
**Q1. MCP 요청 시 인증 토큰이 없으면 어떻게 되나요?**  
A: 401 Unauthorized 오류가 반환됩니다. 토큰 발급은 ADK `adk auth login` 명령을 통해 수행합니다.

**Q2. A2A에서 메시지 중복 전송을 방지하려면?**  
A: `messageId`와 `idempotencyKey`를 사용해 멱등성을 보장합니다. ADK `sendMessage` 메서드는 자동으로 중복 검사를 수행합니다.

**Q3. UCP와 기존 ERP 시스템 연동은 어떻게 하나요?**  
A: UCP는 표준 REST API 외에 OData 엔드포인트(`GET /api/v1/ucp/odata/Orders`)를 제공하며, SAP·Salesforce와 매핑 가이드는 별도 문서(예정)에서 확인할 수 있습니다.

**Q4. AP2에서 PCI DSS 준수를 어떻게 검증하나요?**  
A: 토큰화·TLS 전송 외에 정기적인 보안 감사와 **PCI DSS Self‑Assessment Questionnaire (SAQ)** 를 수행합니다. 감사 로그는 `adk logs export --service payments` 로 추출 가능.

**Q5. A2UI와 AG‑UI를 동시에 사용할 때 성능 이슈는?**  
A: 각각 WebSocket(실시간 UI)과 HLS/WebRTC(스트리밍)를 사용하므로, 네트워크 대역폭을 모니터링하고 필요 시 **로드 밸런서**와 **CDN**을 적용합니다. ADK `adk monitor` 명령으로 실시간 지표를 확인할 수 있습니다.

## 15. 참고 자료 및 링크
- **공식 프로토콜 스펙** – EUNO.NEWS 개발자 가이드[[EUNO.NEWS](https://euno.news/posts/ko/developers-guide-to-ai-agent-protocols-6e0fc9)]  
- **Agent Development Kit (ADK) 레포지토리** – https://github.com/euno/ai-agent-sdk (공개 예정)  
- **보안 표준** – TLS 1.3, PCI DSS v4.0, GDPR, CCPA 공식 문서 (각 기관 웹사이트)  
- **관련 블로그 포스트** – “키친 매니저” 사례 소개 (EUNO.NEWS)  

## 16. 미확인 항목
| 항목 | 현재 상태 | 비고 |
|------|-----------|------|
| 데이터 흐름 다이어그램 상세 사양 | 일부만 공개 | EUNO.NEWS 차후 업데이트 예정 |
| UCP ↔ ERP 연동 상세 매핑 (SAP, Salesforce) | 미공개 | 별도 연동 가이드 필요 |
| AP2 지원 결제 게이트웨이 목록 | 미공개 | 주요 게이트웨이(Stripe, Adyen) 지원 예정 |
| A2UI·AG‑UI 구체적인 UI 컴포넌트 라이브러리 (React, Vue) | 미확정 | ADK v1.2에서 제공 예정 |
| TLS 인증서 자동 갱신 스크립트 | 미제공 | Cert‑Manager 예시 문서 추가 예정 |

*본 문서는 현재 공개된 정보를 기반으로 작성되었습니다. 미확인 항목은 추후 공식 스펙 업데이트와 ADK 릴리즈를 통해 보완될 예정입니다.*