import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { readFileSync } from 'fs';
import { join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// package.json에서 버전 정보 읽기
const packageJson = JSON.parse(
  readFileSync(join(__dirname, 'package.json'), 'utf-8')
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 빌드 모드에 따른 출력 설정
  // static: GitHub Pages용 정적 빌드 (프로덕션 빌드에서만 적용)
  // standalone: Kubernetes 배포용 서버 빌드
  // dev 서버에서는 output 설정을 적용하지 않음 (API 라우트, 동적 라우트 등 전체 기능 사용)
  ...(process.env.NODE_ENV === 'production' && {
    output: process.env.BUILD_MODE === 'static' ? 'export' : 'standalone',
  }),

  // Output 파일 추적 루트 설정 (멀티 lockfile 경고 해결)
  outputFileTracingRoot: __dirname,

  // Base path 설정 (GitHub Pages: /sepilot-wiki, 서버: /)
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',

  // 정적 빌드 시 이미지 최적화 비활성화
  images: {
    unoptimized: process.env.BUILD_MODE === 'static',
  },

  // 환경 변수 노출
  env: {
    AUTH_MODE: process.env.AUTH_MODE || 'public',
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },

  // TypeScript 설정
  typescript: {
    ignoreBuildErrors: false,
  },

  // 정적 빌드 시 trailing slash 추가 (GitHub Pages 호환성)
  trailingSlash: process.env.BUILD_MODE === 'static',

  // Turbopack 설정 (Next.js 16 기본 빌드 도구)
  turbopack: {},

  // Webpack 설정 (Mermaid, Plotly 등 클라이언트 전용 라이브러리)
  webpack: (config, { isServer }) => {
    if (isServer) {
      // 서버에서 클라이언트 전용 라이브러리 제외
      config.externals.push('mermaid', 'plotly.js');
    }
    return config;
  },
};

export default nextConfig;
