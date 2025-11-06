import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should navigate between main pages', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Navigate to Sobre
    await page.waitForSelector('text=Sobre', { timeout: 10000 });
    await page.click('text=Sobre');
    await expect(page).toHaveURL(/.*sobre/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    // Wait for h1 to appear on Sobre page
    const sobreHeader = page.locator('h1').first();
    await expect(sobreHeader).toBeVisible({ timeout: 10000 });
    await expect(sobreHeader).toContainText(/Sobre/i);
    
    // Navigate to Calendar
    await page.waitForSelector('text=Calendário', { timeout: 10000 });
    await page.click('text=Calendário');
    await expect(page).toHaveURL(/.*calendar/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    
    // Navigate to Playlist
    await page.waitForSelector('text=Playlist', { timeout: 10000 });
    await page.click('text=Playlist');
    await expect(page).toHaveURL(/.*playlist/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    
    // Navigate back to Home
    await page.waitForSelector('text=Início', { timeout: 10000 });
    await page.click('text=Início');
    await expect(page).toHaveURL(/\//, { timeout: 10000 });
  });

  test('should have accessible navigation links', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait for navigation to be rendered
    await page.waitForSelector('nav', { timeout: 10000 });
    const navLinks = page.locator('nav a');
    const count = await navLinks.count();
    
    expect(count).toBeGreaterThan(0);
    
    // Check that all links have accessible text
    for (let i = 0; i < count; i++) {
      const link = navLinks.nth(i);
      const text = await link.textContent();
      expect(text?.trim().length).toBeGreaterThan(0);
    }
  });
});

