import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
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
  plugins: [react()],
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
        },
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
