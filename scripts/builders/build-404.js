#!/usr/bin/env node

/**
 * 404.html을 빌드 시점에 생성하는 스크립트
 * base path를 동적으로 설정하여 GitHub Pages SPA 라우팅 지원
 */

import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const OUTPUT_DIR = join(process.cwd(), 'dist');

// base path 결정 (vite.config.ts와 동일한 로직)
const getBasePath = () => {
  if (process.env.VITE_BASE_PATH) {
    return process.env.VITE_BASE_PATH.replace(/\/$/, ''); // 끝의 / 제거
  }
  if (process.env.NODE_ENV !== 'production') {
    return '';
  }
  return '/sepilot-wiki';
};

const basePath = getBasePath();

const html = `<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <title>SEPilot Wiki</title>
    <script>
      // GitHub Pages SPA 라우팅 지원
      // 404 페이지에서 실제 경로를 세션 스토리지에 저장하고 index.html로 리다이렉트
      const path = window.location.pathname;
      const search = window.location.search;
      const hash = window.location.hash;

      // base path 제거
      const basePath = '${basePath}';
      const redirectPath = basePath && path.startsWith(basePath)
        ? path.slice(basePath.length)
        : path;

      // 경로 정보를 세션 스토리지에 저장
      sessionStorage.setItem('spa-redirect', JSON.stringify({
        path: redirectPath || '/',
        search: search,
        hash: hash
      }));

      // index.html로 리다이렉트
      window.location.replace((basePath || '') + '/' + search + hash);
    </script>
  </head>
  <body>
    <noscript>
      <p>JavaScript가 필요합니다. 브라우저 설정에서 JavaScript를 활성화해주세요.</p>
    </noscript>
  </body>
</html>
`;

async function build404() {
  console.log('📄 404.html 생성 중...');
  console.log(`   base path: "${basePath || '(none)'}"`);

  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(join(OUTPUT_DIR, '404.html'), html);

  console.log('✅ 404.html 생성 완료');
}

build404().catch((err) => {
  console.error('❌ 404.html 생성 실패:', err);
  process.exit(1);
});
