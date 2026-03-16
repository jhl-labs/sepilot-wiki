---
title: 프론트엔드 API 클라이언트 서비스 가이드
author: SEPilot AI
status: published
tags: [frontend, api-client, typescript, documentation, coverage]
---

## 1. 문서 소개
### 목적 및 대상 독자
이 가이드는 프론트엔드 애플리케이션에서 백엔드 REST 엔드포인트를 호출하는 핵심 모듈 **services/api.ts** 를 이해하고 올바르게 활용하고자 하는 개발자를 대상으로 합니다.  
- 신규 프론트엔드 개발자  
- 기존 프로젝트에 API 클라이언트를 도입·리팩터링하려는 팀  
- 테스트·CI 파이프라인을 구축하고자 하는 엔지니어  

### 문서 구성 및 활용 방법
| 섹션 | 내용 |
|------|------|
| 2. API 클라이언트 서비스 개요 | 모듈 위치·역할·의존성 |
| 3. 초기 설정 및 설치 | npm/yarn 설치·TS 설정·환경 변수 |
| 4. 기본 사용법 | 인스턴스 생성·HTTP 메서드별 호출 |
| 5. 인증 토큰 처리 | 저장·자동 삽입·갱신 흐름 |
| 6. 에러 핸들링 전략 | 공통 에러 구조·코드별 처리 |
| 7. 요청·응답 타입 정의 | TypeScript 인터페이스·제네릭 |
| 8. 고급 기능 | 요청 취소·배치·캐시 |
| 9. 테스트 및 모킹 | Jest·MSW 설정·CI 연동 |
| 10. 베스트 프랙티스 | 명명·로깅·성능 최적화 |
| 11. FAQ | 흔히 마주치는 문제와 해결책 |
| 12. 참고 자료 | 외부 가이드·링크 |

문서를 읽은 뒤 **예제 코드**와 **체크리스트**를 활용해 프로젝트에 바로 적용할 수 있습니다.

---

## 2. API 클라이언트 서비스 개요
### 모듈 위치 및 파일 구조
- 파일 경로: `services/api.ts`  
- 일반적인 구조 (예시)  
    - `axiosInstance` 혹은 `fetch` 래퍼 정의  
    - 인터셉터(인증·에러) 설정  
    - HTTP 메서드별 헬퍼 함수 (`get`, `post`, `put`, `delete`)  

> 구체적인 파일 내용은 현재 리포지터리를 직접 확인해야 합니다. **추가 조사가 필요합니다**.

### 핵심 역할 및 주요 기능 요약
- **REST 엔드포인트 호출**: 프론트엔드 UI와 백엔드 서비스 간 통신 담당  
- **인증 토큰 자동 삽입**: 저장된 토큰을 헤더에 자동 추가  
- **에러 통합 처리**: HTTP 상태 코드·네트워크 오류를 일관된 형태로 변환  
- **타입 안전**: TypeScript 제네릭을 활용해 응답 타입을 명시  

### 의존성 및 외부 라이브러리 소개
| 라이브러리 | 용도 | 공식 문서 |
|------------|------|----------|
| `axios` (또는 `fetch`) | HTTP 요청/응답 래핑 | https://axios-http.com/ |
| `typescript` | 정적 타입 검사 | https://www.typescriptlang.org/ |
| `msw` (Mock Service Worker) | API 모킹·테스트 | https://mswjs.io/ |
| `jest` | 유닛 테스트 프레임워크 | https://jestjs.io/ |

> 실제 프로젝트에서 사용 중인 라이브러리는 `package.json`을 확인해 주세요. **추가 조사가 필요합니다**.

---

## 3. 초기 설정 및 설치
### 프로젝트에 모듈 추가 방법
```bash
npm install axios   # 또는 yarn add axios
npm install --save-dev msw jest   # 테스트용 도구
```

### TypeScript 설정 및 `tsconfig.json` 권장 옵션
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true
  }
}
```
위 옵션은 **TypeScript 공식 가이드**에 따라 엄격 모드와 ES 모듈 호환성을 보장합니다.

### 환경 변수 정의
| 변수 | 설명 | 예시 |
|------|------|------|
| `BASE_URL` | API 서버 기본 URL | `https://api.example.com` |
| `TOKEN_KEY` | 로컬 스토리지·쿠키에 저장할 토큰 키 | `auth_token` |

환경 변수는 `.env` 파일에 선언하고, `dotenv` 패키지(또는 Vite/Next.js 내장 지원)를 통해 로드합니다.  
> 실제 변수명은 프로젝트 설정을 확인해야 합니다. **추가 조사가 필요합니다**.

---

## 4. 기본 사용법
### 인스턴스 생성 및 초기화 예시
```typescript
import { createApiClient } from './services/api';

const api = createApiClient({
  baseURL: process.env.BASE_URL,
  tokenKey: process.env.TOKEN_KEY,
});
```

### HTTP 메서드별 기본 함수 사용법
| 메서드 | 시그니처 (예시) | 설명 |
|--------|----------------|------|
| `get` | `api.get<T>(url: string, params?: object): Promise<ApiResponse<T>>` | GET 요청, 쿼리 파라미터 자동 직렬화 |
| `post` | `api.post<T>(url: string, data: object): Promise<ApiResponse<T>>` | POST 요청, JSON 바디 전송 |
| `put` | `api.put<T>(url: string, data: object): Promise<ApiResponse<T>>` | 전체 업데이트 |
| `delete` | `api.delete<T>(url: string, params?: object): Promise<ApiResponse<T>>` | 삭제 요청 |

> 실제 함수 시그니처는 `services/api.ts`를 확인해 주세요. **추가 조사가 필요합니다**.

### 요청 파라미터와 옵션 설명
- `url`: 엔드포인트 경로 (예: `/users`)  
- `params`: GET/DELETE 요청 시 쿼리 문자열로 변환  
- `data`: POST/PUT 요청 시 전송 바디  
- `config`: `axios` 혹은 `fetch` 옵션 (타임아웃, 헤더 등)  

---

## 5. 인증 토큰 처리
### 토큰 저장·조회 전략
| 저장소 | 장점 | 단점 |
|--------|------|------|
| `localStorage` | 영구 저장, 페이지 새로고침 시 유지 | XSS 위험 |
| `sessionStorage` | 탭 단위 저장, 브라우저 종료 시 삭제 | 새 탭에서 공유 안 됨 |
| `cookie` (HttpOnly) | 서버에서 직접 관리, XSS 방어 | CSRF 위험 (SameSite 옵션 필요) |

### 자동 토큰 삽입 인터셉터 동작 원리
1. 요청 직전 인터셉터가 실행  
2. `TOKEN_KEY` 로 저장된 토큰을 읽어 `Authorization: Bearer <token>` 헤더에 삽입  
3. 토큰이 없으면 요청을 그대로 전송 (또는 401 에러 처리)  

### 토큰 갱신 흐름 및 재시도 메커니즘
1. API 응답이 `401 Unauthorized`이면 토큰 갱신 엔드포인트(`refresh`) 호출  
2. 새 토큰을 저장하고 원래 요청을 **재시도**  
3. 재시도 횟수 제한(예: 1회) 후에도 실패하면 로그아웃 처리  

> 구체적인 갱신 엔드포인트와 재시도 로직은 구현에 따라 다릅니다. **추가 조사가 필요합니다**.

---

## 6. 에러 핸들링 전략
### 공통 에러 구조 정의
```typescript
interface ApiError {
  status: number;   // HTTP 상태 코드
  code: string;     // 백엔드 정의 에러 코드
  message: string;  // 사용자에게 보여줄 메시지
}
```

### HTTP 상태 코드별 처리 로직
| 상태 코드 | 처리 방안 |
|-----------|-----------|
| 4xx (클라이언트 오류) | 입력 검증·사용자 피드백 |
| 401 | 토큰 갱신 후 재시도 (위 섹션 참고) |
| 403 | 권한 부족 알림 |
| 404 | 리소스 없음 UI 표시 |
| 5xx (서버 오류) | 재시도 정책 적용·오류 로깅 |

### 네트워크 오류·타임아웃 처리 방법
- `axios` 의 `timeout` 옵션 사용 (예: 10 000 ms)  
- `AbortController` 로 요청 취소 시 `AbortError` 반환 → 공통 에러 형태로 변환  

### 커스텀 에러 핸들러 등록 방법
```typescript
api.setErrorHandler((error: ApiError) => {
  // 예: Sentry 로 전송
  // logger.error(error);
});
```
> 실제 API 객체가 `setErrorHandler` 메서드를 제공하는지는 구현을 확인해야 합니다. **추가 조사가 필요합니다**.

---

## 7. 요청·응답 타입 정의
### API 스키마 기반 TypeScript 인터페이스 예시
```typescript
interface User {
  id: string;
  name: string;
  email: string;
}
```

### 제네릭을 활용한 응답 래핑
```typescript
interface ApiResponse<T> {
  data: T;
  meta?: {
    total?: number;
    page?: number;
  };
}
```
사용 예시: `api.get<User[]>('/users')` → `Promise<ApiResponse<User[]>>`

### 데이터 변환·정규화 유틸리티 소개
- `normalizr` 같은 라이브러리를 사용해 중첩된 JSON을 평탄화  
- 변환 함수는 `services/api.ts` 내부 혹은 별도 `utils/transform.ts`에 정의  

> 프로젝트에 이미 적용된 변환 로직이 있다면 해당 파일을 참고하세요. **추가 조사가 필요합니다**.

---

## 8. 고급 기능
### 요청 취소 (`AbortController`)
```typescript
const controller = new AbortController();
api.get('/long-running', { signal: controller.signal });
/* 필요 시 */
controller.abort();   // 요청 중단
```

### 병렬 요청·배치 처리 패턴
```typescript
Promise.all([
  api.get<User[]>('/users'),
  api.get<Post[]>('/posts')
]).then(([usersRes, postsRes]) => {
  // 병합 로직
});
```

### 캐시 전략 및 로컬 데이터 동기화
- **메모리 캐시**: 요청 결과를 `Map<string, any>`에 저장, 동일 URL 재요청 시 재사용  
- **Stale‑While‑Revalidate**: 캐시된 데이터를 즉시 반환하고 백그라운드에서 최신 데이터를 가져와 업데이트  
- **React Query** 혹은 **SWR** 와 연동해 자동 캐시·리패칭 구현  

> 구체적인 캐시 구현 여부는 프로젝트 코드를 확인해야 합니다. **추가 조사가 필요합니다**.

---

## 9. 테스트 및 모킹
### 유닛 테스트 환경 설정
```bash
npm install --save-dev jest @types/jest ts-jest msw
```
`jest.config.js` 예시 (생략) – `ts-jest` 로 TypeScript 테스트 지원.

### 인터셉터·미들웨어 테스트 팁
- `msw` 로 실제 네트워크 호출을 가로채고 원하는 응답을 정의  
- 토큰 인터셉터 테스트 시 `localStorage.setItem('TOKEN_KEY', 'test-token')` 후 요청 검증  

### CI/CD 파이프라인 연동 권장 사항
- PR 단계에서 `npm test -- --coverage` 실행  
- 커버리지 기준(예: 80%) 미달 시 빌드 실패  

> 프로젝트에 이미 적용된 CI 설정은 `.github/workflows` 등을 확인하세요. **추가 조사가 필요합니다**.

---

## 10. 베스트 프랙티스
### 일관된 API 명명 규칙
- 엔드포인트는 복수형 명사 사용 (`/users`, `/orders`)  
- 함수명은 HTTP 메서드와 리소스 명을 결합 (`fetchUsers`, `createOrder`)  

### 오류 로깅·모니터링 연동 방법
- **Sentry**, **LogRocket** 등 클라이언트 오류 수집 도구와 연동  
- `api.setErrorHandler` 내부에서 `captureException` 호출  

### 성능 최적화
- **타임아웃**: 10 s 이하로 제한  
- **재시도 정책**: 3회 이하, 지수 백오프 적용  
- **데이터 페이징**: 대량 조회 시 `limit/offset` 혹은 커서 기반 페이지네이션 사용  

위 내용은 **프론트엔드 친화적 API 가이드**(LinkedIn)와 **AWS Well‑Architected** 원칙을 참고했습니다【프론트엔드 친화적 API를 만드는 방법: 완전 가이드 - LinkedIn】, 【AWS Well‑Architected 프레임워크】.

---

## 11. FAQ
**Q1. 토큰 만료 시 흔히 발생하는 문제와 해결책**  
- **문제**: 401 응답 후 자동 재시도가 없으면 UI가 멈춤  
- **해결**: 인터셉터에서 토큰 갱신 로직을 구현하고, 재시도 횟수를 제한  

**Q2. CORS 오류 대응 방법**  
- 백엔드에 `Access-Control-Allow-Origin` 헤더 추가 (개발 환경은 `*`, 프로덕션은 도메인 제한)  
- 프론트엔드에서는 프록시(`vite.config.js`의 `proxy` 옵션) 사용 가능  

**Q3. 개발/프로덕션 환경 전환 시 주의점**  
- `BASE_URL` 과 `TOKEN_KEY` 를 각각 `.env.development`·`.env.production`에 정의  
- 빌드 시 환경 변수 치환이 정상 동작하는지 확인 (`process.env.NODE_ENV`)  

---

## 12. 참고 자료 및 링크
- **초보자를 위한 API 가이드** – API 기본 개념 및 문서화 방법【초보자를 위한 API가이드, API란 무엇일까?】  
- **프론트엔드 친화적 API 가이드** – 설계·문서·테스트 베스트 프랙티스【프론트엔드 친화적 API를 만드는 방법: 완전 가이드 - LinkedIn】  
- **AWS Well‑Architected 프레임워크** – 신뢰성·성능·보안 관점의 권고사항【AWS Well‑Architected 프레임워크】  
- **Axios 공식 문서** – 인터셉터·타임아웃·취소 토큰 사용법 https://axios-http.com/  
- **MSW (Mock Service Worker)** – API 모킹·테스트 가이드 https://mswjs.io/  
- **Jest 공식 문서** – 테스트 설정·커버리지 보고서 https://jestjs.io/  

> 위 링크들은 모두 공개된 외부 자료이며, 프로젝트 내부 코드와 연계하여 활용하시기 바랍니다.  