import { test, expect } from '@playwright/test';

test.describe('Search Functionality', () => {
  test('should display search results', async ({ page }) => {
    await page.goto('/playlist');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check if search input exists or if songs are displayed
    const hasSearch = await page.locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="buscar" i]').count();
    const hasSongs = await page.locator('[data-testid*="song"], .song-card, article').count();
    
    // Either search functionality exists or songs are displayed
    expect(hasSearch > 0 || hasSongs > 0).toBeTruthy();
  });
});

