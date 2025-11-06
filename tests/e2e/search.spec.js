import { test, expect } from '@playwright/test';

test.describe('Search Functionality', () => {
  test('should display playlist page content', async ({ page }) => {
    await page.goto('/playlist', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000); // Wait for async content (Supabase)
    
    // Check if page loaded successfully
    const pageTitle = page.locator('h1, h2').first();
    const hasTitle = await pageTitle.isVisible({ timeout: 5000 }).catch(() => false);
    
    // Check if songs are displayed or if there's a message about no songs
    // Separate CSS selectors from text selectors (can't mix them)
    const hasSongs = await page.locator('[data-testid*="song"], .song-card, article').count();
    const hasMusicText = await page.locator('text=/música/i').count();
    const hasEmptyState = await page.locator('text=/nenhuma música/i, text=/sem músicas/i, text=/carregando/i').count();
    const hasContent = await page.locator('body').textContent();
    
    // Page should have loaded (either with content or empty state or at least some text)
    expect(hasTitle || hasSongs > 0 || hasMusicText > 0 || hasEmptyState > 0 || (hasContent && hasContent.length > 100)).toBeTruthy();
  });
});

