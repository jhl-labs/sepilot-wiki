---
title: Wiki 페이지 API 라우트 상세 가이드
author: SEPilot AI
status: draft
tags: [API, Wiki, 라우트, 인증, 문서화]
---

## 1. 문서 개요
**목적**  
`app/api/wiki/[...slug]/route.ts` 파일이 제공하는 Wiki 페이지 API 엔드포인트의 사용 방법을 외부 개발자와 내부 팀에게 명확히 안내합니다.  

**대상 독자**  
- 프론트엔드·백엔드 개발자  
- API 소비자(외부 파트너)  
- 운영·보안 담당자  

**주요 기능 요약**  
- Wiki 페이지 조회, 생성, 수정, 삭제 지원  
- 계층형 경로(`slug`)를 통한 페이지 식별  
- JWT 기반 인증·인가 적용 및 표준화된 응답 포맷  

**버전 정보 및 적용 범위**  
- 현재 API 버전: `v1` (프로젝트 루트 `package.json`에 정의)  
- 적용 범위: `app/api/wiki/[...slug]/route.ts`에 매핑된 모든 HTTP 메서드  

> **참고**: 본 가이드는 로버트의 API 문서 작성 가이드라인을 참고하여 구성되었습니다[[API 문서 작성을 위한 로버트의 가이드라인](https://koko8829.tistory.com/2496)].

---

## 2. 인증·인가 흐름
| 항목 | 내용 |
|------|------|
| **지원 인증 방식** | **JWT (JSON Web Token)** 를 `Authorization: Bearer <token>` 헤더에 담아 전달합니다. 토큰은 `HS256` 알고리즘으로 서명되며, `exp` 클레임을 통해 만료 시간이 관리됩니다. |
| **토큰 전달 방법** | - `Authorization` 헤더 (권장) <br> - HTTP‑Only `session_token` 쿠키 (옵션, SameSite=Lax) |
| **권한 레벨 별 접근 제한** | - **읽기**(GET): 인증된 모든 사용자 허용 <br> - **작성·수정·삭제**(POST, PUT/PATCH, DELETE): `editor` 또는 `admin` 역할 필요 |
| **인증 실패 시 응답** | `401 Unauthorized` 와 아래와 같은 JSON 바디 반환 <br> ```json { "errorCode":"UNAUTHORIZED", "message":"Invalid or missing token." }``` |

**요약**  
API는 JWT 기반 Bearer 토큰을 기본 인증 수단으로 사용합니다. 토큰이 없거나 유효하지 않을 경우 401 오류가 반환되며, 쓰기·삭제 작업은 `editor` 이상 권한이 요구됩니다.

---

## 3. 라우트 구조 및 파라미터
- **파일 위치**: `app/api/wiki/[...slug]/route.ts`  
- **라우트 매핑**: Next.js App Router의 와일드카드 `[...]` 로 `/api/wiki/*` 경로 전체를 처리합니다.  

### `slug` 파라미터
- **형식**: 계층형 경로 문자열 배열 (`string[]`). 예시: `/api/wiki/technology/web/react` → `slug = ["technology","web","react"]`.  
- **역할**: Wiki 페이지의 고유 경로를 식별하며, 페이지 트리 구조를 그대로 반영합니다.  

### 지원 HTTP 메서드
| 메서드 | 동작 |
|-------|------|
| **GET** | 페이지 조회 |
| **POST** | 새 페이지 생성 |
| **PUT** / **PATCH** | 기존 페이지 전체/부분 업데이트 |
| **DELETE** | 페이지 삭제 (soft / hard) |

### 지원 쿼리 파라미터
| 파라미터 | 타입 | 설명 | 기본값 |
|----------|------|------|--------|
| `preview` | boolean | 미발행(초안) 페이지를 조회할 때 `true` 로 설정 | `false` |
| `includeDeleted` | boolean | 소프트 삭제된 페이지를 포함해 조회 (`true` 시) | `false` |
| `mode` | string (`soft` \| `hard`) | DELETE 요청 시 삭제 방식 지정. 지정하지 않으면 `soft` 가 기본 | `soft` |

**요약**  
`slug` 로 페이지를 식별하고, `preview`, `includeDeleted`, `mode` 같은 쿼리 파라미터로 조회·삭제 동작을 세밀하게 제어할 수 있습니다.

---

## 4. 엔드포인트 상세

### 4‑1. Wiki 페이지 조회 (GET)
- **요청 URL**: `GET /api/wiki/{slug...}`  
- **필수 파라미터**: `slug` (경로)  
- **선택 파라미터**: `preview`, `includeDeleted`  

**성공 응답** (`200 OK`)  

    {
        "title": "React 소개",
        "content": "React는 ...",
        "metadata": {
            "authorId": "u123",
            "createdAt": "2024-02-01T12:34:56Z",
            "updatedAt": "2024-02-10T08:20:00Z",
            "version": 3,
            "deleted": false
        }
    }

- **ETag** 헤더가 포함되어 낙관적 잠금에 활용됩니다.  
- **캐시**: `Cache-Control: private, max-age=60`  

**요약**  
GET 은 `slug` 로 페이지를 조회하고, `preview`·`includeDeleted` 로 초안·삭제된 페이지 접근을 제어합니다. 성공 시 페이지 데이터와 메타데이터를 반환합니다.

---

### 4‑2. Wiki 페이지 생성 (POST)
- **요청 URL**: `POST /api/wiki/{slug...}`  
- **요청 헤더**: `Content-Type: application/json`  
- **요청 바디**  

    {
        "title": "새 페이지 제목",
        "content": "본문 내용",
        "metadata": {
            "tags": ["frontend", "react"]
        }
    }

- **자동 메타데이터**: 서버가 `authorId`(토큰에서 추출), `createdAt`, `updatedAt`, `version(=1)`, `deleted(false)` 를 삽입합니다.  

**성공 응답** (`201 Created`)  

- `Location` 헤더에 새 페이지 URL (`/api/wiki/{slug...}`) 제공  
- 응답 본문에 생성된 리소스 전체 반환 (위 GET 응답과 동일 포맷)  

**요약**  
POST 로 새 페이지를 만들 때 클라이언트는 `title`, `content`, 선택적 `metadata.tags` 만 제공하면 됩니다. 서버는 인증 토큰에서 사용자 정보를 추출해 메타데이터를 자동 채웁니다.

---

### 4‑3. Wiki 페이지 수정 (PUT / PATCH)
- **요청 URL**: `PUT /api/wiki/{slug...}` (전체 교체) 또는 `PATCH /api/wiki/{slug...}` (부분 업데이트)  
- **필수 헤더**: `If-Match: "<ETag>"` (버전 충돌 방지)  
- **요청 바디** (예시)  

    {
        "title": "수정된 제목",
        "content": "수정된 내용",
        "metadata": {
            "tags": ["updated"]
        }
    }

- **동시성 제어**: `If-Match` 값이 현재 `ETag` 와 일치하지 않으면 `409 Conflict` 반환.  

**성공 응답** (`200 OK`)  

    {
        "title": "수정된 제목",
        "content": "수정된 내용",
        "metadata": {
            "authorId": "u123",
            "updatedAt": "2024-05-01T10:15:30Z",
            "version": 4,
            "deleted": false
        }
    }

**요약**  
PUT/PATCH 는 `If-Match` 헤더를 통해 낙관적 잠금을 구현합니다. 전체 교체는 PUT, 부분 업데이트는 PATCH 로 구분됩니다.

---

### 4‑4. Wiki 페이지 삭제 (DELETE)
- **요청 URL**: `DELETE /api/wiki/{slug...}`  
- **쿼리 파라미터**: `mode=soft` (기본) 혹은 `mode=hard`  

**동작**  
- **soft**: `deleted` 플래그를 `true` 로 설정하고 `deletedAt` 타임스탬프 기록.  
- **hard**: 데이터베이스에서 영구 삭제.  

**성공 응답**  

- **soft delete**: `204 No Content` (본문 없음)  
- **hard delete**: `202 Accepted` 와 작업 ID 반환 (비동기 처리 시)  

    {
        "taskId": "del-20240501-abc123",
        "status": "queued"
    }

**요약**  
DELETE 은 기본적으로 소프트 삭제를 수행합니다. `mode=hard` 를 지정하면 즉시 영구 삭제가 진행되며, 비동기 처리 시 202 응답과 작업 ID가 반환됩니다.

---

## 5. 요청·응답 예시
### cURL 예시
- **GET (preview 포함)**  

    curl -X GET "https://api.example.com/api/wiki/technology/web/react?preview=true" \
         -H "Authorization: Bearer <token>"

- **POST**  

    curl -X POST "https://api.example.com/api/wiki/technology/web/react" \
         -H "Content-Type: application/json" \
         -H "Authorization: Bearer <token>" \
         -d '{"title":"React 소개","content":"...","metadata":{"tags":["frontend"]}}'

- **PATCH (ETag 사용)**  

    curl -X PATCH "https://api.example.com/api/wiki/technology/web/react" \
         -H "Content-Type: application/json" \
         -H "Authorization: Bearer <token>" \
         -H 'If-Match: "W/\"3\""' \
         -d '{"content":"업데이트된 내용"}'

- **DELETE (hard)**  

    curl -X DELETE "https://api.example.com/api/wiki/technology/web/react?mode=hard" \
         -H "Authorization: Bearer <token>"

### JavaScript fetch 예시
```javascript
// GET with preview
fetch('/api/wiki/technology/web/react?preview=true', {
  method: 'GET',
  headers: { 'Authorization': `Bearer ${token}` }
})
  .then(r => r.json())
  .then(console.log);

// POST new page
fetch('/api/wiki/technology/web/react', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    title: 'React 소개',
    content: '...',
    metadata: { tags: ['frontend'] }
  })
})
  .then(r => r.json())
  .then(console.log);
```

### 응답 JSON 샘플
- **성공 (200)**  

    {
        "title": "React 소개",
        "content": "React는 ...",
        "metadata": {
            "authorId": "u123",
            "createdAt": "2024-02-01T12:34:56Z",
            "updatedAt": "2024-05-01T10:15:30Z",
            "version": 4,
            "deleted": false
        }
    }

- **오류 (404)**  

    {
        "errorCode": "PAGE_NOT_FOUND",
        "message": "Requested wiki page does not exist.",
        "details": { "slug": ["technology","web","react"] }
    }

---

## 6. 오류 처리 및 상태 코드
| 코드 | 의미 | 응답 예시 |
|------|------|-----------|
| **400** | 잘못된 요청(파라미터 누락·형식 오류) | `{ "errorCode":"INVALID_REQUEST", "message":"Missing title.", "details":{...} }` |
| **401** | 인증 실패 | `{ "errorCode":"UNAUTHORIZED", "message":"Invalid or missing token." }` |
| **403** | 권한 부족 | `{ "errorCode":"FORBIDDEN", "message":"Insufficient permissions." }` |
| **404** | 페이지 미존재 | `{ "errorCode":"PAGE_NOT_FOUND", "message":"...", "details":{ "slug": [...] } }` |
| **409** | 버전 충돌(If-Match 불일치) | `{ "errorCode":"VERSION_CONFLICT", "message":"ETag mismatch.", "details":{ "currentVersion":5 } }` |
| **410** | 소프트 삭제된 페이지 접근 | `{ "errorCode":"PAGE_GONE", "message":"Page has been soft‑deleted.", "details":{ "slug": [...] } }` |
| **500** | 서버 내부 오류 | `{ "errorCode":"INTERNAL_ERROR", "message":"Unexpected error.", "details":null }` |

**권장 대응 방안**  

- `400` → 파라미터 검증 로직 강화 (스키마 검증)  
- `401/403` → 토큰 재발급·권한 재검토  
- `409` → 최신 버전 조회 후 `If-Match` 재전송  
- `410` → 복구 API(soft delete 복원) 사용 검토  
- `500` → 로그 확인 후 운영팀에 보고  

---

## 7. 베스트 프랙티스
- **Rate Limiting**: 1분당 60건 이하 요청 권장. 초과 시 `429 Too Many Requests` 반환.  
- **재시도 전략**: 5xx 오류 시 지수 백오프 적용 (예: 100 ms → 200 ms → 400 ms).  
- **데이터 검증**: 서버와 클라이언트 모두 Zod·Joi 등 스키마 검증 사용.  
- **보안**  
  - 입력값에 대한 **SQL/NoSQL 인젝션 방지** 및 **XSS sanitization** 적용.  
  - CSRF 방지를 위해 `SameSite=Lax` 쿠키 또는 `X-CSRF-Token` 헤더 사용 권장.  

**요약**  
안정적인 서비스 운영을 위해 레이트 제한, 재시도 정책, 입력 검증, 그리고 CSRF·XSS 방어를 반드시 적용하십시오.

---

## 8. 테스트·샘플 코드
### 로컬 개발 환경 설정
1. `node` ≥ 18, `pnpm` 설치  
2. 레포지토리 클론 후 `pnpm install` 실행  
3. `.env.local`에 `NEXT_PUBLIC_API_BASE=/api` 등 환경 변수 설정  
4. `pnpm dev` 로 개발 서버 실행 (`http://localhost:3000`)  

### 통합 테스트 시나리오 예시
| 시나리오 | 기대 결과 |
|----------|-----------|
| **GET 존재 페이지** | `200 OK` + 페이지 데이터 |
| **GET 비존재 페이지** | `404 NOT FOUND` |
| **POST 인증된 사용자** | `201 Created` + `Location` 헤더 |
| **PUT 버전 충돌** (`If-Match` 불일치) | `409 CONFLICT` |
| **DELETE soft** | `204 No Content` |
| **DELETE hard** (비동기) | `202 Accepted` + 작업 ID |

### Mock 서버 활용
`msw`(Mock Service Worker) 로 `GET /api/wiki/*` 등 핸들러를 등록해 프론트엔드 테스트에 활용합니다.

**요약**  
위 절차대로 로컬 환경을 구성하고, 표에 제시된 시나리오를 자동화 테스트에 포함하면 API 구현 검증이 용이합니다.

---

## 9. 변경 로그 & 버전 관리
| 날짜 | 버전 | 변경 내용 | 영향 |
|------|------|-----------|------|
| 2024-02-20 | v1.0.0 | 최초 문서 초안 작성 | 전체 가이드 제공 |
| 2024-03-05 | v1.1.0 | 인증·인가 섹션에 JWT 상세 추가 | 보안 가이드 보강 |
| 2024-04-12 | v1.2.0 | 오류 코드 표에 409·410 추가 | 개발자 오류 처리 개선 |
| 2024-05-08 | v1.3.0 | 쿼리 파라미터(`preview`, `includeDeleted`, `mode`) 및 soft/hard delete 설명 추가 | 사용성 향상 |

**마이그레이션 가이드**  
- 기존 `slug` 기반 경로는 그대로 유지됩니다.  
- 삭제 옵션이 새롭게 `mode` 파라미터로 노출되므로, 기존 클라이언트는 기본 soft delete 동작에 영향이 없습니다.  
- `preview` 와 `includeDeleted` 파라미터는 선택 사항이며, 기존 호출에 영향을 주지 않습니다.  

---

## 10. 참고 자료
- **API 문서 작성 가이드라인** – 로버트의 가이드라인[[API 문서 작성을 위한 로버트의 가이드라인](https://koko8829.tistory.com/2496)]  
- **Next.js App Router 문서** – 공식 문서([Next.js Docs](https://nextjs.org/docs/app/building-your-application/routing))  
- **OAuth 2.0 표준** – RFC 6749([IETF RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749))  
- **JWT (JSON Web Token)** – RFC 7519([IETF RFC 7519](https://datatracker.ietf.org/doc/html/rfc7519))  

> **주의**: 본 문서는 현재 확인 가능한 구현을 기반으로 작성되었습니다. 향후 코드 변경 시 해당 섹션을 업데이트하십시오.