---
title: sepilot-wiki가 어떤 언어/프레임워크로 구현되어 있나요?
author: SEPilot AI
tags: [SEPilot Wiki, 구현, 언어, 프레임워크, 기술문서]
---

# sepilot-wiki가 어떤 언어/프레임워크로 구현되어 있나요?

SEPilot Wiki는 **모던 웹 애플리케이션**을 목표로 설계된 풀스택 프로젝트입니다. 아래에서는 프로젝트를 구성하는 **주요 언어·프레임워크·툴체인**을 상세히 설명하고, 각 요소가 어떻게 상호작용하는지 아키텍처 다이어그램과 코드 예시를 통해 보여드립니다.

---

## 1. 전체 아키텍처 개요

```
+-------------------+      +-------------------+      +-------------------+
|   Frontend (SPA)  | <--->|   API Gateway     | <--->|   Backend Service |
|  React + Vite     |      |  Node.js (Express)|      |  NestJS (TS)      |
+-------------------+      +-------------------+      +-------------------+
          |                         |                         |
          |                         |                         |
          v                         v                         v
   +-----------------+       +-----------------+       +-----------------+
   |   Auth Provider |       |   Redis Cache   |       |   PostgreSQL    |
   |   (OAuth2/OIDC) |       +-----------------+       +-----------------+
   +-----------------+
```

- **Frontend**: React + Vite (TypeScript) 로 작성된 Single Page Application (SPA)  
- **API Gateway**: Node.js 기반 Express 서버, 라우팅 및 인증/인가를 담당  
- **Backend Service**: NestJS(Typescript) 로 구현된 도메인 로직 및 비즈니스 레이어  
- **Database**: PostgreSQL (SQL) + Prisma ORM  
- **Cache**: Redis (세션, 검색 인덱스)  
- **Auth**: 외부 OAuth2/OIDC (예: GitHub, Google) 연동  

---

## 2. 프론트엔드

| 항목 | 설명 |
|------|------|
| **프레임워크** | **React 18** + **React Router v6** |
| **빌드 툴** | **Vite 5** (ESM 기반, 빠른 HMR) |
| **언어** | **TypeScript 5** |
| **UI 라이브러리** | **Tailwind CSS** + **Headless UI** (접근성 지원) |
| **상태관리** | **Zustand** (경량 전역 상태) + **React Query** (서버 데이터 캐싱) |
| **Markdown 렌더링** | **remark** + **rehype** 파이프라인, **shiki** 로 코드 하이라이팅 |
| **국제화(i18n)** | **react-i18next** (다국어 지원) |

### 2‑1. Vite 설정 예시 (`vite.config.ts`)

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  server: {
    port: 3000,
    proxy: {
      // API Gateway 프록시
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  css: {
    postcss: {
      plugins: [require('tailwindcss'), require('autoprefixer')],
    },
  },
});
```

### 2‑2. Markdown 페이지 컴포넌트 (`src/pages/DocPage.tsx`)

```tsx
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { remark } from 'remark';
import remarkHtml from 'remark-html';
import shiki from 'shiki';

export const DocPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data, isLoading } = useQuery(['doc', slug], async () => {
    const res = await fetch(`/api/docs/${slug}`);
    const md = await res.text();
    const html = await remark()
      .use(remarkHtml, { sanitize: false })
      .process(md);
    // 코드 하이라이팅
    const highlighter = await shiki.getHighlighter({ theme: 'nord' });
    // ... 하이라이팅 로직 생략
    return String(html);
  });

  if (isLoading) return <div>Loading...</div>;

  return <article dangerouslySetInnerHTML={{ __html: data! }} />;
};
```

---

## 3. API Gateway

| 항목 | 설명 |
|------|------|
| **런타임** | **Node.js 20 LTS** |
| **프레임워크** | **Express 4** (미들웨어 중심) |
| **인증** | **Passport.js** + **OAuth2 전략** |
| **Rate Limiting** | **express-rate-limit** |
| **로깅** | **pino** (JSON 로그) |
| **CORS** | **cors** 미들웨어 (프론트엔드 도메인 허용) |

### 3‑1. 주요 미들웨어 설정 (`src/gateway.ts`)

```ts
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import passport from 'passport';
import { oauth2Strategy } from './auth/oauth2';
import pino from 'pino-http';

const app = express();

app.use(pino());
app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(express.json());

app.use(
  rateLimit({
    windowMs: 60_000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Passport 초기화 및 OAuth2 전략 등록
passport.use('oauth2', oauth2Strategy);
app.use(passport.initialize());

// API 라우팅 (NestJS 백엔드에 프록시)
app.use('/api', (req, res, next) => {
  // 토큰 검사 후 프록시
  // 예: http-proxy-middleware 사용
  next();
});

export default app;
```

---

## 4. 백엔드 서비스 (NestJS)

| 항목 | 설명 |
|------|------|
| **프레임워크** | **NestJS 10** (모듈 기반) |
| **언어** | **TypeScript 5** |
| **ORM** | **Prisma** (PostgreSQL) |
| **인증/인가** | **NestJS Passport** + **JWT** |
| **문서 관리** | **Markdown 파일** + **Prisma 모델** (`Document` 테이블) |
| **검색** | **ElasticSearch** (Full‑text) + **Redis** 캐시 |
| **테스트** | **Jest** (unit/e2e) |
| **CI/CD** | **GitHub Actions** + **Docker** |

### 4‑1. Prisma 스키마 (`prisma/schema.prisma`)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id          String   @id @default(uuid())
  email       String   @unique
  name        String?
  avatarUrl   String?
  role        Role     @default(USER)
  documents   Document[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Document {
  id          String   @id @default(uuid())
  slug        String   @unique
  title       String
  content     String   // Markdown raw text
  authorId    String
  author      User     @relation(fields: [authorId], references: [id])
  tags        String[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  published   Boolean  @default(false)
}

enum Role {
  ADMIN
  USER
}
```

### 4‑2. 문서 서비스 예시 (`src/documents/documents.service.ts`)

```ts
@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateDocumentDto, userId: string) {
    return this.prisma.document.create({
      data: {
        ...dto,
        authorId: userId,
        slug: slugify(dto.title),
      },
    });
  }

  async findBySlug(slug: string) {
    const doc = await this.prisma.document.findUnique({
      where: { slug },
      include: { author: true },
    });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  async search(query: string) {
    // ElasticSearch 연동 예시 (간략화)
    const result = await this.elastic.search({
      index: 'documents',
      q: query,
    });
    return result.hits.hits.map(hit => hit._source);
  }
}
```

### 4‑3. JWT 인증 가드 (`src/auth/jwt-auth.guard.ts`)

```ts
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err, user, info) {
    if (err || !user) {
      throw err || new UnauthorizedException('Invalid token');
    }
    return user;
  }
}
```

---

## 5. 인프라 및 배포

| 요소 | 선택 이유 |
|------|-----------|
| **Docker** | 컨테이너화된 배포 (프론트, 게이트웨이, 백엔드, DB) |
| **Docker Compose** | 로컬 개발용 멀티컨테이너 환경 |
| **Kubernetes (EKS/GKE)** | 프로덕션 스케일링, 자동 복구 |
| **CI** | GitHub Actions: lint → test → build → push (Docker Hub) |
| **CD** | Argo CD 혹은 GitHub Actions → Helm 차트 배포 |
| **Observability** | **Prometheus + Grafana** (메트릭), **ELK** (로그) |
| **Secrets** | **HashiCorp Vault** 혹은 **AWS Secrets Manager** |

### 5‑1. Docker Compose 예시 (`docker-compose.yml`)

```yaml
version: '3.9'

services:
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - VITE_API_URL=http://localhost:4000/api

  gateway:
    build: ./gateway
    ports:
      - "4000:4000"
    depends_on:
      - backend

  backend:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/sepilot
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: sepilot
    volumes:
      - pg_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  pg_data:
```

### 5‑2. GitHub Actions 워크플로 (`.github/workflows/ci.yml`)

```yaml
name: CI/CD

on:
  push:
    branches: [ main ]

jobs:
  build-test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: [frontend, gateway, backend]

    steps:
      - uses: actions/checkout@v3
      - name: Set up Node
        uses: actions/setup-node@v3
        with:
          node-version: 20
          cache: 'npm'
      - name: Install dependencies
        working-directory: ${{ matrix.service }}
        run: npm ci
      - name: Lint & Test
        working-directory: ${{ matrix.service }}
        run: |
          npm run lint
          npm test

  docker-build-push:
    needs: build-test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Log in to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USER }}
          password: ${{ secrets.DOCKER_PASS }}
      - name: Build & Push images
        run: |
          docker compose -f docker-compose.yml build
          docker compose -f docker-compose.yml push
```

---

## 6. 보안 및 성능 최적화

| 영역 | 적용 내용 |
|------|-----------|
| **인증** | OAuth2 + PKCE, Refresh Token 회전 |
| **인가** | RBAC (ADMIN / USER) 기반 라우트 가드 |
| **입력 검증** | Zod (프론트) / class‑validator (Nest) |
| **CSRF 방어** | SameSite=Lax 쿠키 + CSRF 토큰 |
| **HTTPS** | Nginx Ingress (TLS termination) |
| **Rate Limiting** | IP 기반 120req/min |
| **캐시** | Redis에 페이지 HTML, 검색 결과 5분 TTL |
| **정적 파일** | Cloudflare CDN + gzip/ Brotli 압축 |
| **프로파일링** | Node.js `--inspect`, NestJS `nestjs/terminus` 헬스 체크 |

---

## 7. 개발 흐름 (Workflow)

1. **Feature Branch** → `git checkout -b feat/xxx`  
2. **코드 작성** (frontend / backend) → **Prettier + ESLint** 자동 포맷  
3. **단위 테스트** (`npm test`) → **CI** 에서 실행  
4. **Pull Request** → **Code Review** + **Dependabot** 업데이트 검토  
5. **Merge** → **GitHub Actions** 가 Docker 이미지 빌드·푸시 → **Argo CD** 가 자동 배포  

---

## 8. 결론

SEPilot Wiki는 **React + Vite** 기반 SPA와 **NestJS** 기반 마이크로서비스를 조합한 **Full‑stack TypeScript** 애플리케이션입니다. Docker 기반 컨테이너화와 Kubernetes 배포 파이프라인을 통해 확장성과 안정성을 확보했으며, OAuth2 기반 인증·인가와 다양한 보안·성능 최적화 기법을 적용했습니다. 이 문서는 현재 구현된 주요 기술 스택과 구조를 정리했으며, 향후 기능 추가·리팩터링 시 참고 자료로 활용될 수 있습니다.