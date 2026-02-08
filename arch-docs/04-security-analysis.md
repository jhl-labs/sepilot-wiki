# SEPilot Wiki - 보안 관점 분석 문서

## 1. 문서 개요

| 항목 | 내용 |
|------|------|
| 프로젝트 | SEPilot Wiki |
| 분석 대상 버전 | v0.4.0 |
| 기술 스택 | React + TypeScript + Next.js + Bun |
| 분석 기준 | OWASP Top 10 (2021) |
| 분석 일자 | 2026-02-07 |

---

## 2. 프로젝트 보안 아키텍처 개요

### 2.1 인증/인가 아키텍처

```
[클라이언트] ---> [Next.js Middleware] ---> [NextAuth 5.0.0-beta.25]
                        |                           |
                   경로 보호 확인              [Keycloak OAuth]
                        |                           |
                  /issues, /admin,           JWT 토큰 발급
                  /ai-history, /edit         역할 정보 포함
                        |
              API 라우트는 미들웨어에서 제외
              (각 핸들러에서 개별 인증 확인)
```

- **AUTH_MODE 이중 모드**: `public` (GitHub Pages, 인증 없음) / `private` (Keycloak OAuth)
- **미들웨어 기반 경로 보호**: `middleware.ts`에서 보호 경로 패턴 정규식 매칭
- **역할 기반 접근 제어 (RBAC)**: `wiki-editor`, `wiki-admin` 역할 구분
- **세션 전략**: JWT 방식, 24시간 만료

### 2.2 보안 계층 구조

```
[CSP 헤더/메타 태그] ---- 1차: 브라우저 레벨 방어
         |
[rehype-sanitize]    ---- 2차: 마크다운 HTML 살균
         |
[DOMPurify]          ---- 3차: SVG/동적 콘텐츠 정제
         |
[입력 검증]           ---- 4차: validation.ts, env-validation.ts
         |
[인증/인가]           ---- 5차: NextAuth + Keycloak + Middleware
         |
[Webhook 서명 검증]   ---- 6차: HMAC-SHA256 + timingSafeEqual
         |
[컨테이너 보안]       ---- 7차: non-root, readOnlyRootFilesystem, seccomp
```

### 2.3 배포 모드별 보안 특성

| 보안 기능 | static (GitHub Pages) | standalone (Kubernetes) |
|-----------|----------------------|------------------------|
| 인증/인가 | 없음 (public 모드) | Keycloak OAuth (private 모드) |
| CSP 헤더 | index.html 메타 태그 | 미설정 (next.config.js에 CSP 부재) |
| 보안 헤더 | 메타 태그 일부 | next.config.js headers() |
| Webhook | 사용 불가 | HMAC-SHA256 서명 검증 |
| 컨테이너 보안 | N/A | non-root, readOnly, seccomp |
| HTTPS | GitHub 인프라 | Ingress TLS (cert-manager) |

---

## 3. OWASP Top 10 (2021) 대응 분석

### 3.1 A01:2021 - Broken Access Control (취약한 접근 제어)

| 항목 | 내용 |
|------|------|
| 심각도 | **High** |
| 현재 대응 수준 | 7/10 |

#### 현재 구현 상태

**구현된 보호 조치:**
- `middleware.ts`: `/issues`, `/ai-history`, `/admin`, `/edit` 경로에 대한 인증 확인
- `lib/auth.ts`: `hasRole()`, `canEdit()`, `isAdmin()` 유틸리티 함수로 역할 기반 접근 제어
- `AuthButton.tsx`: 클라이언트 사이드에서 역할 기반 UI 요소 조건부 렌더링
- Admin API 라우트(`/api/admin/*`): 각 핸들러에서 `checkAdminAuth()` 호출로 관리자 권한 확인
- Wiki PUT API (`/api/wiki/[...slug]`): `canEdit()` 함수로 편집 권한 확인

```typescript
// middleware.ts - 보호 경로 패턴
const protectedRoutes = [
  /^\/issues/,      // Issues 페이지
  /^\/ai-history/,  // AI 히스토리
  /^\/admin/,       // 관리자 페이지
  /^\/edit\//,      // 문서 편집
];
```

```typescript
// lib/auth.ts - 역할 확인
export function canEdit(session): boolean {
  return hasRole(session, 'wiki-editor') || hasRole(session, 'wiki-admin');
}

export function isAdmin(session): boolean {
  return hasRole(session, 'wiki-admin');
}
```

```typescript
// app/api/wiki/[...slug]/route.ts - API 레벨 인증
export async function PUT(request: NextRequest, { params }) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }
  if (!canEdit(session)) {
    return NextResponse.json({ error: '편집 권한이 없습니다.' }, { status: 403 });
  }
  // ...
}
```

#### 식별된 취약점

1. **PUBLIC 모드에서 Admin API 전체 노출**: `AUTH_MODE=public` 시 `checkAdminAuth()` 함수가 Anonymous 세션을 반환하여, `/api/admin/sync`, `/api/admin/tree`, `/api/admin/documents` 등 모든 관리자 API에 인증 없이 접근 가능.

```typescript
// app/api/admin/sync/route.ts - 위험: public 모드에서 관리자 인증 우회
async function checkAdminAuth() {
  if (process.env.AUTH_MODE === 'public') {
    return { session: { user: { name: 'Anonymous', email: 'anonymous@example.com' } } };
  }
  // ...
}
```

2. **미들웨어 matcher 범위 제한**: API 경로(`/api/*`)가 미들웨어 matcher에서 명시적으로 제외됨. 서버 사이드 API 보호는 각 핸들러의 개별 인증 로직에 전적으로 의존.

```typescript
// middleware.ts - API 경로 제외
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
```

3. **클라이언트 사이드 역할 검증 의존**: `AuthButton.tsx`의 역할 확인(`isEditor`, `isAdmin`)은 UI 가시성만 제어하며, 서버 API를 직접 호출하면 우회 가능. API 핸들러에서의 재검증이 핵심이나, 모든 핸들러가 일관되게 적용하고 있는지 보장하는 메커니즘 부재.

4. **미들웨어와 auth.ts의 보호 경로 중복 정의**: `middleware.ts`와 `lib/auth.ts`의 `authorized` 콜백에서 보호 경로를 각각 독립적으로 정의하여 불일치 가능성 존재. 예를 들어 middleware에서는 `/edit/` (trailing slash)를 요구하지만, auth.ts에서는 `/wiki/*/edit` 패턴을 사용.

#### 개선 권고사항

- [ ] API 라우트에 통합 인증 미들웨어 적용 (각 핸들러 개별 확인 대신)
- [ ] PUBLIC 모드에서도 Admin API는 별도 보호 (API 키 또는 IP 제한)
- [ ] 보호 경로 정의를 단일 소스로 통합 (DRY 원칙)
- [ ] 수직적 권한 상승 방지를 위한 서버 사이드 역할 재검증 강화

---

### 3.2 A02:2021 - Cryptographic Failures (암호화 실패)

| 항목 | 내용 |
|------|------|
| 심각도 | **Medium** |
| 현재 대응 수준 | 7/10 |

#### 현재 구현 상태

**구현된 보호 조치:**
- JWT 기반 세션 (NextAuth 기본 암호화)
- Webhook 서명 검증에 HMAC-SHA256 사용
- 타이밍 공격 방지를 위한 `crypto.timingSafeEqual()` 적용

```typescript
// lib/webhook/verifier.ts - 올바른 서명 검증
const expectedSignature = 'sha256=' +
  crypto.createHmac('sha256', secret).update(body).digest('hex');
return crypto.timingSafeEqual(
  Buffer.from(signature),
  Buffer.from(expectedSignature)
);
```

**환경변수 관리:**
- `.env` 파일이 `.gitignore`에 포함 (`.env`, `.env.local`, `.env.*.local`, `docker/.env` 모두 제외)
- `env-validation.ts`에서 서버 시작 시 필수 환경변수 검증
- `.env.example` 제공으로 안전한 설정 가이드 (실제 시크릿 값 미포함)

**Kubernetes 시크릿 관리:**
- Helm chart에서 `Secret` 리소스로 민감 정보 관리 (base64 인코딩)
- `externalSecrets` 옵션으로 기존 Secret 참조 가능
- 환경변수를 `secretKeyRef`로 주입

```yaml
# helm/templates/deployment.yaml
- name: KEYCLOAK_CLIENT_SECRET
  valueFrom:
    secretKeyRef:
      name: {{ include "sepilot-wiki.secretName" . }}
      key: {{ .Values.auth.keycloak.clientSecretKey }}
```

#### 식별된 취약점

1. **HTTPS 강제 미구현**: 애플리케이션 레벨에서 HTTPS 리다이렉션 미구현. `next.config.js` headers에 `Strict-Transport-Security` (HSTS) 헤더 부재. 프로덕션 Ingress에서 `ssl-redirect: "true"` 어노테이션은 있으나 애플리케이션 자체 보호 부재.

2. **NEXTAUTH_SECRET 환경변수 검증 누락**: `env-validation.ts`의 검증 항목에 `NEXTAUTH_SECRET`가 포함되지 않음. NextAuth는 JWT 암호화에 이 값을 사용하므로, 미설정 시 보안 취약.

3. **Keycloak 환경변수 Non-null assertion**: `lib/auth.ts`에서 `process.env.KEYCLOAK_CLIENT_ID!`와 같이 Non-null assertion 사용. `env-validation.ts`에서 검증하더라도, 검증 시점과 사용 시점이 분리되어 있어 런타임 에러 가능.

```typescript
// lib/auth.ts - Non-null assertion 사용
Keycloak({
  clientId: process.env.KEYCLOAK_CLIENT_ID!,    // 값이 없으면 undefined
  clientSecret: process.env.KEYCLOAK_CLIENT_SECRET!,
  issuer: process.env.KEYCLOAK_ISSUER!,
}),
```

4. **Redis 연결 암호화 미적용**: `lib/redis.ts`에서 TLS 옵션 없이 Redis 연결. 네트워크 상에서 평문 통신 가능.

```typescript
// lib/redis.ts - TLS 미설정
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  // tls 옵션 없음
};
```

#### 개선 권고사항

- [ ] `NEXTAUTH_SECRET`을 `env-validation.ts` 필수 검증 항목에 추가
- [ ] `next.config.js` headers에 HSTS 헤더 추가 (`Strict-Transport-Security: max-age=31536000; includeSubDomains`)
- [ ] Non-null assertion 대신 `env-validation.ts` 검증 후 안전한 접근 패턴 사용
- [ ] Redis TLS 연결 옵션 지원 (프로덕션 환경)

---

### 3.3 A03:2021 - Injection (인젝션)

| 항목 | 내용 |
|------|------|
| 심각도 | **High** |
| 현재 대응 수준 | 8/10 |

#### 현재 구현 상태

**XSS 방어 (다층 방어):**

1. **rehype-sanitize** (`MarkdownRenderer.tsx`): 마크다운을 HTML로 렌더링할 때 `rehypeRaw`를 거친 후 `rehypeSanitize`로 위험한 HTML 태그/속성 제거

```typescript
// src/components/wiki/MarkdownRenderer.tsx
<ReactMarkdown
  remarkPlugins={[remarkGfm]}
  rehypePlugins={[rehypeRaw, rehypeSanitize]}  // rehypeRaw 후 sanitize 적용
  // ...
>
```

2. **DOMPurify** (`MermaidDiagram.tsx`): Mermaid 렌더링 결과 SVG를 엄격한 화이트리스트로 정제

```typescript
// src/components/wiki/MermaidDiagram.tsx
const sanitizedSvg = DOMPurify.sanitize(svg, {
  USE_PROFILES: { svg: true, svgFilters: true },
  FORBID_TAGS: ['foreignObject', 'script', 'iframe', 'object', 'embed'],
  FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover', 'onfocus'],
});
```

3. **Mermaid strict 모드**: `securityLevel: 'strict'`로 Mermaid 자체 보안 강화

```typescript
mermaid.initialize({
  startOnLoad: false,
  theme: actualTheme === 'dark' ? 'dark' : 'default',
  securityLevel: 'strict',
});
```

4. **외부 링크 보안**: `rel="noopener noreferrer"` + `target="_blank"` 적용
5. **CSP 메타 태그**: `frame-ancestors 'none'` 설정으로 클릭재킹 방어

**정규식 인젝션 방지 (ReDoS 방어):**

```typescript
// src/utils/index.ts
export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
```

**입력 검증 (`validation.ts`):**
- 마크다운 콘텐츠: 최소 10자, 최대 100KB
- 제목: 2~100자, `<>:"/\|?*` 특수문자 차단
- 슬러그: 소문자/숫자/한글/하이픈만 허용, 연속 하이픈 차단

**OS Command Injection 방어 (`handler.ts`):**
- `spawn()` 함수에 사용자 입력을 직접 전달하지 않음
- 스크립트 이름은 하드코딩된 값만 사용 (`generate-document.js`, `mark-invalid.js` 등)
- Issue 번호만 환경변수로 전달 (문자열 변환된 정수)

```typescript
// lib/webhook/handler.ts - 안전한 스크립트 실행
const scriptPath = join(process.cwd(), 'scripts', 'issue', scriptName);
const child = spawn('node', [scriptPath], {
  env: { ...process.env, ISSUE_NUMBER: String(issueNumber) },
  // ...
});
```

#### 식별된 취약점

1. **CSP에 `unsafe-inline`과 `unsafe-eval` 허용**: `index.html`의 `script-src`에 `'unsafe-inline' 'unsafe-eval'`이 포함되어 XSS 공격 시 인라인 스크립트 실행 가능

```html
<!-- index.html - unsafe-inline, unsafe-eval 허용 -->
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.plot.ly;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
```

2. **Next.js standalone 모드에서 CSP 헤더 없음**: `next.config.js`의 `headers()` 함수에 `Content-Security-Policy` 헤더가 미설정. standalone 빌드로 배포 시 CSP 보호 없이 운영됨.

3. **API 에러 메시지 원본 노출**: 일부 API 핸들러에서 `error.message`를 클라이언트에 그대로 반환. 내부 시스템 정보(파일 경로, 스택 트레이스 등) 유출 가능.

```typescript
// app/api/admin/sync/route.ts
const errorMessage = error instanceof Error ? error.message : 'Git 상태를 확인할 수 없습니다.';
return NextResponse.json({ error: errorMessage }, { status: 500 });
```

4. **`dangerouslySetInnerHTML` 사용**: `MermaidDiagram.tsx`에서 DOMPurify 정제 후 사용하지만, DOMPurify 우회 취약점 발견 시 즉시 XSS에 노출

5. **에러 메시지의 DOMPurify 정제 후 innerHTML 삽입**: Mermaid 렌더링 에러 시 에러 메시지를 DOMPurify로 정제한 뒤 `<pre>` 태그에 삽입하지만, `dangerouslySetInnerHTML`을 통해 렌더링

```typescript
// MermaidDiagram.tsx - 에러 메시지도 innerHTML로 삽입
const sanitizedError = DOMPurify.sanitize(errorMessage);
setSvg(`<div>...<pre>${sanitizedError}</pre></div>`);
```

#### 개선 권고사항

- [ ] CSP에서 `unsafe-inline`/`unsafe-eval` 제거 후 nonce 기반 정책 적용
- [ ] `next.config.js` headers에 CSP 헤더 추가 (standalone 모드용)
- [ ] 에러 응답에서 내부 에러 메시지 대신 일반화된 메시지 반환
- [ ] Plotly 라이브러리 자체 호스팅으로 외부 CDN 의존성 제거

---

### 3.4 A04:2021 - Insecure Design (불안전한 설계)

| 항목 | 내용 |
|------|------|
| 심각도 | **Medium** |
| 현재 대응 수준 | 6/10 |

#### 현재 구현 상태

**보안 설계 요소:**
- JWT 세션 전략으로 서버 상태 비의존
- Webhook 서명 검증 필수화 (시크릿 없으면 Webhook 비활성화, 개발 환경에서도 우회 불가)
- Docker 컨테이너에서 non-root 사용자 실행 (`nextjs:nodejs`, UID 1001)
- Health check 엔드포인트에서 민감 정보 미노출 (`status`와 `timestamp`만 반환)
- 스케줄러 리더 선출로 분산 환경 충돌 방지 (Redis 기반)
- Webhook 처리 스크립트에 5분 타임아웃 + SIGTERM/SIGKILL 2단계 종료

```typescript
// lib/webhook/verifier.ts - 시크릿 없으면 무조건 거부
const secret = process.env.GITHUB_WEBHOOK_SECRET;
if (!secret) {
  console.error('[Webhook] GITHUB_WEBHOOK_SECRET 환경변수 미설정 - Webhook 비활성화');
  return false;
}
```

```typescript
// lib/webhook/handler.ts - 프로세스 타임아웃
timeoutId = setTimeout(() => {
  child.kill('SIGTERM');
  killTimeoutId = setTimeout(() => {
    if (!resolved) child.kill('SIGKILL');
  }, 10000);  // SIGTERM 후 10초 대기 후 SIGKILL
}, 5 * 60 * 1000);  // 5분 타임아웃
```

```typescript
// app/api/health/route.ts - 최소 정보만 노출
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
}
```

#### 식별된 취약점

1. **Rate Limiting 미구현**: 자체 API에 대한 서버사이드 속도 제한이 없음. `RATE_LIMITED` 에러 코드와 클라이언트 사이드 재시도 로직(`retry.ts`)만 존재하며, 실제 서버에서 요청 빈도를 제한하는 미들웨어는 구현되어 있지 않음.

```typescript
// src/types/index.ts - 타입만 정의됨
export type ApiErrorCode =
  | 'RATE_LIMITED'  // 타입은 있지만 실제 발생시키는 서버 로직 없음
  | ...;
```

2. **스케줄러 API 인증 취약**: `AUTH_MODE=public` 시 모든 인증을 우회하며, `SCHEDULER_API_KEY`가 없을 때도 인증 없이 접근 허용. 스케줄러 시작/중지 같은 민감한 작업이 보호되지 않음.

```typescript
// app/api/scheduler/route.ts - public 모드에서 인증 우회
async function checkAdminAuth(request: NextRequest): Promise<boolean> {
  if (process.env.AUTH_MODE === 'public') {
    return true;  // 모든 요청 허용
  }
  const apiKey = process.env.SCHEDULER_API_KEY;
  if (apiKey && authHeader === `Bearer ${apiKey}`) {
    return true;
  }
  return false;  // API 키 없으면 거부
}
```

3. **Webhook 비동기 처리의 에러 추적 부재**: `setImmediate()` 내부에서 발생하는 에러가 `console.error`로만 기록되고, 응답은 이미 200으로 반환된 상태. 실패한 이벤트에 대한 재처리 메커니즘 없음.

```typescript
// app/api/webhook/github/route.ts
setImmediate(async () => {
  try {
    // 이벤트 처리...
  } catch (error) {
    console.error(`[Webhook] 처리 오류:`, error);  // 에러 기록만 하고 재처리 없음
  }
});
return NextResponse.json({ received: true });  // 이미 200 반환
```

4. **위협 모델링 부재**: 공격 표면(GitHub API, Keycloak, Redis, Webhook 엔드포인트)에 대한 체계적 위협 분석 미수행

#### 개선 권고사항

- [ ] API 엔드포인트별 Rate Limiting 구현 (Redis 기반 또는 Next.js middleware)
- [ ] 스케줄러 API에 public 모드에서도 최소한의 인증 (API 키) 요구
- [ ] Webhook 실패 이벤트 재처리 메커니즘 (Dead Letter Queue 패턴)
- [ ] STRIDE 기반 위협 모델링 문서 작성

---

### 3.5 A05:2021 - Security Misconfiguration (보안 설정 오류)

| 항목 | 내용 |
|------|------|
| 심각도 | **Medium** |
| 현재 대응 수준 | 7/10 |

#### 현재 구현 상태

**보안 헤더 (standalone 모드 - `next.config.js`):**

| 헤더 | 값 | 파일 |
|------|----|------|
| X-Content-Type-Options | `nosniff` | `next.config.js` |
| X-Frame-Options | `SAMEORIGIN` | `next.config.js` |
| X-XSS-Protection | `1; mode=block` | `next.config.js` |
| Referrer-Policy | `strict-origin-when-cross-origin` | `next.config.js` |
| Permissions-Policy | `camera=(), microphone=(), geolocation=()` | `next.config.js` |

**보안 헤더 (static 모드 - `index.html` 메타 태그):**

| 헤더 | 값 |
|------|----|
| Content-Security-Policy | 상세 정책 (script/style/font/img/connect-src) |
| X-Frame-Options | `DENY` |
| X-Content-Type-Options | `nosniff` |
| Referrer | `strict-origin-when-cross-origin` |

**환경변수 검증 (`env-validation.ts`):**
- 서버 시작 시 필수/선택 환경변수 확인
- AUTH_MODE=private 시 Keycloak 관련 변수 필수 검증
- Webhook 시크릿 미설정 시 경고 출력

#### 식별된 취약점

1. **CSP 정책 불일치**: `index.html`(Vite 레거시)에는 상세 CSP 메타 태그가 있으나, `next.config.js`(Next.js standalone)에는 CSP 헤더가 **완전히 부재**. 프로덕션(standalone) 환경에서 CSP 보호 없이 운영됨.

2. **X-Frame-Options 불일치**: `index.html`은 `DENY`, `next.config.js`는 `SAMEORIGIN`. 배포 모드에 따라 클릭재킹 방어 수준이 다름.

3. **디버그 모드 노출 가능성**: NextAuth의 `debug: process.env.NODE_ENV === 'development'` 설정은 올바르나, 환경변수를 `development`로 잘못 설정할 경우 프로덕션에서 인증 디버그 정보 노출 가능.

4. **CORS 설정 부재**: 명시적 CORS 정책이 어디에도 설정되어 있지 않으며, Next.js 기본 동작(same-origin만 허용)에 의존. API가 외부에서 호출되는 시나리오에 대한 명시적 정책 필요.

5. **HSTS 헤더 부재**: `next.config.js` headers와 프로덕션 Ingress 어노테이션 모두에서 `Strict-Transport-Security` 헤더 미설정.

6. **Ingress 보안 어노테이션 부족**: 프로덕션 `values-prod.yaml`에 SSL 리다이렉트와 body-size 제한만 설정. WAF 규칙, 속도 제한 등 추가 보안 어노테이션 부재.

#### 개선 권고사항

- [ ] `next.config.js` headers에 CSP 헤더 추가 (standalone 모드용)
- [ ] X-Frame-Options 정책 통일 (`DENY` 권장)
- [ ] HSTS 헤더 추가 (`Strict-Transport-Security: max-age=31536000; includeSubDomains`)
- [ ] 명시적 CORS 설정 추가
- [ ] `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy` 헤더 추가
- [ ] Ingress에 rate-limiting 어노테이션 추가 (`nginx.ingress.kubernetes.io/limit-rps`)

---

### 3.6 A06:2021 - Vulnerable and Outdated Components (취약하고 오래된 컴포넌트)

| 항목 | 내용 |
|------|------|
| 심각도 | **Medium** |
| 현재 대응 수준 | 8/10 |

#### 현재 구현 상태

**자동화된 의존성 관리:**
- Dependabot 활성화: npm (주 1회, 월요일) + GitHub Actions 의존성 자동 업데이트
- PR 그룹핑: dev-dependencies, react 관련 패치/마이너 업데이트 그룹화
- PR 제한: 최대 10개 동시 오픈
- CodeQL 워크플로우: `security-extended,security-and-quality` 쿼리로 주간 + PR/push 시 코드 분석

```yaml
# .github/dependabot.yml
updates:
  - package-ecosystem: "npm"
    schedule:
      interval: "weekly"
      day: "monday"
    groups:
      dev-dependencies:
        patterns: ["@types/*", "@typescript-eslint/*", "eslint*", "vitest", ...]
        update-types: ["minor", "patch"]
```

```yaml
# .github/workflows/codeql.yml
queries: security-extended,security-and-quality
schedule:
  - cron: '0 6 * * 1'  # 매주 월요일
```

**빌드 무결성:**
- `bun install --frozen-lockfile`으로 의존성 무결성 보장 (Dockerfile)

#### 식별된 취약점

1. **NextAuth 5.0.0-beta.25 사용**: 베타 버전으로 안정성 및 보안 패치 일정이 불확실. 알려지지 않은 취약점이 존재할 수 있음.

2. **Dependabot major 버전 업데이트 미포함**: `update-types`에 `minor`, `patch`만 지정. 보안 취약점이 있는 major 버전 변경은 자동 업데이트되지 않아 수동 대응 필요.

3. **Docker 베이스 이미지 업데이트 정책 부재**: `oven/bun:1-alpine`, `node:20-alpine` 이미지의 보안 업데이트가 자동화되어 있지 않음. Alpine 기반 이미지의 CVE 패치를 추적하는 메커니즘 없음.

4. **Docker 이미지 취약점 스캔 미적용**: CI/CD 파이프라인에 Trivy, Snyk 등의 컨테이너 취약점 스캔 도구가 없음.

#### 개선 권고사항

- [ ] NextAuth stable 버전 출시 시 마이그레이션 계획 수립
- [ ] Dependabot에 `security-updates` 별도 활성화
- [ ] Docker 이미지 취약점 스캔 (Trivy 또는 Snyk) CI 파이프라인 추가
- [ ] `bun audit` 또는 `npm audit`를 CI에 통합
- [ ] Docker 이미지 태그 고정 (다이제스트 기반)

---

### 3.7 A07:2021 - Identification and Authentication Failures (식별 및 인증 실패)

| 항목 | 내용 |
|------|------|
| 심각도 | **High** |
| 현재 대응 수준 | 6/10 |

#### 현재 구현 상태

**인증 구현:**
- NextAuth 5 + Keycloak OAuth 프로바이더
- JWT 세션 전략 (24시간 만료)
- `authorized` 콜백으로 경로별 인증 확인
- 커스텀 로그인/에러 페이지 (`/auth/signin`, `/auth/error`)
- Keycloak realm_access + resource_access에서 역할 정보를 JWT 토큰으로 전파
- 서버/클라이언트 양쪽에서 역할 확인 가능

```typescript
// lib/auth.ts - JWT 세션 설정
session: {
  strategy: 'jwt',
  maxAge: 24 * 60 * 60, // 24시간
},

// JWT 콜백에서 Keycloak 역할 추출
jwt({ token, account, profile }) {
  if (account && profile) {
    token.roles = keycloakProfile.realm_access?.roles || [];
    token.clientRoles = keycloakProfile.resource_access?.[clientId]?.roles || [];
  }
  return token;
},
```

#### 식별된 취약점

1. **세션 무효화 메커니즘 부재**: JWT 특성상 토큰 발급 후 서버 사이드 무효화 불가. Keycloak에서 사용자 비활성화/로그아웃해도 24시간 동안 기존 JWT가 유효.

2. **Brute Force 방지 미구현**: 로그인 시도 횟수 제한이 애플리케이션 레벨에서 없음. Keycloak 자체 설정에 전적으로 의존.

3. **스케줄러 API 키 타이밍 공격 취약**: Bearer 토큰 검증이 단순 문자열 비교(`===`)로 구현되어 타이밍 사이드 채널 공격에 취약. 반면 Webhook 서명 검증에서는 `timingSafeEqual()`을 올바르게 사용하고 있어 불일치.

```typescript
// app/api/scheduler/route.ts - 타이밍 공격에 취약한 비교
if (apiKey && authHeader === `Bearer ${apiKey}`) {
  return true;
}
```

```typescript
// lib/webhook/verifier.ts - 올바른 상수 시간 비교 (대조적)
return crypto.timingSafeEqual(
  Buffer.from(signature),
  Buffer.from(expectedSignature)
);
```

4. **CSRF 토큰 미구현**: NextAuth는 자체적으로 CSRF 보호를 제공하지만, 커스텀 API 라우트(`/api/admin/*`, `/api/scheduler`, `/api/webhook/github`)에는 CSRF 토큰 검증이 없음. 단, Webhook 엔드포인트는 HMAC 서명으로 보호되므로 CSRF 위험이 낮음.

5. **Webhook GET 엔드포인트 정보 노출**: `/api/webhook/github`에 GET 요청 시 지원 이벤트 목록을 노출. 공격 표면 정보 제공.

```typescript
// app/api/webhook/github/route.ts
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'GitHub Webhook endpoint',
    supportedEvents: ['ping', 'issues', 'issue_comment'],  // 정보 노출
  });
}
```

#### 개선 권고사항

- [ ] 스케줄러 API 키 비교에 `crypto.timingSafeEqual()` 적용 (P0)
- [ ] JWT Refresh Token 로테이션 구현
- [ ] Keycloak Back-Channel Logout 연동
- [ ] 커스텀 API 엔드포인트에 CSRF 토큰 검증 추가
- [ ] Webhook GET 엔드포인트에서 지원 이벤트 목록 제거 또는 인증 요구

---

### 3.8 A08:2021 - Software and Data Integrity Failures (소프트웨어 및 데이터 무결성 실패)

| 항목 | 내용 |
|------|------|
| 심각도 | **Medium** |
| 현재 대응 수준 | 8/10 |

#### 현재 구현 상태

**Webhook 무결성 검증:**
- HMAC-SHA256 서명 검증 필수 (시크릿 미설정 시 Webhook 비활성화 -- 환경에 관계없이)
- `crypto.timingSafeEqual()`로 타이밍 공격 방지
- 이벤트 헤더 + JSON 파싱 유효성 확인
- 검증 실패 시 401 응답

```typescript
// lib/webhook/verifier.ts - 무결성 검증 흐름
// 1. 서명 헤더 존재 확인 (없으면 false)
// 2. GITHUB_WEBHOOK_SECRET 환경변수 확인 (없으면 false, 환경 무관)
// 3. HMAC-SHA256 서명 계산
// 4. timingSafeEqual로 상수 시간 비교
// 5. 이벤트 헤더 확인
// 6. JSON 파싱 유효성 확인
```

**CI/CD 무결성:**
- CodeQL 자동 분석 (push, PR, 주간 스케줄)
- `bun install --frozen-lockfile`으로 빌드 시 의존성 무결성 보장
- Multi-stage Docker 빌드로 빌드 도구가 런타임 이미지에 포함되지 않음

**문서 무결성:**
- GitHub API를 통한 문서 업데이트 시 SHA 기반 낙관적 잠금

```typescript
// app/api/wiki/[...slug]/route.ts - SHA 기반 파일 업데이트
const result = await octokit.repos.createOrUpdateFileContents({
  // ...
  sha: existingSha,  // 기존 파일의 SHA로 충돌 방지
});
```

#### 식별된 취약점

1. **외부 CDN 의존성**: CSP에서 `https://cdn.plot.ly` 허용. CDN 침해 시 악성 스크립트 로드 가능 (공급망 공격). SRI(Subresource Integrity) 미적용.

2. **GitHub Actions 태그 기반 참조**: SHA 고정 대신 `@v4`, `@v3` 태그 사용. 태그는 변경 가능하므로 공급망 공격에 취약.

```yaml
# .github/workflows/codeql.yml - SHA 고정 미사용
- uses: actions/checkout@v4
- uses: github/codeql-action/init@v3
- uses: github/codeql-action/autobuild@v3
- uses: github/codeql-action/analyze@v3
```

3. **Docker 이미지 태그 변동성**: `oven/bun:1-alpine`, `node:20-alpine` 태그는 시간에 따라 다른 이미지를 가리킬 수 있음. 다이제스트 고정 미사용.

#### 개선 권고사항

- [ ] GitHub Actions에서 SHA 고정 참조 사용 (예: `actions/checkout@a5ac7e5...`)
- [ ] Plotly 라이브러리 자체 호스팅 또는 SRI 적용
- [ ] Docker 빌드에서 이미지 다이제스트 고정 (예: `node:20-alpine@sha256:...`)

---

### 3.9 A09:2021 - Security Logging and Monitoring Failures (보안 로깅 및 모니터링 실패)

| 항목 | 내용 |
|------|------|
| 심각도 | **Medium** |
| 현재 대응 수준 | 5/10 |

#### 현재 구현 상태

**로깅 구현:**
- Webhook 이벤트 수신/처리/실패 로깅 (`[Webhook]` 네임스페이스)
- 스케줄러 실행/실패 로깅 (`[Scheduler API]` 네임스페이스)
- 환경변수 검증 결과 로깅 (`[ENV]` 네임스페이스)
- Redis 연결 상태 로깅 (`[Redis]` 네임스페이스)
- API 에러는 `console.error`로 기록

```typescript
// 일반적인 로깅 패턴
console.log(`[Webhook] 수신: ${validation.event}/${validation.action} (${validation.delivery})`);
console.error(`[Webhook] 검증 실패: ${validation.error}`);
console.error('[Webhook] 처리 오류:', error);
```

**실행 이력 저장:**
- Redis 기반 스케줄러 실행 이력 (7일 보관, 50건 제한)

#### 식별된 취약점

1. **구조화된 보안 로깅 부재**: 인증 실패, 권한 거부(403), 의심스러운 요청 등 보안 이벤트 전용 로깅이 없음. 미들웨어에서의 인증 리다이렉트가 로깅되지 않음.

2. **로그 중앙화 미구현**: `console.log/error`에만 의존. 컨테이너 환경에서 stdout/stderr로 출력되나, 로그 수집/분석/검색 인프라(ELK, Loki 등) 연동 미설정.

3. **감사 추적(Audit Trail) 미구현**: 문서 생성/수정/삭제, 관리자 작업, 설정 변경 등의 감사 로그가 없음. 누가, 언제, 어떤 문서를 수정했는지 추적 불가.

4. **알림 메커니즘 부재**: 보안 이벤트(반복적 인증 실패, Webhook 서명 검증 실패 등) 발생 시 관리자 알림 시스템 없음.

5. **Request ID 부재**: API 요청에 고유 ID가 할당되지 않아, 분산 환경에서 요청 추적이 불가능.

6. **Webhook delivery ID 활용 부족**: GitHub에서 제공하는 `x-github-delivery` 헤더를 로그에 출력하지만, 이를 기반으로 한 중복 처리 방지나 추적 체계 없음.

#### 개선 권고사항

- [ ] 보안 이벤트 전용 로거 구현 (인증 실패, 403, 서명 검증 실패 등)
- [ ] 구조화된 로그 포맷 적용 (JSON 형식, timestamp, request ID, 사용자 정보 포함)
- [ ] 관리자 작업 감사 로그 구현 (문서 CRUD, 설정 변경)
- [ ] 로그 중앙화 솔루션 연동 (ELK, Grafana Loki 등)
- [ ] 보안 이벤트 임계치 초과 시 알림 설정 (Slack, PagerDuty 등)

---

### 3.10 A10:2021 - Server-Side Request Forgery (SSRF)

| 항목 | 내용 |
|------|------|
| 심각도 | **Low** |
| 현재 대응 수준 | 7/10 |

#### 현재 구현 상태

- 외부 요청 대상이 GitHub API로 제한 (Octokit 라이브러리 사용)
- CSP `connect-src`에서 허용 도메인 명시: `'self' https://api.github.com https://raw.githubusercontent.com`
- 사용자 입력으로 직접 URL을 구성하는 패턴이 제한적 (슬러그 기반 파일 경로만)
- Wiki API에서 slug를 파일 경로로 변환 시 `wiki/` 접두사 고정

```typescript
// app/api/wiki/[...slug]/route.ts - 경로 고정
const path = `wiki/${slugPath}.md`;  // 항상 wiki/ 하위, .md 확장자
```

#### 식별된 취약점

1. **GHES 지원 시 URL 동적 구성**: `site.config.ts`에서 커스텀 `baseUrl`, `apiUrl`, `rawUrl` 설정 가능. 설정 오류 시 의도치 않은 내부 서비스 URL로 요청이 전달될 수 있음.

2. **이미지 URL 제한 없음**: 마크다운 내 `img` 태그의 `src` 검증이 CSP `img-src` 정책(`'self' data: https: blob:`)에만 의존. `https:` 전체를 허용하므로 내부 서비스 정보 유출 가능 (서버사이드 렌더링 시).

3. **Wiki slug에 Path Traversal 가능성**: `slug.join('/')`으로 경로를 구성하지만, `..` 같은 상위 디렉토리 탐색 문자에 대한 검증 없음. GitHub API가 이를 차단하겠지만 애플리케이션 레벨 검증 부재.

```typescript
// app/api/wiki/[...slug]/route.ts
const slugPath = slug.join('/');       // '../secret' 같은 입력 가능
const path = `wiki/${slugPath}.md`;    // wiki/../secret.md -> 의도치 않은 경로
```

#### 개선 권고사항

- [ ] 이미지 프록시 도입으로 외부 이미지 URL 직접 접근 차단
- [ ] GHES URL 설정값에 대한 화이트리스트 검증
- [ ] Wiki slug에 Path Traversal 문자 (`..`, `~`) 검증 추가

---

## 4. 컨테이너 및 Kubernetes 보안 분석

### 4.1 Docker 보안

**구현된 보호 조치:**

| 항목 | 상태 | 설명 |
|------|------|------|
| Multi-stage 빌드 | 구현됨 | deps -> builder -> runner 3단계, 빌드 도구 미포함 |
| Non-root 실행 | 구현됨 | `nextjs:nodejs` (UID/GID 1001) |
| 불필요한 파일 제거 | 구현됨 | standalone 출력만 복사 |
| Health Check | 구현됨 | `wget` 기반 30초 간격 |
| 텔레메트리 비활성화 | 구현됨 | `NEXT_TELEMETRY_DISABLED=1` |

```dockerfile
# docker/Dockerfile - 보안 설정
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1
```

**주의점:**
- Runner 스테이지에 `git` 패키지 설치 (`apk add --no-cache git`). 관리자 기능용이나 공격 표면 증가.

### 4.2 Kubernetes/Helm 보안

**Pod 보안 컨텍스트 (values.yaml):**

```yaml
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

| 설정 | 값 | 보안 효과 |
|------|-----|---------|
| `runAsNonRoot` | `true` | root 권한 실행 방지 |
| `runAsUser/Group` | `1001` | 전용 비특권 사용자 |
| `allowPrivilegeEscalation` | `false` | setuid/setgid 차단 |
| `capabilities.drop` | `ALL` | 모든 Linux Capability 제거 |
| `readOnlyRootFilesystem` | `true` | 파일시스템 변조 방지 |
| `seccompProfile` | `RuntimeDefault` | 시스템 콜 제한 |

**읽기 전용 파일시스템 대응:**
- `/tmp`와 `/app/.next/cache`에 `emptyDir` 볼륨 마운트로 쓰기 가능 영역 제공

```yaml
# helm/templates/deployment.yaml
volumeMounts:
  - name: tmp
    mountPath: /tmp
  - name: next-cache
    mountPath: /app/.next/cache
volumes:
  - name: tmp
    emptyDir: {}
  - name: next-cache
    emptyDir: {}
```

**시크릿 관리:**
- Kubernetes Secret 리소스로 민감 정보 관리
- `externalSecrets.enabled`로 외부 시크릿 매니저 연동 가능
- `secretKeyRef`로 환경변수에 시크릿 주입

**프로덕션 설정 (values-prod.yaml):**
- Ingress TLS 활성화 (cert-manager + Let's Encrypt)
- SSL 리다이렉트 어노테이션
- Pod Anti-Affinity (호스트 분산 배치)
- HPA 오토스케일링 (2~10 레플리카)

```yaml
# helm/values-prod.yaml
ingress:
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
  tls:
    - secretName: wiki-tls
```

### 4.3 컨테이너 보안 식별된 취약점

1. **NetworkPolicy 미정의**: Pod 간 네트워크 접근 제어 정책 없음. 동일 네임스페이스 내 모든 Pod가 서로 통신 가능.

2. **Resource Quota 미설정**: 네임스페이스 레벨 리소스 제한 없음. 단일 Deployment에 limits만 설정.

3. **PodDisruptionBudget 미설정**: 노드 유지보수 시 최소 가용 Pod 수 보장 없음.

4. **Runner 이미지에 git 패키지 포함**: 공격 표면 증가. 관리자 기능이 아닌 경우 불필요.

5. **Docker 이미지 다이제스트 미고정**: `oven/bun:1-alpine`, `node:20-alpine` 태그는 시간에 따라 변동.

---

## 5. 시크릿 및 환경변수 관리 분석

### 5.1 환경변수 보안 현황

**`.gitignore` 적용 범위:**
```
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
docker/.env
```

**`.env.example` 제공 항목:**

| 변수 | 용도 | 민감도 |
|------|------|--------|
| `BUILD_MODE` | 빌드 모드 | 낮음 |
| `AUTH_MODE` | 인증 모드 | 낮음 |
| `KEYCLOAK_CLIENT_ID` | OAuth 클라이언트 ID | 중간 |
| `KEYCLOAK_CLIENT_SECRET` | OAuth 시크릿 | **높음** |
| `KEYCLOAK_ISSUER` | Keycloak URL | 낮음 |
| `NEXTAUTH_URL` | 앱 URL | 낮음 |
| `NEXTAUTH_SECRET` | JWT 암호화 키 | **높음** |
| `GITHUB_TOKEN` | GitHub API 토큰 | **높음** |
| `GITHUB_REPO` | 저장소 정보 | 낮음 |
| `SCHEDULER_API_KEY` | 스케줄러 인증 | **높음** |
| `REDIS_URL` | Redis 연결 | 중간 |
| `REDIS_PASSWORD` | Redis 비밀번호 | **높음** |
| `GITHUB_WEBHOOK_SECRET` | Webhook 서명 키 | **높음** |

### 5.2 환경변수 검증 (`env-validation.ts`) 분석

**필수 검증 항목:**
- `GITHUB_REPO` (필수)

**조건부 필수:**
- `AUTH_MODE=private` 시: `KEYCLOAK_CLIENT_ID`, `KEYCLOAK_CLIENT_SECRET`, `KEYCLOAK_ISSUER`

**누락된 검증 항목 (취약점):**
- `NEXTAUTH_SECRET` -- JWT 암호화에 필수이나 검증 누락
- `NEXTAUTH_URL` -- CSRF 보호에 필요
- `SCHEDULER_API_KEY` -- `AUTH_MODE=private` 시 스케줄러 인증에 필수
- 환경변수 형식 검증 부재 (예: `GITHUB_REPO`의 `owner/repo` 형식 확인)

### 5.3 Kubernetes 시크릿 관리

**Helm Secret 리소스 구조:**

```yaml
# helm/templates/secret.yaml
type: Opaque
data:
  keycloak-client-secret: {{ .Values.auth.keycloak.clientSecret | b64enc }}
  nextauth-secret: {{ .Values.nextauth.secret | b64enc }}
  github-token: {{ .Values.github.token | b64enc }}
```

**주의점:**
- `values.yaml`에 시크릿 값을 직접 포함하면 Git에 노출. `--set` 플래그 또는 외부 시크릿 매니저 사용 필요.
- `externalSecrets.enabled: true`로 외부 시크릿 매니저(Vault, AWS Secrets Manager 등) 연동 가능하나 기본값은 `false`.

---

## 6. 보안 체크리스트

### 6.1 인증/인가

| # | 항목 | 상태 | 비고 |
|---|------|------|------|
| 1 | OAuth 프로바이더 연동 | 구현됨 | Keycloak OAuth |
| 2 | 역할 기반 접근 제어 (RBAC) | 구현됨 | wiki-editor, wiki-admin |
| 3 | JWT 세션 관리 | 구현됨 | 24시간 만료 |
| 4 | 미들웨어 경로 보호 | 구현됨 | 정규식 기반, 페이지 라우트만 |
| 5 | API 엔드포인트 인증 | 부분 구현 | 핸들러별 개별 확인, public 모드 우회 |
| 6 | CSRF 보호 | 부분 구현 | NextAuth 기본만, 커스텀 API 미적용 |
| 7 | 세션 무효화 | 미구현 | JWT 특성상 한계 |
| 8 | Rate Limiting | 미구현 | 타입 정의만 존재, 서버 미구현 |
| 9 | Brute Force 방지 | 미구현 | Keycloak 자체 설정에 의존 |

### 6.2 데이터 보호

| # | 항목 | 상태 | 비고 |
|---|------|------|------|
| 1 | 환경변수 관리 (.env) | 구현됨 | .gitignore 포함, .env.example 제공 |
| 2 | 환경변수 검증 | 부분 구현 | NEXTAUTH_SECRET 등 누락 |
| 3 | 민감 정보 미노출 | 구현됨 | Health API 최소 정보 |
| 4 | Webhook 서명 검증 | 구현됨 | HMAC-SHA256 + timingSafeEqual |
| 5 | K8s Secret 관리 | 구현됨 | secretKeyRef, externalSecrets 지원 |
| 6 | HTTPS 강제 | 부분 구현 | Ingress에서만, 애플리케이션 레벨 부재 |
| 7 | HSTS 헤더 | 미구현 | |
| 8 | Redis TLS | 미구현 | 평문 통신 |

### 6.3 입력/출력 보안

| # | 항목 | 상태 | 비고 |
|---|------|------|------|
| 1 | XSS 방어 (rehype-sanitize) | 구현됨 | 마크다운 HTML 살균 |
| 2 | XSS 방어 (DOMPurify) | 구현됨 | SVG 정제, 엄격한 화이트리스트 |
| 3 | XSS 방어 (Mermaid strict) | 구현됨 | securityLevel: 'strict' |
| 4 | CSP 헤더 | 부분 구현 | index.html만, Next.js 미적용 |
| 5 | CSP 정책 품질 | 취약 | unsafe-inline/eval 허용 |
| 6 | ReDoS 방지 | 구현됨 | escapeRegExp() |
| 7 | 입력 길이 제한 | 구현됨 | validation.ts (100KB) |
| 8 | 입력 형식 검증 | 구현됨 | 제목, 슬러그 특수문자 제한 |
| 9 | 에러 메시지 일반화 | 부분 구현 | 일부 핸들러에서 상세 에러 노출 |
| 10 | 외부 링크 보안 | 구현됨 | noopener noreferrer |
| 11 | Path Traversal 방지 | 미구현 | Wiki slug에 `..` 검증 없음 |

### 6.4 인프라 보안

| # | 항목 | 상태 | 비고 |
|---|------|------|------|
| 1 | Docker non-root 실행 | 구현됨 | nextjs:nodejs (UID 1001) |
| 2 | Multi-stage 빌드 | 구현됨 | 3단계, 최소 이미지 |
| 3 | readOnlyRootFilesystem | 구현됨 | emptyDir로 쓰기 영역 제공 |
| 4 | seccompProfile | 구현됨 | RuntimeDefault |
| 5 | Capability Drop ALL | 구현됨 | 모든 Linux Capability 제거 |
| 6 | allowPrivilegeEscalation | 구현됨 | false |
| 7 | Health Check | 구현됨 | /api/health, 30초 간격 |
| 8 | TLS Ingress | 구현됨 | cert-manager + Let's Encrypt |
| 9 | Pod Anti-Affinity | 구현됨 | 호스트 분산 (프로덕션) |
| 10 | Dependabot | 구현됨 | npm + actions, 주간 |
| 11 | CodeQL 분석 | 구현됨 | 주간 + PR/push |
| 12 | Docker 이미지 스캔 | 미구현 | Trivy/Snyk 없음 |
| 13 | NetworkPolicy | 미구현 | Pod 간 네트워크 제한 없음 |
| 14 | PodDisruptionBudget | 미구현 | |
| 15 | 의존성 감사 (audit) | 미구현 | CI에 미통합 |

### 6.5 보안 헤더

| # | 헤더 | standalone 모드 | static 모드 | 비고 |
|---|------|----------------|-------------|------|
| 1 | X-Content-Type-Options | `nosniff` | `nosniff` (메타) | 일치 |
| 2 | X-Frame-Options | `SAMEORIGIN` | `DENY` (메타) | **불일치** |
| 3 | X-XSS-Protection | `1; mode=block` | 없음 | 불일치 |
| 4 | Referrer-Policy | `strict-origin-when-cross-origin` | `strict-origin-when-cross-origin` (메타) | 일치 |
| 5 | Permissions-Policy | `camera=(), microphone=(), geolocation=()` | 없음 | 불일치 |
| 6 | Content-Security-Policy | **없음** | 상세 정책 (메타) | **standalone에서 부재** |
| 7 | Strict-Transport-Security | **없음** | N/A | 미구현 |
| 8 | Cross-Origin-Opener-Policy | **없음** | 없음 | 미구현 |
| 9 | Cross-Origin-Resource-Policy | **없음** | 없음 | 미구현 |

---

## 7. 종합 보안 성숙도 평가

### 7.1 OWASP Top 10 대응 점수 요약

| OWASP 항목 | 심각도 | 점수 | 평가 |
|------------|--------|------|------|
| A01: Broken Access Control | High | 7/10 | RBAC 구현, public 모드 Admin API 보호 미흡 |
| A02: Cryptographic Failures | Medium | 7/10 | 적절한 암호화, HTTPS/HSTS 미강제 |
| A03: Injection | High | 8/10 | 4중 XSS 방어, CSP unsafe 허용이 약점 |
| A04: Insecure Design | Medium | 6/10 | Rate Limiting 미구현, 위협 모델링 부재 |
| A05: Security Misconfiguration | Medium | 7/10 | 보안 헤더 구현, standalone CSP 부재 |
| A06: Vulnerable Components | Medium | 8/10 | Dependabot + CodeQL 활성화 |
| A07: Auth Failures | High | 6/10 | 타이밍 공격 취약, 세션 무효화 부재 |
| A08: Integrity Failures | Medium | 8/10 | Webhook 검증 우수, CI SHA 미고정 |
| A09: Logging Failures | Medium | 5/10 | 기본 로깅만, 보안 감사/알림 부재 |
| A10: SSRF | Low | 7/10 | 외부 요청 제한적, Path Traversal 미검증 |

### 7.2 종합 평가

**전체 보안 성숙도: 6.9 / 10 (양호)**

```
보안 성숙도 레이더 차트 (개념적)

         접근 제어 (7)
            /\
           /  \
  로깅(5) /    \ 암호화(7)
         |      |
  무결성(8)---- 인젝션(8)
         |      |
  인증(6) \    / 설정(7)
           \  /
            \/
       컴포넌트(8)
```

### 7.3 강점

1. **다층 XSS 방어**: rehype-sanitize + DOMPurify + Mermaid strict + CSP(static)의 4중 방어 체계. 각 계층이 독립적으로 작동하여 단일 실패점 없음.

2. **Webhook 서명 검증 품질**: HMAC-SHA256 + `timingSafeEqual()` + 시크릿 필수 정책. 환경에 관계없이 시크릿 없으면 Webhook 비활성화하는 보수적 접근.

3. **자동화된 보안 도구**: Dependabot(npm + actions) + CodeQL(`security-extended,security-and-quality`)로 의존성 및 코드 취약점 지속 감시.

4. **컨테이너 보안 기본기**: non-root 실행, multi-stage 빌드, readOnlyRootFilesystem, seccompProfile RuntimeDefault, capabilities drop ALL. Kubernetes 보안 모범 사례 다수 적용.

5. **입력 검증 체계**: 콘텐츠(10자~100KB), 제목(2~100자, 특수문자 제한), 슬러그(화이트리스트)에 대한 구조화된 검증 프레임워크. ReDoS 방지를 위한 정규식 이스케이프.

6. **안전한 외부 프로세스 실행**: Webhook 핸들러에서 spawn 시 하드코딩된 스크립트만 실행, 5분 타임아웃 + SIGTERM/SIGKILL 2단계 종료로 좀비 프로세스 방지.

### 7.4 주요 개선 필요 영역 (우선순위)

| 우선순위 | 영역 | 설명 | 예상 난이도 | 참조 |
|----------|------|------|-------------|------|
| **P0 (즉시)** | 스케줄러 API 키 비교 수정 | `===` 대신 `timingSafeEqual` 적용 | 낮음 | A07 |
| **P0 (즉시)** | CSP unsafe 제거 | `unsafe-inline`/`unsafe-eval`을 nonce 기반으로 전환 | 높음 | A03 |
| **P1 (단기)** | standalone CSP 헤더 추가 | `next.config.js` headers에 CSP 추가 | 중간 | A05 |
| **P1 (단기)** | Rate Limiting 구현 | API 엔드포인트별 속도 제한 (Redis 기반) | 중간 | A04 |
| **P1 (단기)** | Public 모드 Admin API 보호 | API 키 또는 IP 기반 제한 | 중간 | A01 |
| **P1 (단기)** | NEXTAUTH_SECRET 검증 추가 | env-validation.ts에 필수 항목 추가 | 낮음 | A02 |
| **P1 (단기)** | CSRF 토큰 적용 | 커스텀 API에 CSRF 보호 | 중간 | A07 |
| **P2 (중기)** | 보안 헤더 통일 | HSTS, COOP, CORP 추가, X-Frame-Options 통일 | 중간 | A05 |
| **P2 (중기)** | 보안 로깅 강화 | 인증 실패, 권한 거부 전용 구조화 로거 | 중간 | A09 |
| **P2 (중기)** | 감사 로그 구현 | 관리 작업/문서 변경 추적 | 높음 | A09 |
| **P2 (중기)** | Path Traversal 검증 | Wiki slug에 `..` 차단 | 낮음 | A10 |
| **P2 (중기)** | Docker 이미지 스캔 | Trivy CI 파이프라인 추가 | 낮음 | A06 |
| **P2 (중기)** | NetworkPolicy 추가 | Pod 간 네트워크 접근 제한 | 중간 | 인프라 |
| **P3 (장기)** | CI SHA 고정 | GitHub Actions에서 SHA 참조 | 낮음 | A08 |
| **P3 (장기)** | NextAuth stable 마이그레이션 | 베타 탈출 시 업그레이드 | 중간 | A06 |
| **P3 (장기)** | 위협 모델링 수행 | STRIDE 기반 체계적 분석 | 높음 | A04 |
| **P3 (장기)** | Back-Channel Logout 연동 | Keycloak 세션 무효화 | 높음 | A07 |

---

## 8. 부록

### 8.1 보안 관련 주요 파일 목록

| 파일 | 역할 | 보안 영역 |
|------|------|----------|
| `middleware.ts` | 경로 보호 미들웨어 | 접근 제어 |
| `lib/auth.ts` | NextAuth 설정, 역할 확인 유틸리티 | 인증/인가 |
| `lib/env-validation.ts` | 환경변수 검증 | 설정 관리 |
| `lib/webhook/verifier.ts` | Webhook HMAC-SHA256 서명 검증 | 데이터 무결성 |
| `lib/webhook/handler.ts` | Webhook 이벤트 처리, 스크립트 실행 | 프로세스 보안 |
| `lib/redis.ts` | Redis 연결 관리 | 데이터 보호 |
| `lib/errors.ts` | 통합 에러 처리 | 에러 관리 |
| `src/utils/validation.ts` | 콘텐츠/제목/슬러그 입력 검증 | 입력 검증 |
| `src/utils/index.ts` | escapeRegExp (ReDoS 방지) | 인젝션 방어 |
| `src/utils/retry.ts` | API 재시도 (429 Rate Limit 대응) | 가용성 |
| `src/components/wiki/MarkdownRenderer.tsx` | rehype-sanitize XSS 방어 | XSS 방어 |
| `src/components/wiki/MermaidDiagram.tsx` | DOMPurify SVG 정제 | XSS 방어 |
| `src/components/auth/AuthButton.tsx` | 역할 기반 UI 렌더링 | 접근 제어 (UI) |
| `next.config.js` | 보안 헤더 설정 | 보안 헤더 |
| `index.html` | CSP 메타 태그 (Vite 레거시) | 보안 헤더 |
| `docker/Dockerfile` | 컨테이너 보안 (non-root, multi-stage) | 인프라 보안 |
| `helm/sepilot-wiki/values.yaml` | K8s 보안 컨텍스트 | 인프라 보안 |
| `helm/sepilot-wiki/values-prod.yaml` | 프로덕션 보안 설정 (TLS, HPA) | 인프라 보안 |
| `helm/sepilot-wiki/templates/secret.yaml` | K8s Secret 리소스 | 시크릿 관리 |
| `helm/sepilot-wiki/templates/deployment.yaml` | 보안 컨텍스트, secretKeyRef | 인프라 보안 |
| `.github/workflows/codeql.yml` | 코드 보안 분석 | 취약점 탐지 |
| `.github/dependabot.yml` | 의존성 보안 업데이트 | 취약점 관리 |
| `.gitignore` | 민감 파일 제외 | 시크릿 보호 |
| `.env.example` | 환경변수 가이드 (시크릿 미포함) | 설정 가이드 |
| `app/api/webhook/github/route.ts` | Webhook 엔드포인트 | 데이터 무결성 |
| `app/api/admin/*/route.ts` | 관리자 API (인증 확인) | 접근 제어 |
| `app/api/scheduler/route.ts` | 스케줄러 API (API 키 인증) | 접근 제어 |
| `app/api/wiki/[...slug]/route.ts` | Wiki 문서 CRUD (편집 권한 확인) | 접근 제어 |
| `app/api/health/route.ts` | 헬스체크 (최소 정보 노출) | 정보 노출 방지 |

### 8.2 보안 의존성 목록

| 패키지 | 용도 | 보안 영역 |
|--------|------|----------|
| `next-auth` (5.0.0-beta.25) | OAuth 인증 | 인증 |
| `rehype-sanitize` | HTML 살균 | XSS 방어 |
| `dompurify` | DOM 정제 | XSS 방어 |
| `ioredis` | Redis 클라이언트 | 분산 락, 세션 |
| `@octokit/rest` | GitHub API | 외부 API |

### 8.3 보안 관련 환경변수 체크리스트

배포 전 확인 필수 항목:

- [ ] `NEXTAUTH_SECRET` 설정 (`openssl rand -base64 32`)
- [ ] `KEYCLOAK_CLIENT_SECRET` 설정 (AUTH_MODE=private)
- [ ] `GITHUB_WEBHOOK_SECRET` 설정 (`openssl rand -hex 20`)
- [ ] `SCHEDULER_API_KEY` 설정 (`openssl rand -base64 32`)
- [ ] `REDIS_PASSWORD` 설정 (프로덕션)
- [ ] `AUTH_MODE=private` 확인 (프로덕션)
- [ ] `NODE_ENV=production` 확인
- [ ] `NEXT_TELEMETRY_DISABLED=1` 확인
