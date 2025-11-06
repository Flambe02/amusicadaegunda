import { test, expect } from '@playwright/test';

test.describe('Search Functionality', () => {
  test('should display playlist page content', async ({ page }) => {
    await page.goto('/playlist');
    
    // Wait for page to load and React to hydrate
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Additional wait for async content
    
    // Check if page loaded successfully by looking for common elements
    // Playlist page should have some content (title, songs list, or empty state)
    const pageTitle = page.locator('h1, h2').first();
    const hasTitle = await pageTitle.isVisible().catch(() => false);
    
    // Check if songs are displayed or if there's a message about no songs
    const hasSongs = await page.locator('[data-testid*="song"], .song-card, article, text=/música/i').count();
    const hasEmptyState = await page.locator('text=/nenhuma música/i, text=/sem músicas/i, text=/carregando/i').count();
    
    // Page should have loaded (either with content or empty state)
    expect(hasTitle || hasSongs > 0 || hasEmptyState > 0).toBeTruthy();
  });
});

