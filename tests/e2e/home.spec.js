import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should load the home page', async ({ page }) => {
    await page.goto('/');
    // Wait for React to hydrate
    await page.waitForSelector('#root', { state: 'attached' });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000); // Give React time to render
    await expect(page).toHaveTitle(/A Música da Segunda/i);
  });

  test('should display the main header', async ({ page }) => {
    await page.goto('/');
    // Wait for React to hydrate
    await page.waitForSelector('#root', { state: 'attached' });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000); // Give React time to render
    
    // Wait for h1 to appear - can be in loading state or loaded state
    const header = page.locator('h1').first();
    
    // Wait up to 10 seconds for header to appear (Supabase may be slow)
    await expect(header).toBeVisible({ timeout: 10000 });
    
    // Verify it contains the expected text
    await expect(header).toContainText(/Música da Segunda/i, { timeout: 5000 });
  });
});

