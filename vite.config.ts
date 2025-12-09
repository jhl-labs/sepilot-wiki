import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// GitHub Pages base path 설정
// - GitHub.com: /repo-name/
// - GHES: /org/repo/ 또는 커스텀 경로
// 환경변수 VITE_BASE_PATH로 오버라이드 가능
const basePath = process.env.VITE_BASE_PATH || '/sepilot-wiki/';

export default defineConfig({
  plugins: [react()],
  base: basePath,
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
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
