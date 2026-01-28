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
  // static: GitHub Pages용 정적 빌드
  // standalone: Kubernetes 배포용 서버 빌드
  output: process.env.BUILD_MODE === 'static' ? 'export' : 'standalone',

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

  // TypeScript 및 ESLint 설정
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },

  // 번들 분석 및 최적화
  experimental: {
    // 대용량 라이브러리 트리 쉐이킹 최적화
    optimizePackageImports: [
      'lucide-react',
      '@tanstack/react-query',
      'react-syntax-highlighter',
    ],
    // 스케줄러 초기화를 위한 instrumentation 활성화
    instrumentationHook: process.env.BUILD_MODE === 'standalone',
  },

  // 정적 빌드 시 trailing slash 추가 (GitHub Pages 호환성)
  trailingSlash: process.env.BUILD_MODE === 'static',

  // Webpack 설정 (Mermaid, Plotly 등 클라이언트 전용 라이브러리)
  webpack: (config, { isServer }) => {
    if (isServer) {
      // 서버에서 클라이언트 전용 라이브러리 제외
      config.externals.push('mermaid', 'plotly.js');
    }
    return config;
  },

  // 보안 헤더 설정 (standalone 빌드에서만 적용)
  async headers() {
    // 정적 빌드에서는 헤더 설정 불필요 (웹 서버에서 설정)
    if (process.env.BUILD_MODE === 'static') {
      return [];
    }

    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
