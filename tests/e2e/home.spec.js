import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should load the home page', async ({ page }) => {
    await page.goto('/');
    // Wait for React to hydrate
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveTitle(/A Música da Segunda/i);
  });

  test('should display the main header', async ({ page }) => {
    await page.goto('/');
    // Wait for React to hydrate and content to load
    await page.waitForLoadState('networkidle');
    // Wait for h1 to appear (can be in desktop or mobile header)
    const header = page.locator('h1').first();
    await expect(header).toBeVisible({ timeout: 10000 });
    // Verify it contains the expected text
    await expect(header).toContainText(/Música da Segunda/i);
  });

  test('should navigate to sobre page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // Wait for navigation to be ready
    await page.waitForSelector('text=Sobre', { timeout: 10000 });
    await page.click('text=Sobre');
    await expect(page).toHaveURL(/.*sobre/, { timeout: 10000 });
  });
});

