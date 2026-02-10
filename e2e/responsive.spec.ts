import { test, expect } from '@playwright/test';

/**
 * 반응형 디자인 E2E 테스트
 * 다양한 뷰포트에서의 레이아웃 검증
 */
test.describe('Responsive Design', () => {
  test.describe('모바일 뷰포트', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('모바일에서 사이드바가 기본적으로 숨겨져야 함', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // 사이드바가 열려있지 않아야 함 (open 클래스가 없어야 함)
      const sidebar = page.locator('.sidebar');
      const hasOpenClass = await sidebar.evaluate((el) =>
        el.classList.contains('open')
      ).catch(() => false);

      expect(hasOpenClass).toBe(false);
    });

    test('모바일에서 햄버거 메뉴가 표시되어야 함', async ({ page }) => {
      await page.goto('/');

      // 햄버거 메뉴 버튼 찾기
      const menuButton = page.locator('button[aria-label*="menu"], button[aria-label*="사이드바"], .menu-toggle');
      await expect(menuButton.first()).toBeVisible();
    });

    test('모바일 메뉴 토글이 작동해야 함', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // 메뉴 버튼 클릭
      const menuButton = page.locator('button[aria-label*="menu"], button[aria-label*="사이드바"], .menu-toggle').first();
      await menuButton.click({ force: true });

      // 사이드바가 open 클래스를 가져야 함
      const sidebar = page.locator('.sidebar');
      await expect(sidebar).toHaveClass(/open/, { timeout: 1000 });

      // 오버레이도 visible이어야 함
      const overlay = page.locator('.sidebar-overlay');
      await expect(overlay).toHaveClass(/visible/, { timeout: 1000 });
    });
  });

  test.describe('태블릿 뷰포트', () => {
    test.use({ viewport: { width: 768, height: 1024 } });

    test('태블릿에서 레이아웃이 적절히 조정되어야 함', async ({ page }) => {
      await page.goto('/');

      // 메인 콘텐츠가 표시되어야 함
      const mainContent = page.locator('main, .main-content');
      await expect(mainContent.first()).toBeVisible();
    });
  });

  test.describe('데스크톱 뷰포트', () => {
    test.use({ viewport: { width: 1440, height: 900 } });

    test('데스크톱에서 사이드바가 표시되어야 함', async ({ page }) => {
      await page.goto('/');

      // 사이드바가 보여야 함
      const sidebar = page.locator('.sidebar');
      await expect(sidebar).toBeVisible();
    });

    test('데스크톱에서 검색창이 헤더에 표시되어야 함', async ({ page }) => {
      await page.goto('/');

      // 헤더의 검색창 확인
      const headerSearch = page.locator('header input[type="search"], header input[placeholder*="검색"]');
      await expect(headerSearch.first()).toBeVisible();
    });

    test('TOC(목차)가 넓은 화면에서 표시되어야 함', async ({ page }) => {
      await page.goto('/wiki/index');

      // 목차가 있는 경우 표시되어야 함 (콘텐츠에 따라 없을 수도 있음)
      const toc = page.locator('.table-of-contents, .toc, [data-toc]');
      const tocCount = await toc.count();

      if (tocCount > 0) {
        await expect(toc.first()).toBeVisible();
      }
    });
  });
});
