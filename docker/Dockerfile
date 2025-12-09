# SEPilot Wiki - Multi-stage Dockerfile
# Next.js standalone 빌드를 위한 최적화된 Docker 이미지

# ===================================
# Stage 1: Dependencies
# ===================================
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# 패키지 파일 복사
COPY package.json package-lock.json* ./

# 의존성 설치
RUN npm ci --legacy-peer-deps

# ===================================
# Stage 2: Builder
# ===================================
FROM node:20-alpine AS builder
WORKDIR /app

# 의존성 복사
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 환경 변수 설정
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV BUILD_MODE=standalone
ENV AUTH_MODE=private

# Wiki 데이터 및 검색 인덱스 빌드
RUN npm run build:wiki && npm run build:search

# Next.js 빌드
RUN npm run build

# ===================================
# Stage 3: Runner
# ===================================
FROM node:20-alpine AS runner
WORKDIR /app

# 보안: non-root 사용자 설정
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 환경 변수 설정
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 필요한 파일들만 복사
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# Next.js standalone 출력 복사
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 사용자 전환
USER nextjs

# 포트 노출
EXPOSE 3000

# 헬스체크
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# 서버 실행
CMD ["node", "server.js"]
