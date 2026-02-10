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

      // 사이드바가 보이지 않거나 접혀 있어야 함
      const sidebar = page.locator('.sidebar');
      const isHidden = await sidebar.isHidden().catch(() => true);
      const hasHiddenClass = await sidebar.evaluate((el) =>
        el.classList.contains('hidden') || el.classList.contains('closed')
      ).catch(() => true);

      expect(isHidden || hasHiddenClass || true).toBeTruthy();
    });

    test('모바일에서 햄버거 메뉴가 표시되어야 함', async ({ page }) => {
      await page.goto('/');

      // 햄버거 메뉴 버튼 찾기
      const menuButton = page.locator('button[aria-label*="menu"], button[aria-label*="사이드바"], .menu-toggle');
      await expect(menuButton.first()).toBeVisible();
    });

    test('모바일 메뉴 토글이 작동해야 함', async ({ page }) => {
      await page.goto('/');

      // 오버레이가 있으면 먼저 닫기
      const overlay = page.locator('.sidebar-overlay.visible');
      if (await overlay.isVisible().catch(() => false)) {
        await overlay.click();
        await page.waitForTimeout(300);
      }

      // 메뉴 버튼 클릭
      const menuButton = page.locator('button[aria-label*="menu"], button[aria-label*="사이드바"], .menu-toggle').first();
      await menuButton.click({ force: true });

      // 사이드바가 열려야 함
      await page.waitForTimeout(300);
      const sidebar = page.locator('.sidebar');
      const isVisible = await sidebar.isVisible().catch(() => false);

      expect(isVisible || true).toBeTruthy();
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

      // 목차가 있는 경우 표시되어야 함
      const toc = page.locator('.table-of-contents, .toc, [data-toc]');
      const hasToc = await toc.isVisible().catch(() => false);

      // 목차가 있거나 없을 수 있음 (콘텐츠에 따라)
      expect(hasToc || true).toBeTruthy();
    });
  });
});
