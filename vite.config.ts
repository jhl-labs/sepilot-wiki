import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve } from 'path';

// GitHub Pages base path 설정
// - 로컬 개발 (npm run dev): '/'
// - GitHub.com Pages: '/repo-name/'
// - GHES: '/org/repo/' 또는 커스텀 경로
// 환경변수 VITE_BASE_PATH로 오버라이드 가능
const getBasePath = () => {
  // 명시적으로 설정된 경우 우선
  if (process.env.VITE_BASE_PATH) {
    return process.env.VITE_BASE_PATH;
  }
  // 개발 모드에서는 루트 경로 사용
  if (process.env.NODE_ENV !== 'production') {
    return '/';
  }
  // 프로덕션 빌드 시 GitHub Pages 경로
  return '/sepilot-wiki/';
};

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /wiki-meta\.json$/,
            handler: 'NetworkFirst',
            options: { cacheName: 'wiki-meta' },
          },
          {
            urlPattern: /wiki-pages\/.*\.json$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'wiki-pages',
              expiration: { maxEntries: 100, maxAgeSeconds: 86400 },
            },
          },
          {
            urlPattern: /data\/.*\.json$/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'data-files' },
          },
          {
            urlPattern: /\.(js|css)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-assets',
              expiration: { maxEntries: 50, maxAgeSeconds: 2592000 },
            },
          },
        ],
      },
      manifest: {
        name: 'SEPilot Wiki',
        short_name: 'SEPilot',
        description: 'AI 에이전트 기반 GitHub Wiki 자동화 시스템',
        theme_color: '#3b82f6',
        background_color: '#0f172a',
        display: 'standalone',
        icons: [
          { src: 'favicon.ico', sizes: '64x64', type: 'image/x-icon' },
        ],
      },
    }),
  ],
  base: getBasePath(),
  resolve: {
    alias: [
      // @/src/* → ./src/* (Next.js tsconfig 호환: @/* → [./src/*, ./*])
      { find: '@/src', replacement: resolve(__dirname, './src') },
      { find: '@', replacement: resolve(__dirname, './src') },
    ],
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          query: ['@tanstack/react-query'],
          markdown: ['react-markdown', 'react-syntax-highlighter'],
          mermaid: ['mermaid'],
          plotly: ['plotly.js', 'react-plotly.js'],
        },
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
