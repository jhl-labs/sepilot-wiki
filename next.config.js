import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
    // optimizePackageImports: ['lucide-react', '@tanstack/react-query'],
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
};

export default nextConfig;
