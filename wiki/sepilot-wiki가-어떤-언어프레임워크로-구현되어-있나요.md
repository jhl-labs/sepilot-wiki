---
title: "sepilot-wiki가 어떤 언어/프레임워크로 구현되어 있나요?"
author: SEPilot AI
tags: [구현, 아키텍처, 기술스택, 프레임워크]
---

# sepilot-wiki가 어떤 언어/프레임워크로 구현되어 있나요?

## 개요
`sepilot-wiki`는 현대적인 웹 기술을 활용해 **확장성**, **보안**, **빠른 응답성**을 제공하도록 설계된 위키 시스템입니다.  
프론트엔드와 백엔드가 명확히 분리된 **SPA(Single Page Application)** 구조이며, Docker 기반 배포와 CI/CD 파이프라인을 지원합니다.

---

## 전체 기술 스택

| 구분 | 기술 | 버전(예시) | 역할 |
|------|------|-----------|------|
| **프론트엔드** | Vue 3 (Composition API) | 3.4.0 | UI/UX 구현, 라우팅 |
| | Vite | 5.0.0 | 개발 서버 & 번들러 |
| | TypeScript | 5.2.2 | 정적 타입 검사 |
| | Pinia | 2.1.7 | 전역 상태 관리 |
| | Tailwind CSS | 3.4.0 | 유틸리티 기반 스타일링 |
| **백엔드** | Python | 3.11 | 비즈니스 로직 |
| | FastAPI | 0.112.0 | RESTful API 서버 |
| | Uvicorn (ASGI) | 0.30.0 | 고성능 비동기 서버 |
| | SQLAlchemy | 2.0.30 | ORM |
| | PostgreSQL | 16.2 | 관계형 데이터베이스 |
| | Redis | 7.2.5 | 캐시 & 세션 스토어 |
| **인증/인가** | OAuth2 (Authorization Code) | – | 외부 IdP(Google, GitHub 등) 연동 |
| | PyJWT | 2.9.0 | JWT 토큰 발급/검증 |
| **배포/운영** | Docker | 27.0.3 | 컨테이너화 |
| | Docker Compose | 2.27.0 | 멀티컨테이너 정의 |
| | GitHub Actions | – | CI/CD 파이프라인 |
| | Nginx | 1.25.4 | 리버스 프록시 & 정적 파일 서빙 |
| **테스트** | Pytest | 8.2.2 | 백엔드 유닛/통합 테스트 |
| | Vitest | 2.0.5 | 프론트엔드 테스트 |
| **문서화** | MkDocs + Material | 9.5.30 | 프로젝트 문서 자동 생성 |

---

## 아키텍처 개요

```
┌─────────────────────┐
│   클라이언트 (Browser)│
│  - Vue 3 + Vite      │
│  - SPA 라우팅        │
└───────▲───────▲───────┘
        │       │
        │ HTTP  │ WebSocket (optional)
        │       │
┌───────▼───────▼───────┐
│  Nginx (Reverse Proxy)│
│  - 정적 파일 서빙      │
│  - SSL termination    │
└───────▲───────▲───────┘
        │       │
        │ HTTP  │
        │       │
┌───────▼───────▼───────┐
│      FastAPI 서버      │
│  - REST API           │
│  - OAuth2 인증        │
│  - 비동기 처리 (uvicorn)│
└───────▲───────▲───────┘
        │       │
   ┌────▼────┐ ┌────▼─────┐
   │ PostgreSQL│ │   Redis   │
   │ (SQLAlchemy)│ │ (Cache) │
   └───────────┘ └───────────┘
```

- **프론트엔드**는 Vite가 제공하는 HMR(Hot Module Replacement) 덕분에 개발 단계에서 즉시 반영됩니다.  
- **백엔드**는 FastAPI의 비동기 라우팅을 활용해 높은 동시성을 확보합니다.  
- **DB**는 PostgreSQL을 기본 저장소로 사용하고, 읽기 전용 캐시와 세션 관리를 Redis가 담당합니다.  
- **인증**은 OAuth2 Authorization Code 흐름을 기본으로 하며, 필요 시 JWT 토큰을 발급해 API 호출에 사용합니다.

---

## 주요 폴더 구조

```
sepilot-wiki/
├─ .github/
│   └─ workflows/            # GitHub Actions CI/CD
├─ backend/
│   ├─ app/
│   │   ├─ api/              # 라우터 (users, pages, auth)
│   │   ├─ core/             # 설정, 의존성 주입
│   │   ├─ db/               # 모델, CRUD, migrations
│   │   ├─ schemas/          # Pydantic 모델
│   │   └─ services/         # 비즈니스 로직
│   ├─ tests/                # pytest 테스트
│   └─ Dockerfile
├─ frontend/
│   ├─ src/
│   │   ├─ components/       # UI 컴포넌트
│   │   ├─ pages/            # 라우트 페이지
│   │   ├─ store/            # Pinia 스토어
│   │   └─ router.ts         # Vue Router 설정
│   ├─ public/               # 정적 이미지, favicon
│   ├─ tests/                # Vitest 테스트
│   └─ Dockerfile
├─ docker-compose.yml
└─ README.md
```

---

## 핵심 코드 예시

### 1. FastAPI 엔드포인트 (백엔드)

```python
# backend/app/api/v1/pages.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db import get_async_session
from app.schemas.page import PageCreate, PageRead
from app.services.page_service import PageService

router = APIRouter(prefix="/pages", tags=["pages"])

@router.post("/", response_model=PageRead, status_code=status.HTTP_201_CREATED)
async def create_page(
    payload: PageCreate,
    db: AsyncSession = Depends(get_async_session),
    current_user=Depends(get_current_active_user),
):
    """새 위키 페이지를 생성합니다."""
    service = PageService(db)
    try:
        page = await service.create_page(payload, author_id=current_user.id)
        return page
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc)
        )
```

### 2. Vue 3 컴포넌트 (프론트엔드)

```vue
<!-- frontend/src/pages/EditPage.vue -->
<template>
  <div class="max-w-4xl mx-auto p-4">
    <h1 class="text-2xl font-bold mb-4">페이지 편집</h1>
    <textarea
      v-model="content"
      class="w-full h-96 p-2 border rounded resize-none"
    ></textarea>
    <button
      @click="save"
      class="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
    >저장</button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { usePageStore } from '@/store/page';

const route = useRoute();
const router = useRouter();
const pageStore = usePageStore();

const pageId = Number(route.params.id);
const content = ref('');

// 페이지 로드
await pageStore.fetchPage(pageId).then(p => (content.value = p.content));

const save = async () => {
  await pageStore.updatePage(pageId, { content: content.value });
  router.push({ name: 'PageDetail', params: { id: pageId } });
};
</script>

<style scoped>
/* Tailwind를 기본으로 사용하므로 별도 CSS는 최소화 */
</style>
```

### 3. Docker Compose 예시

```yaml
# docker-compose.yml
version: "3.9"

services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: wiki_user
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: wiki_db
    volumes:
      - pg_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    depends_on:
      - db
      - redis
    environment:
      DATABASE_URL: postgresql+asyncpg://wiki_user:secret@db/wiki_db
      REDIS_URL: redis://redis:6379/0
    ports:
      - "8000:8000"
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000

  frontend:
    build: ./frontend
    depends_on:
      - backend
    ports:
      - "3000:80"
    environment:
      VITE_API_BASE_URL: http://backend:8000/api/v1

volumes:
  pg_data:
```

---

## 배포 흐름

1. **코드 푸시** → GitHub Actions 워크플로가 트리거  
2. **Lint/테스트** 단계  
   - `pytest` (백엔드) + `vitest` (프론트엔드) 실행  
3. **이미지 빌드**  
   - `docker build` 로 `backend`와 `frontend` 이미지 생성  
4. **Docker Hub** 혹은 **GitHub Packages**에 푸시  
5. **서버(또는 Kubernetes)** 에서 `docker-compose pull && docker-compose up -d` 수행  
6. **헬스 체크** → Nginx가 200 응답을 반환하면 배포 완료  

---

## 확장 포인트

| 영역 | 현재 구현 | 향후 고려 사항 |
|------|----------|----------------|
| **검색** | PostgreSQL `ILIKE` 기반 기본 검색 | Elasticsearch 혹은 Typesense 연동 |
| **실시간 공동 편집** | 없음 | WebSocket + Yjs 도입 |
| **플러그인 시스템** | 제한적 API | FastAPI `APIRouter` 플러그인 자동 로드 |
| **멀티 테넌시** | 단일 DB 스키마 | 테넌시 별 스키마 혹은 DB 분리 |
| **CI/CD** | GitHub Actions | Argo CD + Helm 차트 (K8s) |

---

## 마무리

`sepilot-wiki`는 **Vue 3 + Vite** 로 구현된 프론트엔드와 **FastAPI** 기반의 백엔드가 Docker 컨테이너로 격리되어 동작합니다.  
이 조합은 **개발 생산성**, **성능**, **확장성**을 모두 만족시키며, CI/CD와 인프라 자동화까지 지원해 운영 비용을 최소화합니다.

> **문서 업데이트**: 새로운 프레임워크 도입이나 버전 변경 시 본 문서를 `docs/architecture.md` 에서 관리하고, 자동 배포 파이프라인에 포함시켜 최신 정보를 유지합니다.