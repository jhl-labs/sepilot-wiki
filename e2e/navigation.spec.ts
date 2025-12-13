import { test, expect } from '@playwright/test';

/**
 * 네비게이션 E2E 테스트
 * 기본 페이지 탐색 및 라우팅 기능 검증
 */
test.describe('Navigation', () => {
  test('홈페이지가 올바르게 로드되어야 함', async ({ page }) => {
    await page.goto('/');

    // 헤더가 표시되어야 함
    await expect(page.locator('header')).toBeVisible();

    // 사이드바가 데스크톱에서 표시되어야 함
    const sidebar = page.locator('.sidebar');
    await expect(sidebar).toBeVisible();
  });

  test('위키 페이지로 이동할 수 있어야 함', async ({ page }) => {
    await page.goto('/');

    // 첫 번째 위키 링크 클릭
    const wikiLink = page.locator('a[href^="/wiki/"]').first();
    if (await wikiLink.isVisible()) {
      await wikiLink.click();

      // URL이 /wiki/로 시작해야 함
      await expect(page).toHaveURL(/\/wiki\//);

      // 마크다운 콘텐츠 영역이 표시되어야 함
      await expect(page.locator('.markdown-content')).toBeVisible();
    }
  });

  test('브레드크럼 네비게이션이 작동해야 함', async ({ page }) => {
    await page.goto('/wiki/index');

    // 브레드크럼이 표시되어야 함
    const breadcrumb = page.locator('nav[aria-label="Breadcrumb"]');
    await expect(breadcrumb).toBeVisible();

    // 홈 링크가 있어야 함
    const homeLink = breadcrumb.locator('a[href="/"]');
    await expect(homeLink).toBeVisible();
  });

  test('404 페이지가 올바르게 표시되어야 함', async ({ page }) => {
    await page.goto('/wiki/non-existent-page-12345');

    // 404 메시지가 표시되어야 함
    await expect(page.getByText(/찾을 수 없/)).toBeVisible();
  });
});
