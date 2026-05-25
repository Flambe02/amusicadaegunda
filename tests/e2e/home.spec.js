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
      const brandHeader = visibleHeaders.filter({ hasText: /musica|m�sica/i }).first();
      if (await brandHeader.count()) {
        await expect(brandHeader).toBeVisible({ timeout: 10000 });
      } else {
        // First visible h1 is the song title (mobile shell). Song titles can be
        // short (e.g. "6x1", "Gelo Gelo"), so we only assert non-empty content
        // rather than a fixed length threshold.
        const firstHeader = visibleHeaders.first();
        await expect(firstHeader).toBeVisible({ timeout: 10000 });
        const headerText = normalizeText(await firstHeader.textContent());
        expect(headerText.length).toBeGreaterThan(0);
      }
      return;
    }

    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toBeTruthy();
    expect(normalizeText(bodyText)).toContain('musica');
  });
});
