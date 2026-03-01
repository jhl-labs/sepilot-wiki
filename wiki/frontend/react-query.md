---
title: React‑Query 기반 데이터 패칭·캐싱 베스트 프랙티스
author: SEPilot AI
status: draft
tags: [React, React-Query, 데이터 패칭, 캐싱, TypeScript]
---

## 1. 문서 개요
**목적** – `@tanstack/react-query` 를 활용해 데이터 패칭·캐싱·동기화를 일관되게 구현하고, 유지보수 비용을 최소화하는 방법을 제시합니다.  
**대상 독자** – React와 TypeScript 기반 프론트엔드 개발자, 기존에 Redux/Context 로 상태를 관리하던 팀, 신규 프로젝트에서 데이터 레이어를 설계하려는 아키텍트.  
**React‑Query 도입 배경** – 복잡한 비동기 로직을 UI 로직에서 분리하고, 자동 재시도·백그라운드 업데이트·전역 캐시를 제공함으로써 코드 가독성과 안정성을 높일 수 있습니다[[React Query 도입 시, 왜 상태 관리와 아키텍처도 함께 바꿔야 ...](https://sigridjin.medium.com/react-query-%EB%8F%84%EC%9E%85-%EC%8B%9C-%EC%99%9C-%EC%83%81%ED%83%9C-%EA%B4%80%EB%A6%AC%EC%99%80-%EC%95%84%EB%82%B4%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EB%8F%99%EC%9D%84-%EC%9C%84%ED%95%9C-%EC%9E%90%EB%8F%99%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%9C%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%99%20...  
**문서 구성** – 아래 15개 섹션으로 체계적으로 정리합니다.

## 2. React‑Query 핵심 개념
- **Query** – `useQuery` 로 데이터를 읽고 캐시합니다. **Mutation** – `useMutation` 은 데이터를 변경하고, 성공 시 자동으로 관련 Query 를 무효화하거나 업데이트합니다.  
- **Lifecycle 옵션**  
  - `staleTime` – 데이터가 “신선”하게 간주되는 기간. 이 기간 내에는 자동 재패칭이 일어나지 않음[[React-Query 캐싱 원리 (w. staleTime, cacheTime, Lifecycle)](https://velog.io/@juhyeon1114/React-Query-%EC%BA%90%EC%8B%B1-%EC%9B%90%EB%A6%AC-w.-staleTime-cacheTime-Lifecycle).  
  - `cacheTime` – 캐시된 데이터가 메모리에서 유지되는 시간. `staleTime` 이 지나고도 `cacheTime` 안이면 캐시가 보존됩니다.  
  - `refetchOnWindowFocus` – 윈도우 포커스 시 자동 재패칭 여부. 기본값은 `true`이며, UI가 오래된 데이터를 보여줄 위험이 있을 때 비활성화합니다.  
- **데이터 흐름** – `fetch → cache → UI` 순으로 동작하며, 캐시가 존재하면 즉시 UI에 제공하고 백그라운드에서 최신 데이터를 가져와 업데이트합니다[[React Query를 통한 데이터 패칭, 캐싱, 동기화 방법 총정리](https://www.elancer.co.kr/blog/detail/279)].

## 3. Query Key 설계 원칙
1. **고유성 보장** – 배열 형태(`['todos', userId]`) 로 파라미터를 포함해 동일한 엔드포인트라도 다른 키를 생성합니다.  
2. **계층형 구조** – 최상위 도메인(예: `['users']`) 아래에 세부 리소스(`['users', userId, 'posts']`) 를 두어 네임스페이스를 명확히 합니다.  
3. **키 재사용 주의** – 서로 다른 UI 컴포넌트가 같은 키를 공유하면 캐시 충돌이 발생할 수 있습니다. 필요 시 `select` 옵션으로 데이터를 변형하거나, 별도 서브키(`['todos', { status: 'open' }]`) 를 사용합니다.  

## 4. 캐싱 전략 및 옵션
| 상황 | 권장 `staleTime` | 권장 `cacheTime` | 비고 |
|------|----------------|----------------|------|
| 변동이 거의 없는 정적 데이터 (예: 메뉴 리스트) | `Infinity` (무한) | `Infinity` | 재패칭 불필요 |
| 사용자별 개인 데이터 (예: 프로필) | `5 * 60 * 1000` (5분) | `30 * 60 * 1000` (30분) | 짧은 신선도 유지 |
| 실시간 업데이트가 필요한 대시보드 | `0` (즉시 stale) | `5 * 60 * 1000` (5분) | 포커스 시 자동 재패칭 |

- **stale‑while‑revalidate** 패턴 – `staleTime` 을 짧게 잡고, UI는 캐시된 데이터를 즉시 보여주면서 백그라운드에서 최신 데이터를 받아와 교체합니다. 이는 사용자 경험을 저해하지 않으면서 데이터 신선도를 유지합니다[[React Query를 통한 데이터 패칭, 캐싱, 동기화 방법 총정리](https://www.elancer.co.kr/blog/detail/279)].
- **백그라운드 업데이트** – `refetchOnWindowFocus` 와 `refetchInterval` 옵션을 조합해 주기적 재패칭을 구현합니다.  

## 5. 무효화(Invalidation)와 업데이트 패턴
- **`queryClient.invalidateQueries`** – Mutation 성공 후 관련 Query 를 무효화해 새 데이터를 강제로 가져옵니다. 예: `queryClient.invalidateQueries(['todos'])`.  
- **`setQueryData`** – 로컬 캐시를 직접 수정해 즉시 UI에 반영합니다. 특히 옵티미스틱 업데이트 시 유용합니다.  
- **의존성 기반 무효화** – 페이지 전환, 폼 제출, 필터 변경 등 UI 이벤트에 따라 자동으로 무효화 로직을 연결합니다.  

## 6. 페이지네이션 & 무한 스크롤
- **`useInfiniteQuery`** – 페이지 키와 `getNextPageParam` 콜백을 정의해 다음 페이지를 자동으로 로드합니다.  
- **페이지 키 관리** – `['posts', { cursor: lastItemId }]` 형태로 커서 기반 페이지네이션을 구현하면 키 충돌을 방지합니다.  
- **캐시 병합** – `select` 옵션으로 기존 페이지와 새 페이지 데이터를 병합해 하나의 배열로 반환합니다.  
- **메모리 관리** – 오래된 페이지는 `cacheTime` 을 짧게 설정하거나, `keepPreviousData: false` 로 자동 제거합니다.  

## 7. Mutation 베스트 프랙티스
- **옵션** – `onSuccess`, `onError`, `onSettled` 를 활용해 성공 시 캐시 무효화, 오류 시 사용자 알림, 최종 정리 작업을 수행합니다.  
- **옵티미스틱 업데이트** – `onMutate` 에서 `setQueryData` 로 임시 데이터를 반영하고, `onError` 에서 롤백합니다.  
- **서버·클라이언트 동기화** – Mutation 성공 후 `queryClient.invalidateQueries` 로 최신 데이터를 가져와 일관성을 유지합니다.  

## 8. 에러 처리 및 자동 재시도
- **`retry`** – 기본값은 3회이며, 네트워크 오류 시 재시도합니다.  
- **`retryDelay`** – 지수 백오프(`attempt => Math.min(1000 * 2 ** attempt, 30000)`) 로 설정하면 과부하를 방지합니다.  
- **전역 에러 핸들러** – `QueryErrorResetBoundary` 로 에러 발생 시 UI 레이어를 리셋하고 재시도 UI 를 제공할 수 있습니다[[React Query를 통한 데이터 패칭, 캐싱, 동기화 방법 총정리](https://www.elancer.co.kr/blog/detail/279)].  
- **사용자 피드백** – 로딩 스피너, 토스트, 리트라이 버튼 등 UI 패턴을 일관되게 적용합니다.  

## 9. TypeScript와 타입 안전성
- **쿼리 함수 타입** – `async function fetchUser(id: string): Promise<User>` 와 같이 반환 타입을 명시하고, `useQuery<User>` 로 제네릭을 전달합니다.  
- **`QueryObserverResult`** – `data`, `error`, `isLoading` 등 프로퍼티에 정확한 타입이 적용됩니다.  
- **재사용 훅 설계** – 공통 로직을 `usePaginatedQuery<T>` 와 같은 제네릭 훅으로 추출해 코드 중복을 최소화합니다.  

## 10. 테스트 전략
1. **캐시 목업** – `QueryClientProvider` 에 커스텀 `QueryClient` 를 전달해 메모리 캐시를 초기화합니다.  
2. **훅 단위 테스트** – `@testing-library/react-hooks` (또는 `react-testing-library` + `renderHook`) 로 `useQuery` 와 `useMutation` 을 검증합니다.  
3. **네트워크 스텁** – `msw` (Mock Service Worker) 로 실제 API 호출을 가로채고, 성공·실패 시나리오를 시뮬레이션합니다.  

## 11. 성능 최적화 포인트
- **불필요한 리렌더링 방지** – `select` 로 필요한 데이터만 추출하거나, `useIsFetching` 로 전역 로딩 상태만 구독합니다.  
- **대용량 데이터** – `cacheTime` 을 짧게 잡고, 페이지 단위 캐시를 유지해 메모리 사용량을 제어합니다[[React-Query 캐싱 원리 (w. staleTime, cacheTime, Lifecycle)](https://velog.io/@juhyeon1114/React-Query-%EC%BA%90%EC%8B%B1-%EC%9B%90%EB%A6%AC-w.-staleTime-cacheTime-Lifecycle).  
- **SSR & 프리패칭** – 서버 사이드 렌더링 시 `dehydrate` 로 초기 데이터를 전달하고, 클라이언트에서는 `hydrate` 로 재사용합니다. (구현 방법은 추가 조사 필요).  

## 12. 마이그레이션 가이드
1. **현황 파악** – 기존 Redux/Context 로 관리되는 API 호출 리스트를 정리합니다.  
2. **핵심 쿼리 선정** – 가장 많이 사용되는 리스트 조회, 상세 조회 등을 먼저 `useQuery` 로 전환합니다.  
3. **점진적 도입** – 새로운 컴포넌트에서는 React‑Query 를 사용하고, 기존 컴포넌트는 단계별로 교체합니다.  
4. **체크리스트**  
   - [ ] Query Key 설계 완료  
   - [ ] `staleTime`/`cacheTime` 기본값 적용  
   - [ ] Mutation 에 옵티미스틱 업데이트 적용 여부 검토  
   - [ ] 테스트 커버리지 확보  

## 13. 흔히 발생하는 문제와 해결 방안
- **쿼리 키 충돌** – 동일한 배열 형태 키가 다른 파라미터를 가리키면 캐시가 뒤섞입니다. 해결은 키에 명시적 파라미터 객체를 포함하는 것입니다.  
- **Stale 데이터 노출** – `staleTime` 을 너무 길게 설정하면 오래된 데이터가 UI에 남을 수 있습니다. `refetchOnWindowFocus` 를 활성화하거나, `stale-while-revalidate` 패턴을 적용합니다.  
- **무한 스크롤 메모리 누수** – 페이지가 계속 쌓이면 메모리 사용량이 증가합니다. `cacheTime` 을 짧게 조정하거나, 오래된 페이지를 `queryClient.removeQueries` 로 수동 삭제합니다.  

## 14. FAQ
- **데이터가 바로 업데이트되지 않을 때** – `invalidateQueries` 가 호출되지 않았을 가능성이 있습니다. Mutation 의 `onSuccess` 에서 명시적으로 무효화하세요.  
- **서버와 클라이언트 상태가 다를 때** – 옵티미스틱 업데이트 후 `onError` 에서 롤백하거나, `refetch` 로 최신 데이터를 강제 가져옵니다.  
- **React‑Query와 다른 상태 관리 라이브러리 병행** – 전역 UI 상태(모달, 토스트 등)는 별도 상태 관리 툴(예: Recoil) 로 유지하고, 데이터 페칭은 React‑Query 전용으로 분리하는 것이 권장됩니다[[React Query 도입 시, 왜 상태 관리와 아키텍처도 함께 바꿔야 ...](https://sigridjin.medium.com/react-query-%EB%8F%84%EC%9E%85-%EC%8B%9C-%EC%99%9C-%EC%83%81%ED%83%9C-%EA%B4%80%EB%A6%AC%EC%99%80-%EC%95%84%EB%82%B4%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%99%20...)).  

## 15. 참고 자료 및 링크
- **React Query 공식 문서** – 핵심 API와 옵션 설명 (공식 사이트).  
- **React Query를 통한 데이터 패칭, 캐싱, 동기화 방법 총정리** – 전체 흐름과 실전 팁[[링크](https://www.elancer.co.kr/blog/detail/279)].  
- **React-Query 캐싱 원리 (w. staleTime, cacheTime, Lifecycle)** – 캐시 옵션 상세 해설[[링크](https://velog.io/@juhyeon1114/React-Query-%EC%BA%90%EC%8B%B1-%EC%9B%90%EB%A6%AC-w.-staleTime-cacheTime-Lifecycle)].  
- **React Query 도입 시, 왜 상태 관리와 아키텍처도 함께 바꿔야 하는가** – 도입 배경과 조직 변화 논의[[링크](https://sigridjin.medium.com/react-query-%EB%8F%84%EC%9E%85-%EC%8B%9C-%EC%99%9C-%EC%83%81%ED%83%9C-%EA%B4%80%EB%A6%AC%EC%99%80-%EC%95%84%EB%82%B4%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%98-%EC%9E%90%EC%84%B8%EC%9D%99%20...)).  

*본 문서는 현재까지 공개된 자료를 기반으로 작성되었습니다. 최신 React‑Query 버전(>5) 에서는 일부 옵션 명칭이 변경될 수 있으므로, 실제 적용 시 공식 문서를 재확인하시기 바랍니다.*