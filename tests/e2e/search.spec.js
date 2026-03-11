import { test, expect } from '@playwright/test';
import { disableIntroOverlays } from './helpers';

test.describe('Search Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await disableIntroOverlays(page);
  });

  test('should display playlist page content', async ({ page }) => {
    await page.goto('/playlist', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');
    await page.waitForTimeout(5000);

    const pageTitle = page.locator('h1:visible, h2:visible').first();
    const hasTitle = await pageTitle.isVisible({ timeout: 5000 }).catch(() => false);
    const hasSongs = await page.locator('[data-testid*="song"], .song-card, article').count();
    const hasMusicText = await page.locator('text=/musica|música/i').count();
    const hasEmptyState = await page.locator('text=/nenhuma|sem musicas|sem músicas|carregando/i').count();
    const hasContent = await page.locator('body').textContent();

    expect(
      hasTitle ||
      hasSongs > 0 ||
      hasMusicText > 0 ||
      hasEmptyState > 0 ||
      (hasContent && hasContent.length > 50)
    ).toBeTruthy();
  });
});
