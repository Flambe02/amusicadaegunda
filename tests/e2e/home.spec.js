import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should load the home page', async ({ page }) => {
    await page.goto('/');
    // Wait for React to hydrate - wait for root element to have content
    await page.waitForSelector('#root', { state: 'attached' });
    // Wait for any content to appear
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000); // Give React time to render
    await expect(page).toHaveTitle(/A Música da Segunda/i);
  });

  test('should display the main header', async ({ page }) => {
    await page.goto('/');
    // Wait for React to hydrate
    await page.waitForSelector('#root', { state: 'attached' });
    await page.waitForLoadState('domcontentloaded');
    
    // Wait for h1 to appear - can be in loading state or loaded state
    // Try multiple strategies: desktop header, mobile header, or loading state
    const header = page.locator('h1').first();
    
    // Wait up to 15 seconds for header to appear (Supabase may be slow)
    await expect(header).toBeVisible({ timeout: 15000 });
    
    // Verify it contains the expected text
    await expect(header).toContainText(/Música da Segunda/i, { timeout: 5000 });
  });

  test('should navigate to sobre page', async ({ page }) => {
    await page.goto('/');
    // Wait for React to hydrate
    await page.waitForSelector('#root', { state: 'attached' });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000); // Give React time to render navigation
    
    // Wait for navigation to be ready - try both desktop and mobile nav
    const sobreLink = page.locator('text=Sobre, a:has-text("Sobre"), nav a:has-text("Sobre")').first();
    await expect(sobreLink).toBeVisible({ timeout: 15000 });
    
    await sobreLink.click();
    
    // Wait for navigation to complete
    await expect(page).toHaveURL(/.*sobre/, { timeout: 15000 });
    await page.waitForLoadState('networkidle');
  });
});

