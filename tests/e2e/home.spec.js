import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should load the home page', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(page).toHaveTitle(/A Música da Segunda/i);
  });

  test('should display the main header', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    // Wait for any h1 to appear (desktop header in Layout or mobile header in Home)
    const header = page.locator('h1').first();
    
    // Wait up to 20 seconds for header to appear (Supabase may be slow)
    await expect(header).toBeVisible({ timeout: 20000 });
    
    // Verify it contains the expected text
    await expect(header).toContainText(/Música da Segunda/i, { timeout: 5000 });
  });
});

