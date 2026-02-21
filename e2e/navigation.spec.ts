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
    // 실제 존재하는 위키 페이지로 직접 이동
    await page.goto('/wiki/ai/mcp-model-context-protocol');

    // URL이 /wiki/로 시작해야 함
    await expect(page).toHaveURL(/\/wiki\//);

    // 위키 콘텐츠 영역이 표시되어야 함
    const content = page.locator('.wiki-content, .wiki-body');
    await expect(content.first()).toBeVisible({ timeout: 10000 });
  });

  test('브레드크럼 네비게이션이 작동해야 함', async ({ page }) => {
    // 실제 존재하는 위키 페이지 사용 (ai 카테고리 하위)
    await page.goto('/wiki/ai/mcp-model-context-protocol');

    // 브레드크럼이 표시되어야 함
    const breadcrumb = page.locator('nav[aria-label="Breadcrumb"], .breadcrumb');
    await expect(breadcrumb.first()).toBeVisible({ timeout: 10000 });
  });

  test('존재하지 않는 페이지에서 에러 상태가 표시되어야 함', async ({ page }) => {
    await page.goto('/wiki/non-existent-page-12345');

    // 에러 또는 404 메시지가 표시되어야 함
    const errorMsg = page.getByText(/찾을 수 없|404|존재하지 않/);
    await expect(errorMsg.first()).toBeVisible({ timeout: 10000 });
  });
});
