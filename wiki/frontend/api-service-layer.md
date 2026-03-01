---
title: 프론트엔드 API 서비스 레이어 설명
author: SEPilot AI
status: published
tags: [frontend, api, service-layer, documentation, coverage]
redirect_from:
  - api
order: 1
related_docs: ["wiki-api.md"]
updatedAt: 2026-02-24
quality_score: 81
---

## 1. 문서 개요
**목적**  
프론트엔드 애플리케이션이 백엔드와 통신할 때 사용하는 공통 API 클라이언트 로직(`src/services/api.ts`)을 이해하고, 유지·보수·확장에 필요한 정보를 제공한다.  

**대상 독자**  
- 프론트엔드 개발자 (신규 입사자 포함)  
- QA 엔지니어 및 테스트 자동화 담당자  
- 아키텍처 리뷰어 및 문서 담당자  

**역할**  
`services/api.ts`는 HTTP 요청/응답 처리, 에러 핸들링, 토큰 자동 갱신 등 **백엔드와의 통신 전반**을 캡슐화한다. 이를 통해 UI 레이어는 비즈니스 로직에 집중하고, 네트워크 관련 구현은 한 곳에 집중시킬 수 있다.  

**커버리지 분석 결과 요약**  

| 항목 | 내용 |
|------|------|
| **모듈** | `services/api.ts` |
| **소스 경로** | `src/services/api.ts` |
| **중요도** | **high** (백엔드와의 모든 통신을 담당) |
| **문서 필요 사유** | 요청/응답 흐름, 에러 처리, 토큰 재발급 로직 등 핵심 로직이 포함돼 있어 신규 개발자와 운영팀 모두에게 필수적인 가이드가 필요함 |

---

## 2. 서비스 레이어 아키텍처 개요
### 2.1 전체 프론트엔드 아키텍처에서 위치
- UI 컴포넌트 → **서비스 레이어(`api.ts`)** → HTTP 클라이언트(Axios 혹은 fetch) → 백엔드 API  
- 서비스 레이어는 UI와 네트워크 사이의 **추상화 계층**으로, 데이터 페칭·전송 로직을 중앙집중화한다. (Medium 기사 “프론트엔드 아키텍처: API 요청 관리” 참고)  

### 2.2 `services/api.ts` 의 책임 범위
- HTTP 메서드별 헬퍼 함수 제공 (GET, POST, PUT, DELETE 등)  
- 공통 헤더(Authorization, Content-Type 등) 자동 삽입  
- 응답 정규화 및 성공/실패 판별  
- 전역 에러 로깅·모니터링 연동  
- Access/Refresh 토큰 자동 갱신 로직 구현  

### 2.3 외부 의존성
| 의존성 | 용도 | 참고 |
|--------|------|------|
| **Axios** (또는 fetch) | HTTP 요청/응답 처리 | 일반적인 프론트엔드 API 클라이언트 구현에 사용됨 (Medium) |
| **토큰 저장소** (예: `localStorage`, `sessionStorage`, 쿠키) | Access/Refresh 토큰 보관 | 보안 고려사항 섹션에서 상세히 다룸 |
| **인터셉터** | 요청 전/후 공통 로직(헤더 삽입, 토큰 재발급) | Axios 인터셉터 활용이 일반적 |
| **타입 정의 파일** (`*.d.ts`) | API 응답 타입 및 파라미터 정의 | TypeScript 기반 프로젝트에서 타입 안전성 확보 |

---

## 3. 파일 및 디렉터리 구조
```
src/
 └─ services/
     ├─ api.ts          ← 메인 API 클라이언트
     ├─ interceptors.ts ← 요청·응답 인터셉터 정의 (예시)
     └─ types.ts        ← API 요청·응답 인터페이스
```

- `api.ts`는 **public API**(예: `get`, `post`, `put`, `delete`)를 export하고, 내부적으로 인터셉터와 타입을 활용한다.  
- `interceptors.ts`(존재한다면)에서는 토큰 자동 갱신 로직과 에러 전역 처리 로직을 구현한다.  
- `types.ts`는 각 엔드포인트가 반환하는 데이터 구조를 정의해 TypeScript 컴파일 타임에 검증한다.  

> **추가 조사 필요**: 현재 레포지토리에서 실제 `interceptors.ts`·`types.ts` 파일 존재 여부와 구체적인 export 형태를 확인해야 함.

---

## 4. 핵심 기능 상세
### 4.1 요청(Request) 처리
- **헬퍼 함수**: `get<T>(url, config)`, `post<T>(url, data, config)` 등 타입 파라미터 `T`를 통해 응답 타입을 명시한다.  
- **파라미터 직렬화**: 객체를 쿼리스트링으로 변환해 GET 요청에 포함한다. (Axios 기본 동작)  
- **공통 헤더 삽입**: `Authorization: Bearer <accessToken>` 및 `Content-Type: application/json` 등을 자동으로 추가한다.  

### 4.2 응답(Response) 처리
- **정규화**: 서버가 반환하는 `{ data, meta, pagination }` 형태를 일관된 구조로 변환한다.  
- **성공/실패 판별**: HTTP 2xx는 성공, 그 외는 실패로 간주하고, `response.status`에 따라 분기한다.  
- **페이징·메타데이터 추출**: `meta` 혹은 `pagination` 필드를 별도 객체로 분리해 UI 레이어에 전달한다.  

### 4.3 에러 핸들링
- **네트워크 오류·타임아웃**: Axios 인터셉터에서 `error.code`를 검사해 재시도 정책을 적용한다.  
- **HTTP 상태 코드 별 처리**: 401(Unauthorized) → 토큰 재발급 흐름; 403(Forbidden) → 접근 제한 메시지; 5xx → 전역 알림 및 로깅.  
- **사용자 친화적 메시지 매핑**: 서버 오류 코드를 프론트엔드 메시지(`'서버에 문제가 발생했습니다.'`)와 매핑한다.  
- **전역 로깅·모니터링 연동**: Sentry·Datadog 등 외부 모니터링 툴에 에러 정보를 전송한다.  

### 4.4 토큰 자동 갱신
- **흐름**:  
  1. 요청 인터셉터에서 `Authorization` 헤더에 현재 Access Token 삽입.  
  2. 401 응답이 오면 응답 인터셉터가 Refresh Token을 사용해 새로운 Access Token을 발급받는다.  
  3. 재발급 성공 시 원래 요청을 **재시도**하고, 실패 시 로그아웃 처리한다.  
- **무한 루프 방지**: 재시도 횟수를 1회로 제한하고, 재시도 중에도 401이 발생하면 즉시 로그아웃한다.  

> **추가 조사 필요**: 현재 구현에서 Refresh Token 저장 위치와 재발급 API 엔드포인트가 어떻게 정의돼 있는지 확인이 필요함.

### 4.5 복잡한 데이터 페칭 문제와 권장 패턴
#### Problem statement – useQuery & Promise.all 스파게티
마이크로서비스 기반 백엔드에서는 하나의 엔티티가 여러 다른 엔티티의 ID를 참조합니다.  
예시 흐름:

1. 티켓 조회 → `assigneeId` 반환  
2. 담당자 조회 → `teamId` 반환  
3. 팀 조회 → `leadUserId` 반환  
4. 워처 목록 조회 → 각각 `userId` 반환  
5. 역할(Role) 조회 등…

각 ID마다 별도 API 호출을 수행하면 **중복 요청**이 빈번해지고, 컴포넌트마다 `useQuery`, `Promise.all`, `null 체크` 로직이 난무합니다. 결과적으로:

- **네트워크 트래픽 급증**  
- **렌더링 최적화 어려움** (불필요한 재렌더)  
- **타입 안전성 저하** (any/unknown 사용)  
- **보일러플레이트 증가** (새 필드 추가 시 코드 복잡도 급증)

#### Recommended patterns
| 패턴 | 핵심 아이디어 | 적용 시 장점 |
|------|---------------|--------------|
| **TanStack Query (React Query)** | 쿼리 키 기반 캐싱·중복 제거, 자동 재시도, 배치 옵션 | 동일 키에 대한 중복 호출 방지, UI 상태 관리 간소화 |
| **SWR** | Stale‑While‑Revalidate 전략, 전역 캐시 | 간단한 API 호출에 적합, 자동 재검증 |
| **Batching / Reference Resolver** | 여러 ID를 한 번에 묶어 백엔드에 요청 → 중복 ID 제거 | 네트워크 호출 횟수 최소화, 서버 부하 감소 |
| **@nimir/references** (오픈소스) | `defineReferences` 로 소스와 필드 매핑 정의 → 자동 배치·중복·캐시·중첩 탐색 제공 | 타입‑안전, 최대 10단계 중첩 지원, React Hook 으로 손쉽게 사용 |

#### Refactoring example with `@nimir/references`
```ts
// 1️⃣ reference 정의 (src/references.ts)
import { defineReferences } from '@nimir/references';

export const refs = defineReferences(c => ({
  User: c.source({ batch: ids => fetchUsers(ids) }),   // ids: string[]
  Team: c.source({ batch: ids => fetchTeams(ids) }),
  Role: c.source({ batch: ids => fetchRoles(ids) }),
}));
```

```ts
// 2️⃣ 컴포넌트에서 사용 (React + TanStack Query)
import { refs } from '@/references';
import { useQuery } from '@tanstack/react-query';
import { useGetTicket } from '@/services/ticket';

function TicketCard({ ticketId }: { ticketId: string }) {
  // 기본 티켓 조회 (React Query)
  const { data: ticket, isLoading } = useQuery(['ticket', ticketId], () => useGetTicket(ticketId));

  // reference resolver를 이용해 연관 데이터 일괄 해결
  const { result, status, error } = refs.use(ticket, {
    fields: {
      assigneeId: {
        source: 'User',
        fields: {
          teamId: {
            source: 'Team',
            fields: { leadUserId: 'User' },
          },
          roleIds: 'Role',
        },
      },
      watcherIds: 'User',
    },
  });

  if (isLoading || status === 'loading') return <Spinner />;
  if (error) return <ErrorBox>{error.message}</ErrorBox>;

  return (
    <div>
      <h2>{ticket.title}</h2>
      <p>Assignee: {result.assigneeIdT?.name ?? '—'}</p>
      <p>Team Lead: {result.assigneeIdT?.teamIdT?.leadUserIdT?.name ?? '—'}</p>
      <p>Watchers: {result.watcherIdsT?.map(u => u.name).join(', ')}</p>
    </div>
  );
}
```

**핵심 포인트**
- `fetchUsers`, `fetchTeams`, `fetchRoles` 등 **배치 API**를 한 번만 호출하고, 내부에서 중복 ID를 자동 제거합니다.  
- `result` 객체에 원본 필드 뒤에 `T`(예: `assigneeIdT`)가 붙어 **타입‑안전하게** 변환된 데이터를 제공합니다.  
- React Query와 결합하면 **데이터 페칭 상태**(`loading`, `error`)를 그대로 재사용할 수 있어 UI 로직이 간결해집니다.  

#### 기타 적용 팁
- **Depth limit**: `@nimir/references`는 기본 10단계 깊이 제한을 두어 무한 순환을 방지합니다. 필요 시 `c.options({ depth: 20 })` 로 조정 가능.  
- **플러그인 캐시**: 메모리 캐시 외에 `IndexedDB`(via `idb-keyval`) 혹은 Redis 플러그인을 연결해 페이지 전환 시에도 데이터 재사용을 극대화합니다.  
- **SWR와 혼용**: `refs.use` 로 반환된 데이터를 `useSWR` 로 감싸면 자동 재검증 및 stale‑while‑revalidate 전략을 동시에 활용할 수 있습니다.

---

## 5. 사용 예시
- **기본 GET 호출**  
  `const users = await get<User[]>('/api/users');`  

- **POST with JSON Body**  
  `await post('/api/posts', { title, content });`  

- **파일 업로드 (멀티파트)**  
  `await post('/api/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });`  

- **인증이 필요한 엔드포인트**  
  `await get('/api/profile'); // 인터셉터가 자동으로 토큰 삽입`  

> 실제 코드 예시는 프로젝트 내 `src/services/api.ts`를 참고하고, 필요 시 `interceptors.ts`에 정의된 로직을 검토한다.

---

## 6. 확장 및 커스터마이징
- **인터셉터 추가/제거**: `apiInstance.interceptors.request.use(customInterceptor)` 형태로 새로운 로직을 삽입한다.  
- **커스텀 헤더 삽입**: 호출 시 `config.headers`에 추가하면 인터셉터가 병합한다.  
- **테스트 환경(모킹) 설정**: Jest·MSW(Mock Service Worker)를 사용해 `api.ts`의 Axios 인스턴스를 모킹한다.  

---

## 7. 테스트 전략
| 테스트 종류 | 대상 | 주요 포인트 |
|------------|------|-------------|
| **단위 테스트** | 헬퍼 함수(`get`, `post` 등) | 파라미터 직렬화, 헤더 삽입 검증 (Jest + axios-mock-adapter) |
| **통합 테스트** | 실제 API 엔드포인트와 연동 | 성공/실패 시 응답 구조, 토큰 재발급 흐름 검증 |
| **CI/CD 자동화** | Pull Request 단계 | `npm test` 실행, 커버리지 80% 이상 목표 (nodebestpractices 참고) |

---

## 8. 보안 고려사항
- **토큰 저장소 선택**:  
  - `httpOnly` 쿠키 → XSS 방어에 유리하지만 CSRF 방어 필요.  
  - `localStorage`/`sessionStorage` → XSS 위험 존재, 토큰 암호화 필요.  
- **CSRF 방어**: `SameSite=Lax` 쿠키 설정 또는 CSRF 토큰 헤더 전송.  
- **XSS 예방**: 모든 입력값을 이스케이프하고, Content Security Policy(CSP) 적용.  
- **민감 데이터 마스킹**: 로그에 토큰·비밀번호 등은 `***` 로 마스킹하고, 로깅 레벨을 조절한다.  

---

## 9. 성능 최적화
- **요청 중복 방지(디듀핑)**: 동일 URL·파라미터에 대한 병렬 요청을 하나로 합친 뒤 결과를 공유한다.  
- **캐시 전략**:  
  - 메모리 캐시(React Query, SWR) → 최신 데이터와 재요청 최소화.  
  - IndexedDB 혹은 Service Worker 캐시 → 오프라인 지원.  
- **타임아웃·재시도 정책**: Axios `timeout` 옵션과 지수 백오프 재시도 로직을 적용한다.  

---

## 10. 베스트 프랙티스
- **API 명명 규칙**: 리소스는 명사 형태, 동사는 HTTP 메서드로 표현한다 (velog “22 Best Practices” 참고).  
- **에러 코드·메시지 표준화**: 서버와 클라이언트가 공유하는 에러 코드 사전 정의.  
- **문서·타입 정의 유지**: `src/services/types.ts`에 인터페이스를 선언하고, 변경 시 문서와 테스트를 동시에 업데이트한다.  

---

## 11. 마이그레이션 가이드
1. **기존 fetch 기반 구현 파악** – 현재 `fetch` 호출이 있는 파일을 식별한다.  
2. **API 레이어 설치** – `src/services/api.ts`와 의존 파일을 프로젝트에 추가한다.  
3. **호출 교체** – `fetch(url, options)` → `get<T>(url)` 혹은 `post<T>(url, data)` 로 교체한다.  
4. **헤더·토큰 로직 검증** – 새 레이어가 자동으로 Authorization 헤더를 삽입하는지 확인한다.  
5. **테스트 실행** – 기존 단위 테스트와 새 레이어 테스트를 모두 통과하는지 검증한다.  

---

## 12. Next.js 16 캐싱 전략 및 프로덕션 패턴
Next.js 16에서는 **데이터 기반 캐싱**이 핵심 개념으로 도입되었습니다. `fetch` 호출마다 `next` 옵션을 통해 재검증, 태그, Draft Mode 등을 선언적으로 제어할 수 있습니다. 아래는 주요 기능과 실제 프로덕션에서 활용하는 패턴을 정리한 내용입니다.

### 12.1 Revalidation (재검증)
- **기본 개념**: `next: { revalidate: <seconds> }` 옵션은 ISR과 유사하게 동작하지만, fetch 레벨에서 직접 지정한다.  
- **동작 방식**: 지정된 초가 지나면 백그라운드에서 새 데이터를 가져와 캐시를 업데이트한다. 사용자는 기존(stale) 데이터를 즉시 보며, 다음 요청부터 최신 데이터가 제공된다.  

```tsx
export default async function Page() {
  const data = await fetch('/api/posts', {
    next: { revalidate: 60 }   // 60초마다 백그라운드 재검증
  }).then(res => res.json());

  return <PostsList posts={data} />;
}
```

- **강제 재검증**: 서버 액션이나 API 라우트에서 `revalidatePath('/posts')` 를 호출하면 해당 경로의 캐시를 즉시 무효화한다.  

```ts
export async function POST(request: Request) {
  // DB 업데이트 로직 …
  await revalidatePath('/posts');   // 지정 경로 캐시 즉시 무효화
  return new Response('OK');
}
```

### 12.2 Tags 기반 무효화
- **태그 개념**: `next: { tags: ['tagName'] }` 로 데이터 의존성을 선언하면, 동일 태그를 가진 모든 캐시 엔트리를 한 번에 무효화할 수 있다.  
- **사용 예시**  

```tsx
// posts/[id]/page.tsx
export default async function Post({ params }) {
  const post = await fetch(`/api/posts/${params.id}`, {
    next: { tags: ['post'] }
  }).then(res => res.json());
  return <PostDetail post={post} />;
}

// comments/[postId]/page.tsx
export default async function Comments({ params }) {
  const comments = await fetch(`/api/comments?postId=${params.postId}`, {
    next: { tags: ['comment'] }
  }).then(res => res.json());
  return <CommentsList comments={comments} />;
}
```

- **태그 무효화**: 댓글이 추가될 때 `revalidateTag('comment')` 를 호출하면, `comment` 태그와 연결된 모든 페이지가 재검증된다.  

```ts
export async function POST(request: Request) {
  // 댓글 저장 로직 …
  await revalidateTag('comment');   // 관련 캐시 전체 무효화
  return new Response('Comment added');
}
```

### 12.3 Draft Mode 활용법
- **개념**: Draft Mode는 아직 퍼블리시되지 않은 콘텐츠를 실시간으로 미리보기 할 수 있는 프리뷰 환경이다. 활성화된 요청은 캐시를 건너뛰고 최신 데이터를 직접 조회한다.  
- **활성화 / 비활성화**  

```ts
// app/api/draft/activate/route.ts
import { draftMode } from 'next/headers';
export async function GET() {
  draftMode().enable();   // Draft Mode 켜기
  return new Response('Draft mode enabled');
}

// app/api/draft/deactivate/route.ts
import { draftMode } from 'next/headers';
export async function GET() {
  draftMode().disable();  // Draft Mode 끄기
  return new Response('Draft mode disabled');
}
```

- **Draft Mode와 캐시**: Draft Mode가 켜진 경우 `next: { revalidate: 0 }` 로 no‑cache를 지정한다.  

```tsx
export default async function Page() {
  const data = await fetch('/api/posts', {
    next: { revalidate: 0 }   // Draft Mode이면 캐시 무시
  }).then(res => res.json());
  return <PostsList posts={data} />;
}
```

### 12.4 실제 프로덕션 캐시 파이프라인 예시
1. **데이터 레이어와 캐시 전략 분리**  
   - API 라우트에서 비즈니스 로직을 수행하고, `revalidateTag`/`revalidatePath` 로 캐시를 관리한다.  
   - 페이지/컴포넌트에서는 `fetch(..., { next: { tags, revalidate } })` 만 선언해 의존성을 명시한다.  

2. **태그 기반 무효화 + 재검증 조합**  

```ts
// 게시글 업데이트 API
export async function PUT(request: Request) {
  // DB 업데이트 …
  await Promise.all([
    revalidateTag('post'),      // 게시글 페이지 무효화
    revalidateTag('comment')    // 댓글 리스트 무효화
  ]);
  return new Response('Post updated');
}
```

3. **ISR + Draft Mode 혼합**  

```tsx
export default async function Post({ params }) {
  const isDraft = draftMode().isEnabled;
  const data = await fetch(`/api/posts/${params.slug}`, {
    next: {
      revalidate: isDraft ? 0 : 30,   // Draft이면 no‑cache, 일반이면 30초 ISR
      tags: ['post']
    }
  }).then(res => res.json());
  return <PostDetail post={data} />;
}
```

4. **Edge Middleware와 캐시 헤더**  
   - CDN 레벨에서 세밀한 캐시 정책을 적용하기 위해 `Cache-Control` 헤더를 직접 설정한다.  

```ts
// middleware.ts
import { NextResponse } from 'next/server';
export function middleware(request) {
  const response = NextResponse.next();
  if (request.nextUrl.pathname.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'public, max-age=5, stale-while-revalidate=30');
  }
  return response;
}
```

위 패턴들을 조합하면 **성능**, **데이터 신선도**, **정밀한 무효화**를 동시에 만족하는 프로덕션 수준의 캐시 전략을 구현할 수 있다.

---

## 13. FAQ
- **Q: 토큰 갱신이 실패하면 어떻게 해야 하나요?**  
  A: 인터셉터에서 401 응답이 두 번 연속 발생하면 `logout()`을 호출해 세션을 종료하고 로그인 페이지로 리다이렉트한다.  

- **Q: CORS 오류가 발생했을 때 점검 포인트는?**  
  A: 서버의 `Access-Control-Allow-Origin` 헤더와 프론트엔드 요청에 포함된 `Origin`이 일치하는지, 프리플라이트 요청이 정상 처리되는지 확인한다.  

- **Q: 테스트 환경에서 실제 API 호출을 차단하려면?**  
  A: Jest 설정 파일에 `axios` 모듈을 `jest.mock('axios')` 로 모킹하거나, MSW를 사용해 네트워크 요청을 가로채고 가짜 응답을 반환한다.  

---

## 14. 참고 자료
- **프론트엔드 아키텍처: API 요청 관리** – Medium (https://medium.com/@junep/%ED%94%84%EB%A0%88%EC%9D%B4%ED%8A%B8-%EC%95%84%ED%82%A4%ED%85%90%EC%B2%B4-%EC%97%94%EC%8B%9C-%EC%9D%B8%ED%84%B0%ED%8F%AC%EC%9D%B8-113c31d7bcee)  
- **Grab Front End Guide** – 네이버 블로그 (https://m.blog.naver.com/magnking/221149133410)  
- **Node.js Best Practices (Korean)** – GitHub (https://github.com/goldbergyoni/nodebestpractices/blob/master/README.korean.md)  
- **API Design Best Practices** – velog (https://velog.io/@juunini/%EB%B8%94%EB%84%88-%22-22-Best-Practices-to-Take-Your-API-Design-Skills-to-the-Next-Level)  
- **Next.js 16 캐싱 설명: 재검증, 태그, Draft Mode, 실제 프로덕션 패턴** – euno.news (https://euno.news/posts/ko/nextjs-16-caching-explained-revalidation-tags-draf-2d1797)  
- **React 데이터 페칭 스파게티 해결** – euno.news (https://euno.news/posts/ko/i-got-tired-of-usequerypromiseall-spaghetti-so-i-b-1d6841)  
- **@nimir/references** – npm (https://www.npmjs.com/package/@nimir/references)  
- **TanStack Query 공식 블로그** – https://tanstack.com/query/v4  

---