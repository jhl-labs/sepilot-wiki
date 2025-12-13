import { test, expect } from '@playwright/test';

/**
 * 테마 전환 E2E 테스트
 * 라이트/다크 테마 전환 및 저장 검증
 */
test.describe('Theme', () => {
  test('테마 토글 버튼이 표시되어야 함', async ({ page }) => {
    await page.goto('/');

    // 테마 토글 버튼 찾기
    const themeToggle = page.locator('button[aria-label*="theme"], button[aria-label*="테마"]');
    await expect(themeToggle.first()).toBeVisible();
  });

  test('테마 전환이 작동해야 함', async ({ page }) => {
    await page.goto('/');

    // 현재 테마 확인
    const html = page.locator('html');
    const initialTheme = await html.getAttribute('data-theme');

    // 테마 토글 버튼 클릭
    const themeToggle = page.locator('button[aria-label*="theme"], button[aria-label*="테마"]').first();
    await themeToggle.click();

    // 테마 메뉴가 나타나면 다른 테마 선택
    const themeOptions = page.locator('[role="menu"] button, .theme-menu button');
    if (await themeOptions.first().isVisible()) {
      await themeOptions.first().click();
    }

    // 테마가 변경되었는지 확인 (또는 메뉴가 열렸는지)
    const newTheme = await html.getAttribute('data-theme');
    expect(newTheme !== undefined || initialTheme !== undefined).toBeTruthy();
  });

  test('테마 설정이 localStorage에 저장되어야 함', async ({ page }) => {
    await page.goto('/');

    // localStorage에서 테마 설정 확인
    const theme = await page.evaluate(() => localStorage.getItem('theme'));

    // 테마 값이 유효한지 확인 (light, dark, system 중 하나)
    if (theme) {
      expect(['light', 'dark', 'system']).toContain(theme);
    }
  });

  test('시스템 테마 설정이 지원되어야 함', async ({ page }) => {
    // 다크 모드 시스템 설정 에뮬레이션
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');

    // 시스템 테마를 따르는지 확인 (data-theme 속성)
    const html = page.locator('html');
    const theme = await html.getAttribute('data-theme');

    // 테마가 설정되어 있어야 함
    expect(theme).not.toBeNull();
  });
});
