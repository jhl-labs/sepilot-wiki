# SEPilot Wiki - 운영/DevOps 분석 보고서

> **분석 일자**: 2026-02-07
> **분석 대상**: sepilot-wiki v0.4.0
> **분석 범위**: 컨테이너화, 오케스트레이션, CI/CD, 스케줄러, 모니터링, 복원력, 보안 운영
> **분석 방법**: 소스코드 직접 분석 (Docker 3파일, Helm 11파일, GitHub Actions 14워크플로우, 스케줄러 10파일, Webhook 3파일, 유틸리티 3파일)

---

## 목차

1. [운영 성숙도 모델 개요](#1-운영-성숙도-모델-개요)
2. [컨테이너화](#2-컨테이너화)
3. [오케스트레이션 (Kubernetes / Helm)](#3-오케스트레이션-kubernetes--helm)
4. [CI/CD 파이프라인](#4-cicd-파이프라인)
5. [스케줄러 시스템](#5-스케줄러-시스템)
6. [모니터링 및 관찰 가능성](#6-모니터링-및-관찰-가능성)
7. [복원력 및 장애 대응](#7-복원력-및-장애-대응)
8. [환경변수 및 설정 관리](#8-환경변수-및-설정-관리)
9. [보안 운영](#9-보안-운영)
10. [배포 전략](#10-배포-전략)
11. [DORA Metrics 관점 평가](#11-dora-metrics-관점-평가)
12. [SLA/SLO 제안](#12-slaslo-제안)
13. [재해 복구(DR) 전략 제안](#13-재해-복구dr-전략-제안)
14. [종합 평가](#14-종합-평가)
15. [개선 로드맵](#15-개선-로드맵)

---

## 1. 운영 성숙도 모델 개요

본 보고서는 5단계 운영 성숙도 모델을 기반으로 각 영역을 평가한다.

| Level | 이름 | 설명 |
|-------|------|------|
| **Level 1** | 초기(Initial) | 수동 배포, 모니터링 부재, 장애 대응 없음 |
| **Level 2** | 반복(Repeatable) | 기본 CI/CD 존재, 수동 복구, 간단한 헬스체크 |
| **Level 3** | 정의(Defined) | 컨테이너화, 자동 배포, 구조화된 로깅 |
| **Level 4** | 관리(Managed) | 메트릭 기반 오토스케일링, 분산 시스템 관리, 장애 자동 복구 |
| **Level 5** | 최적화(Optimized) | 카오스 엔지니어링, 풀 옵저버빌리티, GitOps 완전 자동화 |

### 평가 기준

각 영역은 10점 만점으로 평가하며, 다음 기준을 적용한다:

- **1-2점**: Level 1 (초기) - 기본 기능 부재 또는 매우 초보적
- **3-4점**: Level 2 (반복) - 기본 도구 존재하나 불완전
- **5-6점**: Level 3 (정의) - 표준화 진행 중, 자동화 부분 적용
- **7-8점**: Level 4 (관리) - 체계적 관리, 메트릭 활용
- **9-10점**: Level 5 (최적화) - 업계 모범 사례 수준

---

## 2. 컨테이너화

### 점수: 8/10 (Level 4 - 관리)

### 2.1 Dockerfile 멀티스테이지 빌드 분석

`docker/Dockerfile`은 3단계 멀티스테이지 빌드로 구성되어 있다.

```
Stage 1: deps      (oven/bun:1-alpine)  -> 의존성 설치
Stage 2: builder   (oven/bun:1-alpine)  -> 빌드 (wiki, search, Next.js)
Stage 3: runner    (node:20-alpine)     -> 실행
```

**빌드 단계 상세:**

| Stage | 베이스 이미지 | 역할 | 주요 동작 |
|-------|-------------|------|----------|
| `deps` | `oven/bun:1-alpine` | 의존성 격리 | `bun install --frozen-lockfile` |
| `builder` | `oven/bun:1-alpine` | 빌드 수행 | `build:wiki` -> `build:search` -> `build` |
| `runner` | `node:20-alpine` | 런타임 | `node server.js` (Next.js standalone) |

**빌드 인자 (ARG):**

| ARG | 기본값 | 용도 |
|-----|--------|------|
| `BUILD_MODE` | `standalone` | `static` (GitHub Pages) / `standalone` (K8s) |
| `AUTH_MODE` | `public` | `public` (인증 없음) / `private` (Keycloak) |

**보안 설정:**
- non-root 사용자(`nextjs:nodejs`, UID/GID 1001)로 컨테이너 실행
- Alpine 기반으로 공격 표면 최소화
- `--frozen-lockfile`으로 재현 가능한 의존성 설치 보장

**HEALTHCHECK 지시문:**
```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1
```

**강점:**
- 멀티스테이지 빌드로 최종 이미지에서 빌드 도구/소스 코드 제거
- Next.js standalone 출력으로 `node_modules` 없이 실행 가능
- Dockerfile 내장 HEALTHCHECK로 Docker 수준 자가 진단
- `--chown=nextjs:nodejs`로 파일 소유권 명시

**약점:**
- builder 단계에서 `COPY . .`로 전체 컨텍스트 복사 (`.dockerignore` 의존적)
- runner에서 `git` 패키지 설치 - 이미지 크기 증가 및 공격 표면 확대
- Node.js 버전이 `20`으로 하드코딩 (ARG 파라미터화 미적용)
- `libc6-compat` 패키지 설치가 deps 스테이지에만 있고 runner에는 없음

### 2.2 Docker Compose 환경

프로젝트는 2개의 Docker Compose 파일을 제공한다.

**`docker-compose.yml` (프로덕션 유사 환경):**

```
wiki (port 3000)  ──depends_on──>  redis:7-alpine (port 6379)
                                   keycloak:24.0 (port 8080)
```

| 서비스 | 이미지 | AUTH_MODE | 포트 | 특이사항 |
|--------|--------|-----------|------|---------|
| `wiki` | 로컬 빌드 | `private` | 3000:3000 | Keycloak 연동 |
| `redis` | `redis:7-alpine` | - | 6379:6379 | 데이터 볼륨 마운트 |
| `keycloak` | `quay.io/keycloak/keycloak:24.0` | - | 8080:8080 | `start-dev` 모드 |

**`docker-compose.dev.yml` (개발 환경):**

| 특징 | 설명 |
|------|------|
| AUTH_MODE | `public` (인증 없이 즉시 실행) |
| 포트 매핑 | wiki 3001:3000, redis 16380:6379 (충돌 방지) |
| Redis | `appendonly yes`로 AOF 지속성 확보 |
| 네트워크 | `sepilot-network` 전용 네트워크 |
| 컨테이너 이름 | `sepilot-wiki`, `sepilot-redis` 명시적 지정 |

**강점:**
- 프로덕션/개발 환경 분리로 사용 편의성 확보
- 모든 서비스에 healthcheck 설정 (`depends_on: condition: service_healthy`)
- `restart: unless-stopped`로 서비스 자동 재시작
- Redis에 볼륨 마운트(`redis-data:/data`)로 데이터 지속성 확보

**약점:**
- Redis에 비밀번호 미설정 (보안 우려)
- `docker-compose.yml`에서 Keycloak `start_period: 60s`로 느린 초기화
- Keycloak `KEYCLOAK_ADMIN=admin / KEYCLOAK_ADMIN_PASSWORD=admin` 하드코딩

### 2.3 컨테이너화 평가

| 항목 | 점수 | 평가 |
|------|------|------|
| 멀티스테이지 빌드 | 9/10 | 3단계 분리로 최종 이미지 최소화 |
| 베이스 이미지 선택 | 8/10 | Alpine 기반 경량화 |
| 보안 사용자 | 9/10 | non-root 실행, UID/GID 1001 |
| 헬스체크 | 8/10 | Dockerfile 내장 + Compose 레벨 |
| 캐싱 전략 | 7/10 | 의존성 레이어 분리, 단 `COPY . .`가 캐시 무효화 유발 가능 |
| 빌드 유연성 | 8/10 | BUILD_MODE, AUTH_MODE ARG로 듀얼 빌드 지원 |

---

## 3. 오케스트레이션 (Kubernetes / Helm)

### 점수: 8/10 (Level 4 - 관리)

### 3.1 Helm Chart 구조

```
helm/sepilot-wiki/
├── Chart.yaml              # v0.1.0, appVersion 0.2.0
├── values.yaml             # 기본 설정값 (개발/스테이징)
├── values-prod.yaml        # 프로덕션 오버라이드
└── templates/
    ├── _helpers.tpl         # 템플릿 헬퍼 (fullname, labels, secretName)
    ├── deployment.yaml      # Deployment + 보안 컨텍스트 + 프로브
    ├── service.yaml         # ClusterIP Service (80 -> 3000)
    ├── ingress.yaml         # Ingress (조건부, nginx)
    ├── hpa.yaml             # HPA (조건부, CPU/메모리)
    ├── secret.yaml          # Secret (조건부, externalSecrets 지원)
    ├── serviceaccount.yaml  # ServiceAccount (조건부)
    └── NOTES.txt            # 설치 후 안내
```

### 3.2 리소스 설정 비교

| 항목 | 기본값 (`values.yaml`) | 프로덕션 (`values-prod.yaml`) |
|------|----------------------|-------------------------------|
| 레플리카 | 1 | 2 |
| CPU 요청/제한 | 100m / 500m | 200m / 1000m |
| 메모리 요청/제한 | 256Mi / 512Mi | 512Mi / 1Gi |
| HPA | 비활성화 | CPU 70%, 메모리 80%, min 2, max 10 |
| Ingress | 비활성화 | 활성화 (nginx + cert-manager + TLS) |
| 이미지 정책 | `IfNotPresent` | `Always` |
| Pod Anti-Affinity | 미설정 | `preferredDuringSchedulingIgnoredDuringExecution` |

### 3.3 보안 컨텍스트 상세 분석

Helm values에 정의된 보안 컨텍스트는 CIS Kubernetes Benchmark를 잘 준수한다.

```yaml
podSecurityContext:
  fsGroup: 1001

securityContext:
  runAsNonRoot: true
  runAsUser: 1001
  runAsGroup: 1001
  allowPrivilegeEscalation: false
  capabilities:
    drop:
      - ALL
  readOnlyRootFilesystem: true
  seccompProfile:
    type: RuntimeDefault
```

| 보안 정책 | 설정 | CIS 항목 | 효과 |
|----------|------|---------|------|
| `runAsNonRoot` | `true` | 5.2.6 | root 실행 차단 |
| `runAsUser/Group` | `1001` | 5.2.6 | Dockerfile의 nextjs 사용자와 일치 |
| `allowPrivilegeEscalation` | `false` | 5.2.5 | 권한 상승 차단 |
| `capabilities.drop` | `ALL` | 5.2.7 | 모든 Linux capabilities 제거 |
| `readOnlyRootFilesystem` | `true` | 5.2.4 | 파일 시스템 쓰기 차단 |
| `seccompProfile` | `RuntimeDefault` | 5.2.8 | 시스템 콜 필터링 |

`readOnlyRootFilesystem: true` 대응으로 `emptyDir` 볼륨이 적절히 구성:
```yaml
volumeMounts:
  - name: tmp        -> /tmp
  - name: next-cache -> /app/.next/cache
```

### 3.4 프로브 설정

| 프로브 | 경로 | 초기 지연 | 주기 | 타임아웃 | 실패 임계 |
|--------|------|----------|------|---------|----------|
| Liveness | `/api/health` | 10s | 30s | 10s | 3회 |
| Readiness | `/api/health` | 5s | 10s | 5s | 3회 |

### 3.5 Secret 관리

Deployment 템플릿의 Secret 참조 패턴:
```yaml
# 조건부 Secret 참조 (auth.mode === "private" 시)
- name: KEYCLOAK_CLIENT_SECRET
  valueFrom:
    secretKeyRef:
      name: {{ include "sepilot-wiki.secretName" . }}
      key: {{ .Values.auth.keycloak.clientSecretKey }}
```

`_helpers.tpl`의 `sepilot-wiki.secretName`은 `externalSecrets.enabled` 여부에 따라 내부/외부 Secret을 선택한다.

**Deployment에 Secret 체크섬 어노테이션 적용:**
```yaml
annotations:
  checksum/secret: {{ include (print $.Template.BasePath "/secret.yaml") . | sha256sum }}
```
이를 통해 Secret 내용 변경 시 Pod가 자동으로 재시작된다.

### 3.6 프로덕션 Ingress 설정

```yaml
ingress:
  enabled: true
  className: "nginx"
  annotations:
    kubernetes.io/tls-acme: "true"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
  tls:
    - secretName: wiki-tls
      hosts:
        - wiki.example.com
```

**강점:**
- externalSecrets 지원으로 Vault/AWS Secrets Manager 등 연동 가능
- Secret 체크섬으로 설정 변경 시 자동 롤링 업데이트
- 프로덕션 Pod Anti-Affinity로 노드 분산 배치
- HPA가 CPU와 메모리 양쪽 모두 기준으로 스케일링

**약점:**
- **Startup Probe 미설정** - 초기 구동이 느린 경우 Liveness 실패로 재시작 루프 가능
- **PodDisruptionBudget (PDB) 미정의** - 노드 유지보수(drain) 시 모든 Pod 동시 제거 가능
- **NetworkPolicy 미정의** - Pod 간 네트워크 트래픽 무제한
- Redis Helm dependency 미선언 (별도 배포 필요)
- `Chart.yaml`의 `appVersion: 0.2.0`이 실제 v0.4.0과 불일치
- `serviceAccount.automount: true` - K8s API 미사용 시 불필요한 토큰 마운트

### 3.7 오케스트레이션 평가

| 항목 | 점수 | 평가 |
|------|------|------|
| 보안 컨텍스트 | 9/10 | CIS Benchmark 수준, non-root + capabilities drop ALL |
| 리소스 관리 | 8/10 | 요청/제한 설정, 환경별 분리 |
| 자동 스케일링 | 7/10 | HPA CPU/메모리 기반 구성 |
| 가용성 | 6/10 | PDB 미정의, Startup Probe 없음 |
| Secret 관리 | 8/10 | externalSecrets 지원, 체크섬 어노테이션 |
| 네트워크 정책 | 3/10 | NetworkPolicy 미정의 |

---

## 4. CI/CD 파이프라인

### 점수: 8/10 (Level 4 - 관리)

### 4.1 워크플로우 전체 맵

프로젝트에는 총 14개의 GitHub Actions 워크플로우가 존재한다.

| # | 워크플로우 | 트리거 | 실행 환경 | 용도 |
|---|-----------|--------|----------|------|
| 1 | `ci.yml` | push/PR (main, develop) | `jhl-space` | Lint, Test, E2E, Build |
| 2 | `deploy-pages.yml` | push(main), cron(10분), gollum, dispatch | `ubuntu-latest` | GitHub Pages 배포 |
| 3 | `docker-build.yml` | push(main), dispatch | `jhl-space` | Docker 이미지 빌드 + GitOps 업데이트 |
| 4 | `issue-handler.yml` | issues, issue_comment, push | `jhl-space` | Issue 기반 AI 문서 자동화 |
| 5 | `scheduled-collect.yml` | cron(6시간), dispatch | `jhl-space` | GitHub Actions 상태 수집 |
| 6 | `wiki-tree-maintainer.yml` | cron(주 1회 월요일), dispatch | `jhl-space` | Wiki 구조 분석/유지보수 |
| 7 | `codeql.yml` | push/PR(main), cron(주 1회) | `ubuntu-latest` | 보안 코드 분석 (SAST) |
| 8 | `gemini-dispatch.yml` | PR, issues, issue_comment, review | `ubuntu-latest` | Gemini CLI 이벤트 라우팅 |
| 9 | `gemini-invoke.yml` | workflow_call | `ubuntu-latest` | Gemini CLI 범용 실행 |
| 10 | `gemini-review.yml` | workflow_call | `ubuntu-latest` | Gemini PR 코드 리뷰 |
| 11 | `gemini-triage.yml` | workflow_call | `ubuntu-latest` | Gemini Issue 분류 |
| 12 | `gemini-scheduled-triage.yml` | cron(매시간), dispatch | `ubuntu-latest` | 미분류 Issue 일괄 분류 |
| 13 | `gemini-link-validator.yml` | cron(매일), dispatch | `jhl-space` | Wiki 링크 유효성 검사 |
| 14 | `gemini-pr-review.yml` | PR(synchronize) | `jhl-space` | OpenAI 기반 PR 리뷰 |

### 4.2 CI 파이프라인 상세 (`ci.yml`)

```
lint (Bun)           ──>
test (Bun + Vitest)  ──>  e2e (Playwright, Chromium)  ──>  build
```

| Job | 도구 | 주요 동작 | 아티팩트 |
|-----|------|----------|---------|
| `lint` | ESLint, TypeScript | `bun run lint` + `bun run typecheck` | - |
| `test` | Vitest, Codecov | `npx vitest run --coverage` | `coverage/lcov.info` |
| `e2e` | Playwright | `npx playwright test --project=chromium` | `playwright-report/` (7일) |
| `build` | Bun, Next.js | `bun run build` | `dist/` (7일) |

**파이프라인 특성:**
- `lint`와 `test`가 직렬 의존 관계 (병렬화 여지 있음)
- `e2e`는 `lint + test` 완료 후 실행 (적절한 게이트)
- Codecov `fail_ci_if_error: false` - 커버리지 실패 시에도 CI 통과
- 자체 호스팅 러너(`jhl-space`)와 GitHub 호스팅 러너 혼용

### 4.3 Docker 빌드 및 GitOps (`docker-build.yml`)

```
Checkout → Docker Buildx → Harbor 로그인 → 빌드/푸시 → GitOps 저장소 checkout → values.yaml 태그 업데이트 → push
```

**주요 특징:**
- **이미지 레지스트리**: Harbor (자체 호스팅)
- **태그 전략**: `sha-<short-hash>` + `latest` 이중 태그
- **레이어 캐시**: `cache-from: type=registry`로 빌드 시간 최적화
- **GitOps 패턴**: 빌드 후 별도 GitOps 저장소(`jhl-labs/jhl-space-docs`)의 values 파일에서 이미지 태그를 `sed`로 업데이트

```
코드 변경 → GitHub Actions → Docker 이미지 빌드/푸시 (Harbor)
                                    ↓
                             GitOps 저장소 업데이트 (values.yaml)
                                    ↓
                             ArgoCD/Flux 감지 → K8s 롤링 업데이트
```

### 4.4 Issue 기반 AI 자동화 (`issue-handler.yml`)

```
                    ┌── request 라벨  → AI 문서 생성 (OpenAI)
                    ├── invalid 라벨  → AI 문서 수정 (OpenAI)
Issue 이벤트 ────> ├── closed        → 문서 발행 (draft -> published)
                    ├── reopened      → 발행 취소 (published -> draft)
                    └── comment       → maintainer 피드백 반영 (OpenAI)
                                           ↓
                                모든 핸들러 완료 → deploy-pages 트리거
```

**핵심 설계:**
- `concurrency: group: issue-handler, cancel-in-progress: false` - 순차 처리 보장
- maintainer 권한 확인: `repos.getCollaboratorPermissionLevel()` API로 OWNER/MEMBER/COLLABORATOR 검증
- 모든 핸들러가 빌드(`build:wiki`, `build:search`) + 상태 수집 + 커밋/푸시를 공통으로 수행
- `HUSKY: 0`으로 CI 환경에서 Git hooks 비활성화

### 4.5 듀얼 AI 리뷰 시스템

| 도구 | 워크플로우 | 트리거 | 역할 |
|------|-----------|--------|------|
| **Gemini CLI** | `gemini-dispatch` -> `gemini-review` | PR opened | MCP 기반 코드 리뷰 |
| **OpenAI** | `gemini-pr-review` | PR synchronize | 스크립트 기반 코드 리뷰 |

Gemini CLI는 `github-mcp-server:v0.18.0` Docker 컨테이너를 MCP 서버로 사용하여 GitHub API와 상호작용한다. `ratchet` 주석으로 액션 버전 핀(pin)을 관리한다.

### 4.6 스케줄 기반 워크플로우

| 워크플로우 | 스케줄 | 용도 |
|-----------|--------|------|
| `deploy-pages.yml` | `*/10 * * * *` | 10분마다 Pages 동기화 |
| `scheduled-collect.yml` | `0 */6 * * *` | 6시간마다 상태 수집 |
| `wiki-tree-maintainer.yml` | `0 0 * * 1` | 주 1회 Wiki 구조 분석 |
| `codeql.yml` | `0 6 * * 1` | 주 1회 보안 분석 |
| `gemini-scheduled-triage.yml` | `0 * * * *` | 매시간 Issue 자동 분류 |
| `gemini-link-validator.yml` | `0 0 * * *` | 매일 링크 유효성 검사 |

### 4.7 CI/CD 평가

| 항목 | 점수 | 평가 |
|------|------|------|
| 파이프라인 구조 | 9/10 | lint -> test -> e2e -> build 체계적 게이트 |
| 테스트 자동화 | 6/10 | 단위/E2E 인프라 존재, E2E 케이스 부족, 커버리지 게이트 없음 |
| 배포 자동화 | 8/10 | GitOps 패턴으로 K8s 배포 + Pages 자동 배포 |
| AI 자동화 | 9/10 | Issue-to-Document 전 과정 자동화 |
| 보안 검사 | 7/10 | CodeQL SAST, 그러나 DAST/SCA/이미지 스캔 미적용 |
| 워크플로우 관리 | 7/10 | concurrency 설정, permissions 명시, 14개 워크플로우 관리 복잡도 |

---

## 5. 스케줄러 시스템

### 점수: 7/10 (Level 4 - 관리)

### 5.1 아키텍처 개요

스케줄러는 Next.js 인프로세스(in-process) 방식으로, 분산 환경에서 안전한 작업 실행을 위해 Redis 기반 리더 선출을 사용한다.

```
┌──────────────────────────────────────────────────────────┐
│                    Scheduler Manager                      │
│                                                          │
│  initializeScheduler()                                   │
│       │                                                  │
│       ├── getAllJobs()  → 4개 BaseJob 인스턴스 생성        │
│       ├── registerJob() x4 → node-cron 태스크 등록        │
│       └── startScheduler()                               │
│              │                                           │
│              ├── connectRedis() (사용 가능 시)             │
│              ├── acquireLeadership()                      │
│              │      ├── SETNX (TTL 30s) → 리더 선출       │
│              │      └── Redis 없음 → 단일 인스턴스 모드    │
│              ├── task.start() x4 → cron 스케줄 활성화     │
│              └── setupShutdownHandlers()                  │
│                     ├── SIGTERM → stopScheduler()         │
│                     └── SIGINT  → stopScheduler()         │
│                                                          │
│  executeJob() ─ 리더만 실행                               │
│       ├── job.run() → isEnabled() 확인 → execute()       │
│       └── recordExecution() → Redis LPUSH (100건 LTRIM)  │
└──────────────────────────────────────────────────────────┘
```

### 5.2 리더 선출 메커니즘 상세

`lib/scheduler/leader-election.ts`에 구현된 리더 선출:

| 구성 요소 | 값 | 설명 |
|----------|---|------|
| 리더 키 | `sepilot-wiki:scheduler:leader` | Redis STRING 키 |
| TTL | 30초 | 리더 키 만료 시간 |
| Heartbeat 주기 | 10초 | TTL 갱신 간격 (TTL의 1/3) |
| Watch 주기 | 10초 | 비리더 노드의 리더 상태 확인 |
| 최대 재시도 지연 | 60초 | 지수 백오프 상한 |
| Pod ID | `HOSTNAME` / `POD_NAME` / `local-<pid>` | 리더 식별자 |

**리더 획득 (SETNX + TTL):**
```
SET "sepilot-wiki:scheduler:leader" <POD_ID> EX 30 NX
  ├── "OK"   → 리더 획득 → startHeartbeat() (10s 간격)
  └── (nil)  → 기존 리더 → GET 리더 ID → startLeaderWatch() (10s 간격)
```

**Heartbeat TTL 갱신 (Lua 스크립트 - 원자적 compare-and-expire):**
```lua
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("expire", KEYS[1], ARGV[2])
else
  return 0  -- 리더십 상실 감지
end
```

**리더십 포기 (Lua 스크립트 - 원자적 compare-and-delete):**
```lua
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0  -- 이미 다른 리더
end
```

이 Lua 스크립트는 자신이 리더인 경우에만 키를 삭제하여 다른 Pod의 리더십을 실수로 제거하는 것을 방지한다.

**Redis 폴백 (단일 인스턴스 모드):**
```typescript
export function isLeader(): boolean {
  if (!isRedisEnabled()) return true;  // Redis 없으면 항상 리더
  return isCurrentLeader;
}
```

**Heartbeat 실패 시 복구:**
```typescript
// Heartbeat에서 result === 0 (리더십 상실)
isCurrentLeader = false;
stopHeartbeat();
retryAttempt++;
const delay = Math.min(1000 * Math.pow(2, retryAttempt - 1), 60000);
setTimeout(() => acquireLeadership(), delay);
```

### 5.3 등록 작업 상세

| 작업 | 클래스 | 스케줄 | 활성화 조건 | 외부 의존 |
|------|--------|--------|------------|----------|
| `collect-status` | `CollectStatusJob` | `0 */6 * * *` (6시간) | `GITHUB_REPO` 설정 | GitHub API |
| `sync-issues` | `SyncIssuesJob` | `*/10 * * * *` (10분) | `GITHUB_REPO` 설정 | GitHub API |
| `validate-links` | `ValidateLinksJob` | `0 0 * * *` (매일 자정) | `wiki/` 디렉토리 존재 | 로컬 FS + GitHub API |
| `maintain-tree` | `MaintainTreeJob` | `0 0 * * 1` (주 1회 월요일) | OpenAI API 키 + 스크립트 | OpenAI API, `spawn` |

**BaseJob Template Method 패턴:**
```typescript
abstract class BaseJob {
  abstract readonly name: string;
  abstract readonly schedule: string;
  abstract readonly description: string;

  async run(): Promise<JobResult> {
    if (!(await this.isEnabled())) return { success: true, message: '비활성화' };
    return await this.execute();
  }

  protected abstract execute(): Promise<JobResult>;

  // 지수 백오프 재시도 내장
  protected async executeWithRetry<T>(fn, { maxRetries=3, delayMs=1000, backoff=true }): Promise<T>
}
```

**작업별 특이사항:**

| 작업 | 출력 | 비고 |
|------|------|------|
| `collect-status` | `public/actions-status.json` | `Promise.all`로 3개 API 병렬 호출 |
| `sync-issues` | `data/issues.json` | 페이지네이션 최대 10페이지 (1000 Issue) |
| `validate-links` | GitHub Issue 생성/업데이트 | 내부 링크만 검사, 외부 HTTP 링크 건너뜀 |
| `maintain-tree` | `spawn` 결과 | 10분 타임아웃, SIGTERM 종료, `DRY_RUN=false` |

### 5.4 실행 이력 관리

| 항목 | Redis 키 | 구조 | 보관 |
|------|---------|------|------|
| 전체 이력 | `sepilot-wiki:scheduler:history` | LIST | 최근 100건 (LPUSH + LTRIM) |
| 작업별 최종 | `sepilot-wiki:scheduler:job:<name>:lastRun` | STRING | 7일 TTL |

### 5.5 스케줄러 API

```
GET  /api/scheduler           → 상태, 리더 정보, 작업 목록
POST /api/scheduler           → 시작/중지 제어
GET  /api/scheduler/history   → 실행 이력 조회
GET  /api/scheduler/jobs      → 등록 작업 목록
POST /api/scheduler/jobs/:name → 수동 실행
```

### 5.6 스케줄러 평가

| 항목 | 점수 | 평가 |
|------|------|------|
| 리더 선출 | 8/10 | SETNX + Lua 원자적 처리, Heartbeat + Watch |
| 폴백 전략 | 9/10 | Redis 없이 단일 인스턴스 자동 전환 |
| 작업 관리 | 7/10 | BaseJob 패턴, 재시도 로직, isEnabled 체크 |
| 동시성 제어 | 6/10 | 리더 기반이나 작업 수준 분산 락 미구현 |
| 모니터링 | 5/10 | API 존재, 메트릭 없음 |
| 장애 복구 | 6/10 | 지수 백오프, 단 리더 전환 시 진행 중 작업 보호 미흡 |

---

## 6. 모니터링 및 관찰 가능성

### 점수: 4/10 (Level 2 - 반복)

### 6.1 헬스체크 현황

`app/api/health/route.ts`:
```typescript
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
}
```

**문제점:** 실제 시스템 상태를 반영하지 않는 단순 OK 응답. Redis 장애, 스케줄러 중단, 디스크 풀 등의 상황에서도 `ok`를 반환한다. Kubernetes Liveness/Readiness 프로브가 이 엔드포인트를 사용하므로, 실제 장애 감지가 불가능하다.

**미확인 항목:**
- Redis 연결 상태
- 스케줄러 실행/리더 상태
- 디스크 공간
- GitHub API 접근성
- 메모리 사용량

### 6.2 로깅 패턴

구조화된 접두사 기반 로깅:

| 접두사 | 컴포넌트 | 예시 |
|--------|---------|------|
| `[Webhook]` | Webhook 수신/처리 | `[Webhook] 수신: issues/labeled (delivery-id)` |
| `[Scheduler]` | 스케줄러 관리 | `[Scheduler] 스케줄러 시작 완료` |
| `[Leader]` | 리더 선출 | `[Leader] POD_ID 리더로 선출됨 (TTL: 30s)` |
| `[Job:<name>]` | 개별 작업 | `[Job:sync-issues] 완료 (1523ms): 42개 동기화` |
| `[Redis]` | Redis 연결 | `[Redis] 연결됨` / `[Redis] 연결 오류: ...` |
| `[ENV]` | 환경변수 검증 | `[ENV] 환경변수 검증 통과` |

**강점:**
- 일관된 접두사 패턴으로 `kubectl logs | grep "[Leader]"` 필터링 가능
- 작업 실행 시간(duration ms) 로깅
- Redis 이벤트 핸들러(`connect`, `ready`, `close`, `error`) 구현

**약점:**
- `console.log/warn/error` 직접 사용 (Pino/Winston 등 구조화 라이브러리 미사용)
- JSON 형식이 아닌 텍스트 기반 → ELK/Loki 로그 파싱 어려움
- 로그 레벨 제어 불가 (`values.yaml`의 `config.logLevel: "info"` 정의만 존재, 실제 미사용)
- 상관 ID(Correlation ID) 없음 → 요청 추적 불가
- 타임스탬프가 로그 메시지에 포함되지 않음 (런타임/수집기에 의존)

### 6.3 관찰 가능성 도구 현황

| 도구 | 상태 | 비고 |
|------|------|------|
| **Prometheus** | 미구현 | `/metrics` 엔드포인트 없음 |
| **OpenTelemetry** | 미구현 | 분산 추적 없음 |
| **Grafana** | 미구현 | 대시보드 없음 |
| **Alerting** | 미구현 | 알림 시스템 없음 |
| **로그 수집** | 미구현 | 중앙 로그 수집 없음 |
| **APM** | 미구현 | 애플리케이션 성능 모니터링 없음 |
| **GitHub Actions 상태** | 부분 구현 | `collect-status` 작업이 `actions-status.json` 생성 |

### 6.4 관찰 가능성 평가

| 항목 | 점수 | 평가 |
|------|------|------|
| 헬스체크 | 3/10 | 단순 OK 응답, 의존 서비스 상태 미반영 |
| 로깅 | 5/10 | 접두사 패턴 일관적이나 구조화(JSON) 미흡 |
| 메트릭 | 1/10 | Prometheus/메트릭 완전 부재 |
| 분산 추적 | 1/10 | OpenTelemetry/추적 완전 부재 |
| 알림 | 1/10 | 알림 시스템 완전 부재 |
| 대시보드 | 2/10 | 스케줄러 API로 상태 조회 가능, 시각화 없음 |

---

## 7. 복원력 및 장애 대응

### 점수: 7/10 (Level 3 - 정의)

### 7.1 재시도 메커니즘

**클라이언트 사이드 (`src/utils/retry.ts`):**

`withRetry<T>()` - 범용 재시도:

| 설정 | 기본값 | 설명 |
|------|--------|------|
| `maxRetries` | 3 | 최대 재시도 횟수 |
| `initialDelay` | 1000ms | 초기 지연 |
| `maxDelay` | 30000ms | 최대 지연 |
| `backoffMultiplier` | 2 | 배수 |
| Jitter | 0.5 ~ 1.5배 | 무작위 분산 |

**지연 계산:**
```
delay = min(initialDelay * 2^(attempt-1), maxDelay) * random(0.5, 1.5)

예시 (기본값):
  1회차: 1000 * (0.5~1.5) =  500 ~ 1500ms
  2회차: 2000 * (0.5~1.5) = 1000 ~ 3000ms
  3회차: 4000 * (0.5~1.5) = 2000 ~ 6000ms
```

**`fetchWithRetry()` - HTTP 전용 재시도:**
- 5xx 서버 에러 및 429 Rate Limit에 대해 재시도
- `Retry-After` 헤더 파싱 (초 단위 및 HTTP-date 형식 지원)
- Rate Limit 대기 시간 최대 60초 제한
- 네트워크 에러(`TypeError: Failed to fetch`)도 재시도 대상

**서버 사이드 (`BaseJob.executeWithRetry`):**
- 기본: 최대 3회, 초기 1초, 지수 백오프 (지터 없음)
- 모든 예외에 대해 재시도 (shouldRetry 분리 없음)

**리더 선출 (`leader-election.ts`):**
- `Math.min(1000 * 2^(retryAttempt-1), 60000)` - 최대 60초 백오프

### 7.2 Graceful Shutdown

`lib/scheduler/scheduler-manager.ts`:

```
SIGTERM/SIGINT 수신
  ↓
stopScheduler()
  ├── task.stop() x 4        (모든 cron 태스크 중지)
  ├── releaseLeadership()     (Lua 스크립트로 원자적 키 삭제)
  └── disconnectRedis()       (redis.quit() + 클라이언트 null)
  ↓
process.exit(0)
```

**문제점:**
- 진행 중인 작업의 완료를 기다리지 않음 (작업이 중단될 수 있음)
- 종료 타임아웃 미설정 (Kubernetes `terminationGracePeriodSeconds` 기본 30초에 의존)
- `process.exit(0)` 호출로 비동기 작업 강제 종료
- `shutdownHandlersSetup` 플래그로 중복 등록 방지는 적절

### 7.3 Webhook 복원력

`lib/webhook/handler.ts`의 스크립트 실행 패턴:

```
spawn(script)
  ├── 정상 종료 (exit 0) → success + stdout (500자 제한)
  ├── 비정상 종료 (exit != 0) → failure + stderr 로깅
  ├── 5분 타임아웃
  │     ├── SIGTERM 전송 (정상 종료 요청)
  │     └── +10초 후 SIGKILL 전송 (강제 종료)
  └── spawn 오류 → error 로깅
```

| 보호 장치 | 설명 |
|----------|------|
| 2단계 종료 | SIGTERM -> 10초 대기 -> SIGKILL (좀비 프로세스 방지) |
| 비동기 처리 | `setImmediate`로 즉시 200 응답 후 백그라운드 처리 |
| 중복 resolve | `safeResolve` 래퍼 + `resolved` 플래그로 콜백 중복 방지 |
| 리스너 정리 | `cleanup()` 함수에서 타이머 + 이벤트 리스너 제거 |

`lib/webhook/verifier.ts`의 서명 검증:
- HMAC-SHA256 서명 검증 (`x-hub-signature-256`)
- `crypto.timingSafeEqual`로 타이밍 공격 방지
- `GITHUB_WEBHOOK_SECRET` 미설정 시 Webhook 완전 비활성화

### 7.4 Redis 폴백 전략

| 시나리오 | 동작 |
|----------|------|
| `REDIS_URL` 미설정 | `isRedisEnabled()` = false → 단일 인스턴스 모드 |
| 연결 실패 | 경고 로그, 단일 인스턴스 모드로 계속 |
| 실행 중 장애 | Heartbeat 실패 감지 → 지수 백오프 재연결 |
| 이력 저장 실패 | try/catch 에러 로깅, 작업 실행은 계속 |
| 이력 조회 실패 | 빈 배열 반환 |

### 7.5 복원력 평가

| 항목 | 점수 | 평가 |
|------|------|------|
| 재시도 전략 | 8/10 | 지수 백오프 + 지터 + Rate Limit 대응 |
| Graceful Shutdown | 6/10 | 기본 구현, 진행 중 작업 완료 대기 미구현 |
| Webhook 복원력 | 8/10 | 2단계 종료, 타이밍 공격 방지, 비동기 처리 |
| Redis 폴백 | 9/10 | 우아한 디그레이드, 자동 단일 인스턴스 전환 |
| 서킷 브레이커 | 2/10 | 미구현 |
| 장애 격리 | 5/10 | 작업별 독립 실행, 인프로세스 공유 제약 |

---

## 8. 환경변수 및 설정 관리

### 점수: 7/10 (Level 3 - 정의)

### 8.1 환경변수 체계

`.env.example`에 정의된 총 20+개 환경변수를 카테고리별로 분류:

| 카테고리 | 변수 | 필수 | 용도 |
|----------|------|------|------|
| **빌드** | `BUILD_MODE` | 선택 | `static` / `standalone` |
| | `AUTH_MODE` | 선택 | `public` / `private` |
| | `NEXT_PUBLIC_AUTH_MODE` | 선택 | 클라이언트 인증 모드 |
| | `NEXT_PUBLIC_BASE_PATH` | 선택 | GitHub Pages base path |
| **GitHub** | `GITHUB_REPO` | **필수** | `owner/repo` 형식 |
| | `GITHUB_TOKEN` | 선택 | API 토큰 (Rate Limit 완화) |
| | `GITHUB_WEBHOOK_SECRET` | 선택 | Webhook 서명 검증 |
| | `GITHUB_BASE_URL` / `API_URL` / `RAW_URL` | 선택 | GHES 지원 |
| **인증** | `KEYCLOAK_CLIENT_ID` | 조건부 | private 모드 시 필수 |
| | `KEYCLOAK_CLIENT_SECRET` | 조건부 | private 모드 시 필수 |
| | `KEYCLOAK_ISSUER` | 조건부 | private 모드 시 필수 |
| | `NEXTAUTH_URL` / `NEXTAUTH_SECRET` | 조건부 | private 모드 시 필수 |
| **스케줄러** | `SCHEDULER_ENABLED` | 선택 | 활성화 여부 |
| | `SCHEDULER_API_KEY` | 선택 | API 인증 키 |
| **Redis** | `REDIS_URL` | 선택 | 연결 URL (우선) |
| | `REDIS_HOST` / `PORT` / `PASSWORD` | 선택 | 개별 설정 |

### 8.2 환경변수 검증 시스템

`lib/env-validation.ts`의 `validateEnv()`:

```typescript
// 1. 필수 변수 확인
GITHUB_REPO → required: true → 미설정 시 에러

// 2. 조건부 필수 검증
AUTH_MODE === 'private' →
  KEYCLOAK_CLIENT_ID, KEYCLOAK_CLIENT_SECRET, KEYCLOAK_ISSUER 필수

// 3. 경고
GITHUB_WEBHOOK_SECRET 미설정 → "Webhook이 비활성화됩니다" 경고
```

**검증 결과 구조:**
```typescript
interface ValidationResult {
  valid: boolean;    // 에러가 0개면 true
  errors: string[];  // 필수 변수 누락 등
  warnings: string[]; // 선택 변수 미설정 알림
}
```

### 8.3 스케줄러 활성화 조건

`shouldEnableScheduler()`:
```typescript
BUILD_MODE === 'static'         → false (Pages 빌드에서 비활성화)
SCHEDULER_ENABLED === 'false'   → false (명시적 비활성화)
BUILD_MODE === 'standalone'     → true
SCHEDULER_ENABLED === 'true'    → true
```

### 8.4 설정 관리 평가

| 항목 | 점수 | 평가 |
|------|------|------|
| 문서화 | 8/10 | `.env.example` 충실, 카테고리별 분리, 생성 방법 안내 |
| 검증 | 6/10 | 필수/조건부 검증 존재, 값 형식 검증 미흡 |
| 보안 | 7/10 | K8s Secret + 환경변수 관리, 로그에 값 미노출 |
| 유연성 | 8/10 | 듀얼 빌드, GHES 지원, Redis 선택적, 인증 모드 전환 |
| 기본값 | 7/10 | 합리적 기본값 제공 |

---

## 9. 보안 운영

### 점수: 8/10 (Level 4 - 관리)

### 9.1 컨테이너 보안 체크리스트

| 항목 | 상태 | 구현 위치 |
|------|------|----------|
| non-root 실행 | O | Dockerfile (`USER nextjs`, UID 1001) + Helm (`runAsNonRoot`) |
| 읽기 전용 파일 시스템 | O | Helm (`readOnlyRootFilesystem: true`) + emptyDir 마운트 |
| Capabilities 전체 제거 | O | Helm (`capabilities.drop: ALL`) |
| Seccomp 프로파일 | O | Helm (`seccompProfile: RuntimeDefault`) |
| 권한 상승 차단 | O | Helm (`allowPrivilegeEscalation: false`) |
| Alpine 기반 이미지 | O | `node:20-alpine` |
| 재현 가능한 빌드 | O | `bun install --frozen-lockfile` |

### 9.2 Webhook 보안

`lib/webhook/verifier.ts`:

| 보안 조치 | 구현 | 상세 |
|----------|------|------|
| HMAC-SHA256 검증 | O | `crypto.createHmac('sha256', secret).update(body).digest('hex')` |
| 타이밍 공격 방지 | O | `crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))` |
| 이벤트 헤더 검증 | O | `x-github-event` 필수 확인 |
| JSON 파싱 검증 | O | 본문 파싱 실패 시 `{ valid: false }` 반환 |
| 시크릿 미설정 차단 | O | `GITHUB_WEBHOOK_SECRET` 없으면 Webhook 완전 비활성화 |
| 비동기 처리 | O | 즉시 200 응답 후 `setImmediate` 백그라운드 처리 |

### 9.3 네트워크 보안

| 항목 | 상태 | 비고 |
|------|------|------|
| TLS 인증서 | O (프로덕션) | cert-manager + letsencrypt-prod |
| SSL 리다이렉션 | O (프로덕션) | `ssl-redirect: "true"` |
| Body 크기 제한 | O (프로덕션) | `proxy-body-size: "10m"` |
| NetworkPolicy | X | Pod 간 네트워크 격리 없음 |

### 9.4 Secret 관리

| 시크릿 | Helm Secret 포함 | K8s 관리 |
|--------|-----------------|---------|
| Keycloak Client Secret | O | `secretKeyRef` |
| NextAuth Secret | O | `secretKeyRef` |
| GitHub Token | O | `secretKeyRef` |
| GitHub Webhook Secret | **X** | 환경변수만 |
| Redis Password | **X** | 환경변수만 |
| Scheduler API Key | **X** | 환경변수만 |

### 9.5 CI/CD 보안

| 항목 | 상태 | 비고 |
|------|------|------|
| CodeQL SAST | O | 주 1회 + PR/push, `security-extended` 쿼리 |
| 최소 권한 원칙 | O | 워크플로우마다 `permissions` 명시 |
| GitHub Secrets | O | 토큰, 시크릿 등 Secret으로 관리 |
| 액션 버전 핀 | 부분 | Gemini 워크플로우에서 `ratchet` 주석 사용 |
| 의존성 취약점 | **X** | Dependabot/Snyk 미설정 |
| 이미지 스캔 | **X** | Trivy/Snyk Container 미설정 |
| SBOM 생성 | **X** | Software BOM 미생성 |

### 9.6 보안 운영 평가

| 항목 | 점수 | 평가 |
|------|------|------|
| 컨테이너 보안 | 9/10 | CIS Benchmark 수준 |
| Webhook 보안 | 9/10 | HMAC + timingSafeEqual + 시크릿 강제 |
| Secret 관리 | 6/10 | 일부 시크릿 미관리, Secret rotation 없음 |
| 네트워크 보안 | 5/10 | TLS 적용, NetworkPolicy 미구현 |
| 공급망 보안 | 3/10 | 이미지 스캔, SBOM, 의존성 감사 미구현 |
| SAST | 7/10 | CodeQL 적용, DAST 미구현 |

---

## 10. 배포 전략

### 점수: 7/10 (Level 3 - 정의)

### 10.1 듀얼 배포 아키텍처

```
┌───────────────────────────────────────────────────────────┐
│                     소스 코드 (main)                       │
│                                                           │
│    BUILD_MODE=static              BUILD_MODE=standalone    │
│         |                              |                  │
│  ┌──────────────┐             ┌──────────────────┐        │
│  │ Vite 정적 빌드 │             │ Next.js standalone │        │
│  │   (export)    │             │   (server.js)     │        │
│  └──────┬───────┘             └────────┬─────────┘        │
│         |                              |                  │
│  ┌──────────────┐             ┌──────────────────┐        │
│  │ GitHub Pages  │             │ Harbor Registry   │        │
│  │   (CDN)      │             │                  │        │
│  └──────────────┘             └────────┬─────────┘        │
│                                        |                  │
│                               ┌──────────────────┐        │
│                               │ GitOps 저장소     │        │
│                               │ (values.yaml 태그) │        │
│                               └────────┬─────────┘        │
│                                        |                  │
│                               ┌──────────────────┐        │
│                               │ Kubernetes (Helm) │        │
│                               │ + Redis + Keycloak │        │
│                               └──────────────────┘        │
└───────────────────────────────────────────────────────────┘
```

### 10.2 배포 모드 비교

| 특성 | GitHub Pages (정적) | Kubernetes (standalone) |
|------|-------------------|----------------------|
| 트리거 | push, cron(10분), gollum, dispatch | push -> Docker 빌드 -> GitOps |
| 빌드 | Vite (`next export`) | Next.js standalone (`server.js`) |
| 인증 | public (없음) | private (Keycloak OAuth) |
| 스케줄러 | 비활성화 | Redis 리더 선출 기반 |
| Webhook | 비활성화 | HMAC 서명 검증 |
| 데이터 동기화 | 빌드 시 Issue/상태 수집 | 스케줄러 + API |
| 스케일링 | CDN | HPA (CPU/메모리 기반) |
| 비용 | 무료 | 인프라 비용 |

### 10.3 롤링 업데이트 설정

Helm `deployment.yaml`에 명시적 전략 미정의 → Kubernetes 기본값 적용:

| 설정 | 값 (기본값) |
|------|-----------|
| `strategy.type` | `RollingUpdate` |
| `maxUnavailable` | 25% |
| `maxSurge` | 25% |

프로덕션 `replicaCount: 2`에서는 롤링 업데이트 시 항상 1개 Pod 가용.

### 10.4 배포 전략 평가

| 항목 | 점수 | 평가 |
|------|------|------|
| 듀얼 배포 | 8/10 | Pages + K8s 동시 지원, 자연스러운 DR 폴백 |
| GitOps | 7/10 | 이미지 태그 자동 업데이트, ArgoCD/Flux 연동 준비 |
| 롤아웃 전략 | 5/10 | 명시적 전략 미정의, 기본값 의존 |
| 롤백 | 4/10 | 자동 롤백 미구현, 수동 `helm rollback` 필요 |
| 카나리/블루-그린 | 2/10 | 미구현 |
| 환경 분리 | 7/10 | values.yaml / values-prod.yaml 분리 |

---

## 11. DORA Metrics 관점 평가

### 11.1 배포 빈도 (Deployment Frequency)

| 배포 경로 | 빈도 | DORA 등급 |
|-----------|------|-----------|
| GitHub Pages | 10분마다 (cron) + push 시 | **Elite** (일 144+회) |
| Kubernetes | main push 시 (GitOps) | **High** (주 수회) |

### 11.2 변경 리드 타임 (Lead Time for Changes)

| 단계 | 소요 시간 |
|------|----------|
| CI (lint + test + e2e + build) | ~5-10분 |
| GitHub Pages 배포 | ~2-3분 |
| K8s (Docker 빌드 + GitOps + 동기화) | ~5-10분 |
| **총 리드 타임** | **~10-20분 (High)** |

### 11.3 변경 실패율 (Change Failure Rate)

| 안전장치 | 상태 | 효과 |
|---------|------|------|
| CI 테스트 게이트 | O | 빌드 실패 시 차단 |
| E2E 테스트 | O (인프라만) | 테스트 케이스 부족 |
| CodeQL 보안 스캔 | O | 취약점 사전 감지 |
| 커버리지 게이트 | **X** | 미보장 |
| 스테이징 환경 | **X** | 프로덕션 직접 배포 |
| 카나리/Feature Flag | **X** | 점진적 롤아웃 불가 |

**평가: Medium** - 테스트 커버리지 부족, 스테이징 부재

### 11.4 평균 복구 시간 (MTTR)

| 장애 유형 | 복구 방식 | 예상 MTTR |
|----------|----------|----------|
| Pod 장애 | K8s Liveness 재시작 | ~1-2분 |
| 리더 노드 장애 | TTL 만료 + Watch | ~30-40초 |
| 배포 장애 | GitOps 수동 롤백 | ~10-30분 |
| 데이터 손상 | Git 이력 복원 | ~30분-1시간 |

### 11.5 DORA 종합

| 지표 | 현재 | DORA 등급 | 목표 |
|------|------|----------|------|
| 배포 빈도 | Pages: 10분/K8s: push | High-Elite | Elite |
| 리드 타임 | 10-20분 | High | Elite (<10분) |
| 변경 실패율 | 추정 중~높음 | Medium | High (<15%) |
| MTTR | 인프라 ~1분, 앱 ~30분 | Medium-High | High (<1시간) |

---

## 12. SLA/SLO 제안

### 12.1 SLI (Service Level Indicators)

| SLI | 측정 방법 | 현재 |
|-----|----------|------|
| **가용성** | 성공 요청 / 전체 요청 | 미측정 |
| **지연 시간** | P50, P95, P99 | 미측정 |
| **에러율** | 5xx / 전체 응답 | 미측정 |
| **스케줄러 성공률** | 성공 작업 / 전체 작업 | Redis 이력 산출 가능 |
| **콘텐츠 신선도** | 마지막 동기화 시간 | 10분 cron 추정 |

### 12.2 SLO 제안

**GitHub Pages:**

| 지표 | SLO | 근거 |
|------|-----|------|
| 가용성 | 99.9% (월 ~43분 다운타임) | GitHub Pages SLA 의존 |
| 페이지 로드 | P95 < 3초 | CDN 기반 |
| 콘텐츠 동기화 | < 20분 | 10분 cron + 빌드 시간 |

**Kubernetes:**

| 지표 | SLO | 근거 |
|------|-----|------|
| 가용성 | 99.5% (월 ~3.6시간 다운타임) | 2 Pod + HPA |
| API 응답 | P95 < 500ms, P99 < 2초 | 서버 사이드 |
| 스케줄러 성공률 | > 95% | 재시도 3회 포함 |
| 리더 재선출 | < 60초 | TTL 30s + Watch 10s |
| Webhook 처리 | < 5분 | 타임아웃 기준 |

### 12.3 에러 버짓

```
월간 99.5% 가용성:
  허용 다운타임 = 720시간 * 0.005 = 3.6시간 (216분)
  주간 버짓 = ~50분/주
```

에러 버짓 50% 초과 시 신규 기능 배포 중단, 안정성 작업 집중 정책 권장.

---

## 13. 재해 복구(DR) 전략 제안

### 13.1 현재 DR 역량

| DR 요소 | 상태 | 평가 |
|---------|------|------|
| 데이터 백업 | Git 이력 (코드 + wiki/) | 부분 (Redis 미백업) |
| 복원 절차 | 미문서화 | 미흡 |
| RTO/RPO | 미정의 | 미흡 |
| DR 테스트 | 미실시 | 미흡 |

### 13.2 RTO/RPO 제안

| 배포 환경 | RTO | RPO | 근거 |
|----------|-----|-----|------|
| GitHub Pages | 30분 | 10분 | Git 이력 + 재빌드 |
| Kubernetes | 1시간 | 30분 | Helm 롤백 + 데이터 복원 |

### 13.3 장애 시나리오별 대응

**시나리오 1: GitHub Pages 배포 장애**
```
RTO: 30분
1. GitHub Actions 로그 확인 → 빌드 오류 식별
2. 마지막 성공 빌드 아티팩트로 수동 배포
3. GitHub Pages 서비스 장애 시 → K8s 배포로 DNS 전환
```

**시나리오 2: Kubernetes 클러스터 장애**
```
RTO: 1시간
1. kubectl get nodes → 노드 상태 확인
2. HPA + Anti-Affinity → 다른 노드에서 자동 재스케줄
3. 전체 클러스터 장애 → GitHub Pages가 읽기 전용 폴백
4. Redis 데이터 손실 → 스케줄러 이력만 초기화 (기능 영향 없음)
```

**시나리오 3: 데이터 손상 (wiki/ 폴더)**
```
RTO: 15분, RPO: 마지막 정상 커밋
1. git log → 정상 커밋 식별
2. git revert/checkout → wiki/ 복원
3. bun run build:wiki && build:search
4. git push → 자동 배포
```

**시나리오 4: 비밀 정보 유출**
```
RTO: 즉시 대응
1. 유출 토큰 즉시 무효화
2. GitHub Secrets / Helm Secret 재생성
3. Keycloak/Redis 비밀번호 변경
4. 감사 로그 검토 + 포스트모템
```

### 13.4 DR 인프라 티어

```
[Tier 1: 현재 구현] Git 이력 + GitHub Pages 읽기 전용 폴백
[Tier 2: 권장]      Redis AOF/RDB 백업 + Vault 시크릿 관리
[Tier 3: 이상적]    다중 리전 + DNS 페일오버 + 정기 DR 테스트
```

---

## 14. 종합 평가

### 14.1 영역별 점수 요약

| # | 영역 | 점수 | Level | 요약 |
|---|------|------|-------|------|
| 1 | 컨테이너화 | **8/10** | Level 4 | 멀티스테이지 빌드, non-root, HEALTHCHECK |
| 2 | 오케스트레이션 | **8/10** | Level 4 | CIS 보안 컨텍스트, HPA, externalSecrets |
| 3 | CI/CD 파이프라인 | **8/10** | Level 4 | 14개 워크플로우, GitOps, AI 자동화 |
| 4 | 스케줄러 시스템 | **7/10** | Level 4 | Redis 리더 선출 + Lua, 단일 인스턴스 폴백 |
| 5 | 모니터링/관찰 가능성 | **4/10** | Level 2 | **최대 약점**, Prometheus/OTel 전무 |
| 6 | 복원력/장애 대응 | **7/10** | Level 3 | 재시도/폴백 양호, 서킷 브레이커 미구현 |
| 7 | 환경변수/설정 관리 | **7/10** | Level 3 | 검증 시스템, GHES 지원, 형식 검증 미흡 |
| 8 | 보안 운영 | **8/10** | Level 4 | 컨테이너/Webhook 보안 우수, 공급망 미흡 |
| 9 | 배포 전략 | **7/10** | Level 3 | 듀얼 배포 독창적, 롤백/카나리 미구현 |

### 14.2 종합 점수

```
전체 평균: 7.1/10 (Level 3 ~ Level 4 경계)
운영 성숙도: Level 3 (정의) 달성, Level 4 (관리) 진입 중
```

### 14.3 SWOT 분석

**강점(Strengths):**
- 컨테이너 보안이 CIS Kubernetes Benchmark 수준 (non-root, readOnlyFS, seccomp, capabilities)
- Redis SETNX + Lua 스크립트 리더 선출 + 자동 단일 인스턴스 폴백
- 듀얼 배포(Pages + K8s)가 자연스러운 DR 전략 역할
- GitOps 패턴으로 선언적 K8s 배포 자동화
- Webhook HMAC-SHA256 + `timingSafeEqual` + 2단계 프로세스 종료
- 14개 워크플로우로 Issue-to-Document 전 과정 자동화

**약점(Weaknesses):**
- **모니터링이 가장 큰 약점** (Prometheus, OpenTelemetry, 알림 전무)
- 헬스체크가 실제 상태 미반영 (항상 OK)
- 구조화된 로깅(JSON) 미적용
- 서킷 브레이커 미구현으로 외부 서비스 장애 전파 가능
- PDB, NetworkPolicy 등 K8s 가용성/네트워크 보안 리소스 미완성

**기회(Opportunities):**
- OpenTelemetry 도입으로 메트릭 + 추적 + 로깅 통합
- Grafana 대시보드로 운영 가시성 대폭 향상
- Trivy 이미지 스캔 + Dependabot으로 공급망 보안 강화
- ArgoCD 연동으로 GitOps 완성도 향상

**위협(Threats):**
- Redis 단일 인스턴스 장애 시 스케줄러 불확실성
- 모니터링 부재로 장애 감지 지연
- E2E 테스트 부족으로 배포 후 회귀 위험
- 14개 워크플로우 유지보수 복잡도 증가

---

## 15. 개선 로드맵

### Phase 1: 즉시 개선 (1-2주)

| 우선순위 | 항목 | 현재 | 목표 | 공수 |
|---------|------|------|------|------|
| **P0** | 헬스체크 강화 | 단순 OK | Redis/스케줄러/디스크 상태 포함 | M (2-3일) |
| **P0** | 구조화된 로깅 | `console.log` | JSON 형식 (Pino) + 상관 ID | M (3-5일) |
| P1 | Liveness/Readiness 분리 | 동일 엔드포인트 | `/health/live`, `/health/ready` | S (1일) |
| P1 | PodDisruptionBudget | 미정의 | `minAvailable: 1` | S (1일) |
| P1 | Startup Probe | 미설정 | `initialDelay: 15s, failureThreshold: 10` | S (1일) |
| P1 | 커버리지 게이트 | 없음 | `fail_ci_if_error: true`, 최소 50% | S (1일) |
| P2 | 환경변수 형식 검증 | 존재 여부만 | 정규식 패턴 매칭 | S (1일) |

**헬스체크 강화 예시:**
```json
{
  "status": "ok | degraded | unhealthy",
  "timestamp": "2026-02-07T...",
  "checks": {
    "redis": { "status": "connected", "latency": "2ms" },
    "scheduler": { "status": "running", "isLeader": true, "jobs": 4 },
    "disk": { "status": "ok", "available": "1.2GB" }
  }
}
```

### Phase 2: 관찰 가능성 구축 (2-4주)

| 우선순위 | 항목 | 현재 | 목표 | 공수 |
|---------|------|------|------|------|
| **P0** | Prometheus 메트릭 | 미구현 | `/metrics` 엔드포인트 | M (1주) |
| P1 | Grafana 대시보드 | 미구현 | 가용성/지연/에러/스케줄러 시각화 | M (1주) |
| P1 | 알림 시스템 | 미구현 | Alertmanager + Slack | M (1주) |
| P2 | OpenTelemetry 추적 | 미구현 | 요청 분산 추적 | L (2주) |
| P2 | 의존성 보안 스캔 | 미구현 | Dependabot/Snyk | S (1일) |
| P2 | SLO 대시보드 | 미구현 | 에러 버짓 추적 | M (3-5일) |

**권장 메트릭:**
```
# 애플리케이션
sepilot_http_requests_total{method, status, path}
sepilot_http_request_duration_seconds{method, path}

# 스케줄러
sepilot_scheduler_job_executions_total{job, status}
sepilot_scheduler_job_duration_seconds{job}
sepilot_scheduler_leader_status{pod}

# Webhook
sepilot_webhook_received_total{event, action}
sepilot_webhook_script_timeouts_total{script}

# Redis
sepilot_redis_connection_status
sepilot_redis_operations_total{operation}
```

### Phase 3: 복원력 강화 (4-8주)

| 우선순위 | 항목 | 현재 | 목표 | 공수 |
|---------|------|------|------|------|
| P1 | 서킷 브레이커 | 미구현 | GitHub API + OpenAI API | M (1주) |
| P1 | Graceful Shutdown 개선 | 기본 | 진행 중 작업 완료 대기 + 타임아웃 | M (3-5일) |
| P2 | NetworkPolicy | 미구현 | Wiki -> Redis만 허용 | S (1일) |
| P2 | 작업 수준 분산 락 | 리더 기반 | Redis 작업별 `SETNX` 락 | M (3-5일) |
| P3 | 자동 롤백 | 미구현 | 헬스체크 기반 자동 롤백 | L (2주) |

### Phase 4: 고급 운영 (8-16주)

| 우선순위 | 항목 | 현재 | 목표 | 공수 |
|---------|------|------|------|------|
| P2 | 이미지 스캔 (Trivy) | 미구현 | CI 파이프라인 통합 | S (1일) |
| P2 | SBOM 생성 | 미구현 | 빌드 시 자동 생성 | S (1일) |
| P3 | 카나리 배포 | 미구현 | Argo Rollouts / Flagger | L (2주) |
| P3 | Redis HA | 단일 인스턴스 | Redis Sentinel / Cluster | L (2주) |
| P3 | 카오스 엔지니어링 | 미구현 | Chaos Mesh / LitmusChaos | XL (4주) |
| P3 | 인시던트 프로세스 | 미구현 | Runbook + Post-mortem 템플릿 | M (1주) |

### 개선 시 예상 점수 변화

| 영역 | 현재 | Phase 1 | Phase 2 | Phase 3 | Phase 4 |
|------|------|---------|---------|---------|---------|
| 컨테이너화 | 8 | 8 | 8 | 8 | 9 |
| 오케스트레이션 | 8 | 9 | 9 | 9 | 9 |
| CI/CD | 8 | 8 | 8 | 8 | 9 |
| 스케줄러 | 7 | 7 | 8 | 9 | 9 |
| **모니터링** | **4** | **5** | **8** | 8 | 9 |
| 복원력 | 7 | 7 | 7 | **9** | 9 |
| 환경변수 | 7 | 8 | 8 | 8 | 8 |
| 보안 운영 | 8 | 8 | 8 | 9 | 9 |
| 배포 전략 | 7 | 7 | 7 | 8 | 9 |
| **평균** | **7.1** | **7.4** | **7.9** | **8.4** | **8.9** |

---

## 부록 A: 스케줄 이중화 맵

K8s 스케줄러 작업과 GitHub Actions 워크플로우가 동일한 작업을 수행하는 이중 구현이 존재한다.

| 작업 | 스케줄러 (K8s) | 워크플로우 (Actions) | 이중 실행 가능 |
|------|--------------|---------------------|-------------|
| 상태 수집 | `0 */6 * * *` | `scheduled-collect.yml` | **주의** |
| Issue 동기화 | `*/10 * * * *` | `deploy-pages.yml` (cron) | **주의** |
| 링크 검사 | `0 0 * * *` | `gemini-link-validator.yml` | **주의** |
| Tree 유지보수 | `0 0 * * 1` | `wiki-tree-maintainer.yml` | **주의** |
| Issue 분류 | - | `gemini-scheduled-triage.yml` | 워크플로우 전용 |
| CodeQL | - | `codeql.yml` | 워크플로우 전용 |

> GitHub Pages 모드에서는 워크플로우가, Kubernetes 모드에서는 스케줄러가 동일 작업 수행. 양쪽 동시 활성화 시 중복 실행에 주의.

## 부록 B: 주요 파일 참조

| 파일 | 경로 |
|------|------|
| Dockerfile | `docker/Dockerfile` |
| docker-compose.yml | `docker/docker-compose.yml` |
| docker-compose.dev.yml | `docker/docker-compose.dev.yml` |
| Helm values | `helm/sepilot-wiki/values.yaml` |
| Helm values (prod) | `helm/sepilot-wiki/values-prod.yaml` |
| Helm deployment | `helm/sepilot-wiki/templates/deployment.yaml` |
| Helm HPA | `helm/sepilot-wiki/templates/hpa.yaml` |
| Helm secret | `helm/sepilot-wiki/templates/secret.yaml` |
| Scheduler Manager | `lib/scheduler/scheduler-manager.ts` |
| Leader Election | `lib/scheduler/leader-election.ts` |
| BaseJob | `lib/scheduler/jobs/base-job.ts` |
| CollectStatus | `lib/scheduler/jobs/collect-status.ts` |
| SyncIssues | `lib/scheduler/jobs/sync-issues.ts` |
| ValidateLinks | `lib/scheduler/jobs/validate-links.ts` |
| MaintainTree | `lib/scheduler/jobs/maintain-tree.ts` |
| Scheduler Types | `lib/scheduler/types.ts` |
| Redis Client | `lib/redis.ts` |
| Health Check | `app/api/health/route.ts` |
| Webhook Route | `app/api/webhook/github/route.ts` |
| Webhook Handler | `lib/webhook/handler.ts` |
| Webhook Verifier | `lib/webhook/verifier.ts` |
| Retry Utility | `src/utils/retry.ts` |
| Env Validation | `lib/env-validation.ts` |
| .env.example | `.env.example` |
| CI | `.github/workflows/ci.yml` |
| Deploy Pages | `.github/workflows/deploy-pages.yml` |
| Docker Build | `.github/workflows/docker-build.yml` |
| Issue Handler | `.github/workflows/issue-handler.yml` |
| CodeQL | `.github/workflows/codeql.yml` |

## 부록 C: 포트 맵

| 서비스 | 컨테이너 포트 | K8s Service | Ingress |
|--------|-------------|-------------|---------|
| Wiki (Next.js) | 3000 | 80 -> 3000 | 443 -> 80 |
| Redis | 6379 | - | - |
| Keycloak | 8080 | - | - |

---

> **작성**: Claude Opus 4.6 (운영/DevOps 분석)
> **근거**: 소스코드 직접 분석 기반 (Docker 3파일, Helm 11파일, GitHub Actions 14워크플로우, 스케줄러 10파일, Webhook 3파일, 유틸리티 3파일)
> **분석 방법론**: DORA Metrics + 운영 성숙도 모델 (5단계) + CIS Kubernetes Benchmark + SRE 원칙
