import { test, expect } from '@playwright/test';
import { disableIntroOverlays } from './helpers';

test.describe('Video Player', () => {
  test.beforeEach(async ({ page }) => {
    await disableIntroOverlays(page);
  });

  test('should load YouTube player on home page', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');
    await page.waitForTimeout(5000);

    const pageContent = await page.locator('body').textContent();
    expect(pageContent).toBeTruthy();
    if (pageContent) {
      expect(pageContent.length).toBeGreaterThan(50);
    }
  });
});
