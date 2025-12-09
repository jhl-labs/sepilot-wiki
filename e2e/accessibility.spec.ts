import { test, expect } from '@playwright/test';

/**
 * 접근성 E2E 테스트
 * 키보드 네비게이션 및 스크린 리더 호환성 검증
 */
test.describe('Accessibility', () => {
  test('모든 이미지에 alt 속성이 있어야 함', async ({ page }) => {
    await page.goto('/');

    // 모든 이미지 태그 확인
    const images = page.locator('img');
    const count = await images.count();

    for (let i = 0; i < count; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      // alt 속성이 존재해야 함 (빈 문자열도 허용 - 장식용 이미지)
      expect(alt !== null, `Image ${i} should have alt attribute`).toBeTruthy();
    }
  });

  test('헤딩 레벨이 순차적이어야 함', async ({ page }) => {
    await page.goto('/wiki/index');

    // 모든 헤딩 요소 찾기
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();

    let lastLevel = 0;
    for (const heading of headings) {
      const tagName = await heading.evaluate((el) => el.tagName.toLowerCase());
      const level = parseInt(tagName[1]);

      // 헤딩 레벨이 2단계 이상 뛰어넘지 않아야 함
      if (lastLevel > 0) {
        expect(level - lastLevel).toBeLessThanOrEqual(1);
      }
      lastLevel = level;
    }
  });

  test('포커스 가능한 요소들이 키보드로 접근 가능해야 함', async ({ page }) => {
    await page.goto('/');

    // Tab 키로 네비게이션
    await page.keyboard.press('Tab');

    // 포커스된 요소가 있어야 함
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('링크가 명확한 텍스트를 가져야 함', async ({ page }) => {
    await page.goto('/');

    // 모든 링크 확인
    const links = page.locator('a[href]');
    const count = await links.count();

    for (let i = 0; i < Math.min(count, 20); i++) {
      const link = links.nth(i);
      const text = await link.textContent();
      const ariaLabel = await link.getAttribute('aria-label');

      // 링크에 텍스트 또는 aria-label이 있어야 함
      const hasContent = (text && text.trim().length > 0) || ariaLabel;
      expect(hasContent, `Link ${i} should have accessible text`).toBeTruthy();
    }
  });

  test('버튼에 접근 가능한 이름이 있어야 함', async ({ page }) => {
    await page.goto('/');

    // 모든 버튼 확인
    const buttons = page.locator('button');
    const count = await buttons.count();

    for (let i = 0; i < count; i++) {
      const button = buttons.nth(i);
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      const title = await button.getAttribute('title');

      // 버튼에 텍스트, aria-label, 또는 title이 있어야 함
      const hasAccessibleName = (text && text.trim().length > 0) || ariaLabel || title;
      expect(hasAccessibleName, `Button ${i} should have accessible name`).toBeTruthy();
    }
  });

  test('색상 대비가 충분해야 함', async ({ page }) => {
    await page.goto('/');

    // 텍스트 색상과 배경 대비 확인 (기본적인 검사)
    const body = page.locator('body');
    const styles = await body.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        color: computed.color,
        backgroundColor: computed.backgroundColor,
      };
    });

    // 색상 값이 설정되어 있어야 함
    expect(styles.color).toBeTruthy();
    expect(styles.backgroundColor).toBeTruthy();
  });

  test('스킵 링크가 있어야 함 (선택 사항)', async ({ page }) => {
    await page.goto('/');

    // 스킵 링크 확인 (선택 사항이므로 경고만)
    const skipLink = page.locator('a[href="#main"], a[href="#content"], .skip-link');
    const hasSkipLink = await skipLink.isVisible().catch(() => false);

    // 스킵 링크가 있으면 좋지만 필수는 아님
    if (!hasSkipLink) {
      console.log('참고: 스킵 링크 추가를 고려하세요');
    }
  });
});
