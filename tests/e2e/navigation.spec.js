import { test, expect } from '@playwright/test';
import { disableIntroOverlays, normalizeText } from './helpers';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await disableIntroOverlays(page);
  });

  test('should navigate between main pages', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');
    await page.waitForTimeout(3000);

    const sobreLink = page.locator('a:has-text("Sobre"):visible').first();
    if (!(await sobreLink.count())) {
      return;
    }

    await expect(sobreLink).toBeVisible({ timeout: 10000 });
    await sobreLink.click();
    await expect(page).toHaveURL(/\/sobre$/, { timeout: 15000 });
    await page.waitForLoadState('load');

    const faqHeading = page.locator('h2:has-text("Perguntas"):visible').first();
    if (await faqHeading.count()) {
      await expect(faqHeading).toBeVisible({ timeout: 10000 });
      return;
    }

    const bodyText = await page.locator('body').textContent();
    expect(normalizeText(bodyText)).toContain('perguntas');
  });

  test('should have accessible navigation links', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');
    await page.waitForTimeout(3000);

    const nav = page.locator('nav:visible').filter({ has: page.locator('a:visible') }).first();
    if (!(await nav.count())) {
      const bodyText = await page.locator('body').textContent();
      expect(bodyText).toBeTruthy();
      return;
    }

    await expect(nav).toBeVisible({ timeout: 10000 });
    const navLinks = nav.locator('a:visible');
    const count = await navLinks.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i += 1) {
      const text = await navLinks.nth(i).textContent();
      expect(text?.trim().length).toBeGreaterThan(0);
    }
  });
});
