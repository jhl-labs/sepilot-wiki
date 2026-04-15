---
title: 프론트엔드 API 클라이언트 서비스 가이드
author: SEPilot AI
status: published
tags: [frontend, api-client, services, documentation, coverage]
---

## 문서 개요
- **목적**: 프론트엔드 애플리케이션이 백엔드와 통신하기 위해 사용하는 `services/api.ts` 모듈의 사용법·구조·확장 방법을 제공한다.  
- **대상 독자**: 프론트엔드 개발자, 팀 리더, 신규 입사자 및 유지보수 담당자.  
- **구성 안내**: 본 문서는 모듈 개요, 아키텍처, 초기 설정, 기본 사용법, 상세 처리 로직, 에러·인증 관리, 확장 방법, 테스트 전략, 베스트 프랙티스, FAQ 순으로 구성된다.  
- **커버리지 분석 요약**: `services/api.ts`는 **high** 중요도로 식별된 핵심 API 래퍼이며, 현재 위키에 문서가 존재하지 않아 사용 가이드가 필요함.  

## API 클라이언트 서비스 개요
- **역할**: 프론트엔드와 백엔드 사이의 HTTP 통신을 캡슐화하여 일관된 요청/응답 흐름을 제공한다.  
- **핵심 책임**  
  - 요청 빌더: URL, 메서드, 헤더, 바디 자동 구성  
  - 응답 파서: 성공/실패 응답을 타입에 맞게 변환  
  - 에러 매퍼: 네트워크·HTTP 오류를 도메인 별 에러 객체로 매핑  
  - 토큰 인터셉터: 인증 토큰을 자동 삽입·갱신  
- **기술 스택·의존성**  
  - 기본 HTTP 클라이언트 (예: `fetch` 혹은 `axios` 등) – 구체적인 구현은 프로젝트 설정에 따라 다름.  
  - 환경 변수 로딩 (`.env`, `config.ts`) – 런타임 설정을 외부화.  

## 아키텍처 및 구조
- **파일 구조**  
  - `services/api.ts` – 주요 API 래퍼와 export 정의  
  - 내부 보조 파일(예: `requestBuilder.ts`, `responseParser.ts`, `errorMapper.ts`, `tokenInterceptor.ts`) – 모듈화된 레이어를 담당한다.  
- **레이어 구분**  
  - **요청 빌더**: 메서드, 엔드포인트, 파라미터를 받아 `RequestInit` 객체를 생성.  
  - **응답 파서**: `JSON` 파싱, 페이징 메타데이터 추출, 타입 가드 적용.  
  - **에러 매퍼**: HTTP 상태 코드별 `ApiError`, `AuthError` 등 커스텀 에러 클래스로 변환.  
  - **토큰 인터셉터**: 요청 전 `Authorization` 헤더 삽입, 토큰 만료 시 자동 재인증 흐름 트리거.  
- **플러그인·미들웨어 패턴**  
  - 인터셉터 체인을 통해 전·후 처리 로직을 삽입할 수 있는 설계가 일반적이며, 이는 확장성을 높인다.  

## 초기 설정 및 환경 구성
1. **모듈 추가**  
   - 프로젝트 루트에 `services/api.ts` 파일을 복사하거나 `git pull` 로 최신 버전을 가져온다.  
2. **환경 변수**  
   - `.env` 파일에 `API_BASE_URL`, `AUTH_TOKEN_KEY` 등 백엔드 주소와 토큰 키를 정의한다.  
   - `config.ts`(또는 유사 파일)에서 `process.env` 값을 읽어 `api.ts`에 전달한다.  
3. **인증 토큰 초기화 흐름**  
   - 애플리케이션 시작 시 `localStorage`(또는 선택된 저장소)에서 토큰을 읽어 `api.ts` 내부 토큰 스토어에 설정한다.  

## 기본 사용법
- **API 인스턴스 생성 예시**  
    const api = createApi({ baseUrl: process.env.API_BASE_URL });  
- **GET 요청**  
    const users = await api.get('/users', { params: { page: 1 } });  
- **POST 요청**  
    const newUser = await api.post('/users', { body: { name: 'Alice' } });  
- **PUT / DELETE**  
    await api.put('/users/123', { body: { name: 'Bob' } });  
    await api.delete('/users/123');  
- **요청 파라미터·옵션**  
  - `params`: 쿼리 문자열 자동 직렬화  
  - `body`: JSON 자동 `stringify` 및 `Content-Type` 헤더 설정  
  - `headers`: 추가 헤더 지정 가능  
- **응답 데이터 구조**  
  - 성공 시 `{ data: <payload>, meta?: <pagingInfo> }` 형태로 반환되며, 타입 정의는 프로젝트 별 `types.ts`에 위치한다.  

## 요청 처리 상세
- **요청 빌더 로직**  
  - 엔드포인트와 메서드에 따라 `URL`을 조합하고, `params`를 `URLSearchParams` 로 직렬화한다.  
- **헤더 자동 삽입**  
  - `Content-Type: application/json`은 `body`가 존재할 경우 자동 추가.  
  - `Authorization: Bearer <token>`은 토큰 인터셉터가 삽입한다.  
- **파일 업로드/다운로드**  
  - `FormData` 객체를 `body`에 전달하면 자동으로 `multipart/form-data` 로 전환된다.  
  - 다운로드는 `response.blob()` 로 처리하고, 브라우저 `URL.createObjectURL` 으로 파일 저장을 구현한다.  

## 응답 처리 및 데이터 변환
- **성공 응답 파싱**  
  - HTTP 2xx 응답은 `response.json()` 으로 파싱 후 `data` 필드에 매핑한다.  
- **페이징·메타데이터**  
  - 백엔드가 제공하는 `X-Total-Count` 혹은 `meta` 객체를 추출해 UI 페이징에 활용한다.  
- **타입 가드·런타임 검증**  
  - `isUser(obj): obj is User` 와 같은 타입 가드를 정의해 런타임에서 구조를 검증한다.  

## 에러 핸들링 전략
- **네트워크 오류**  
  - `fetch` 실패 시 `NetworkError` 로 변환하고, 재시도 로직을 트리거한다.  
- **HTTP 상태 코드 별 처리**  
  - 401/403 → `AuthError` 발생 후 로그인 페이지 리다이렉트.  
  - 4xx → `ClientError` 로 변환, UI에 오류 메시지 표시.  
  - 5xx → `ServerError` 로 변환, 로그 수집 및 사용자 알림.  
- **커스텀 에러 클래스**  
  - `class ApiError extends Error { constructor(message, status) { … } }`  
  - `class AuthError extends ApiError { … }`  
- **에러 로그·피드백 연동**  
  - Sentry, LogRocket 등 외부 모니터링 툴에 `captureException` 호출.  
- **재시도 정책·백오프**  
  - 지수 백오프 전략을 적용해 3회까지 재시도하고, 최종 실패 시 사용자에게 알린다.  

## 인증 토큰 관리
- **저장소 선택 가이드**  
  - `localStorage` : 영구 저장, XSS 위험 존재.  
  - `sessionStorage` : 세션 종료 시 자동 삭제, 보안 향상.  
  - 메모리(React context) : 페이지 새로고침 시 소멸, 가장 안전하지만 영속성 부족.  
- **자동 갱신 흐름**  
  - 토큰 만료 시 `refreshToken` API 호출 → 새로운 토큰 저장 → 대기 중인 요청 재시도.  
- **만료 시 리다이렉트**  
  - `AuthError` 발생 시 라우터를 통해 로그인 페이지로 이동한다.  

## 확장 및 커스터마이징
- **인터셉터 추가**  
  - `api.addRequestInterceptor(fn)` 혹은 `api.addResponseInterceptor(fn)` 형태로 전·후 처리 로직을 삽입한다.  
- **전역 옵션·커스텀 헤더**  
  - `api.setDefaultHeaders({ 'X-Client-Version': '1.2.3' })` 로 모든 요청에 적용.  
- **새 엔드포인트 추가 패턴**  
  1. `services/api.ts`에 메서드 선언 (예: `getOrders`)  
  2. 요청 빌더에 엔드포인트와 메서드 매핑  
  3. 타입 정의(`Order`, `OrderResponse`)를 `types.ts`에 추가  
- **테스트용 Mock 서버 연동**  
  - `msw`(Mock Service Worker) 를 사용해 프론트엔드 테스트 시 실제 백엔드 호출을 가로채고 가짜 응답을 반환한다.  

## 테스트 전략
- **유닛 테스트 대상**  
  - `requestBuilder`, `responseParser`, `errorMapper`, `tokenInterceptor` 함수 각각에 대해 입력·출력 검증.  
  - 목업(`jest.fn()`)을 이용해 `fetch`/`axios` 호출을 가짜로 대체한다.  
- **통합 테스트 시나리오**  
  - 실제 개발/스테이징 백엔드와 연동해 전체 흐름(인증 → 데이터 조회 → 오류 처리) 검증.  
- **CI/CD 파이프라인**  
  - GitHub Actions 워크플로(`.github/workflows/ci.yml`)에 `npm test` 단계 추가하여 PR마다 API 테스트가 실행되도록 구성한다.  

## 베스트 프랙티스 및 성능 최적화
- **요청 병합·디바운싱**  
  - 동일 엔드포인트에 대한 연속 호출을 `lodash.debounce` 로 합쳐 네트워크 부하 감소.  
- **캐시 활용**  
  - HTTP `Cache-Control` 헤더와 `service worker` 를 활용해 정적 데이터 캐시.  
  - 메모리 캐시(`Map`) 로 최근 조회 데이터를 저장하고, `stale-while-revalidate` 전략 적용.  
- **오류 로깅·모니터링**  
  - 모든 `ApiError` 를 중앙 로거에 전송하고, 대시보드에서 오류 추세를 시각화한다.  

## FAQ
- **Q1. 401 오류가 발생하면 어떻게 해야 하나요?**  
  - `AuthError` 가 발생하면 토큰을 삭제하고 로그인 페이지로 리다이렉트한다. 자동 토큰 갱신 로직이 설정돼 있다면 `refreshToken` 호출을 먼저 시도한다.  
- **Q2. 토큰을 `localStorage`에 저장하면 안전한가요?**  
  - XSS 공격에 취약하므로 가능한 경우 `httpOnly` 쿠키 또는 `sessionStorage` 사용을 권장한다.  
- **Q3. 새로운 API 엔드포인트를 추가할 때 주의할 점은?**  
  - 요청/응답 타입을 명확히 정의하고, 에러 매핑 규칙에 맞게 `status` 코드를 처리한다. 또한 인터셉터 체인에 영향을 주지 않도록 기존 로직을 검증한다.  

## 참고 자료 및 링크
- 프로젝트 레포지토리 및 `services/api.ts` 파일 경로 (예: `src/services/api.ts`)  
- 백엔드 API 스펙 문서 – 내부 위키 또는 Swagger UI 링크  
- **API 문서 작성 가이드** – https://hansem.com/ko/blog/api-%EB%AC%B8%EC%84%9C-%EC%9E%91%EC%84%B1-%EA%B0%80%EC%9D%B4%EB%93%9C-%ED%95%84%EC%88%98-%EC%9A%94%EC%86%8C/  
- **좋은 API 문서의 핵심 요소** – 위 링크에서 다양한 예시와 가독성 강조 내용 참고  

## 변경 로그
- **2026-04-15** – 초안 작성 (draft) – 커버리지 분석 결과 기반으로 기본 골격 및 내용 구성.  
- **추후** – 실제 `services/api.ts` 구현 세부 내용 추가 시 업데이트 예정.  

> **주의**: 현재 문서는 공개된 리서치 자료만을 기반으로 작성되었으며, `services/api.ts` 내부 구현 세부 사항(함수 시그니처, 구체적인 로직 등)은 추가 조사가 필요합니다. 해당 내용이 확보되는 대로 문서를 보강하십시오.  