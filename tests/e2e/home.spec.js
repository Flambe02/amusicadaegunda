import { test, expect } from '@playwright/test';
import { disableIntroOverlays, expectBrandTitle, normalizeText } from './helpers';

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await disableIntroOverlays(page);
  });

  test('should load the home page', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await expectBrandTitle(page);
  });

  test('should display the main header', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');
    await page.waitForTimeout(5000);
    await expectBrandTitle(page);

    const visibleHeaders = page.locator('h1:visible');
    const headerCount = await visibleHeaders.count();

    if (headerCount > 0) {
      const brandHeader = visibleHeaders.filter({ hasText: /musica|música/i }).first();
      if (await brandHeader.count()) {
        await expect(brandHeader).toBeVisible({ timeout: 10000 });
      } else {
        expect(normalizeText(await visibleHeaders.first().textContent()).length).toBeGreaterThan(10);
      }
      return;
    }

    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toBeTruthy();
    expect(normalizeText(bodyText)).toContain('musica');
  });
});
