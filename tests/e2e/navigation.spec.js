import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should navigate between main pages', async ({ page }) => {
    await page.goto('/');
    // Wait for React to hydrate
    await page.waitForSelector('#root', { state: 'attached' });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000); // Give React time to render
    
    // Navigate to Sobre - try multiple selectors
    const sobreLink = page.locator('text=Sobre, a:has-text("Sobre"), nav a:has-text("Sobre")').first();
    await expect(sobreLink).toBeVisible({ timeout: 15000 });
    await sobreLink.click();
    await expect(page).toHaveURL(/.*sobre/, { timeout: 15000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // Wait for h1 to appear on Sobre page
    const sobreHeader = page.locator('h1').first();
    await expect(sobreHeader).toBeVisible({ timeout: 15000 });
    await expect(sobreHeader).toContainText(/Sobre/i, { timeout: 5000 });
    
    // Navigate to Calendar
    const calendarLink = page.locator('text=Calendário, a:has-text("Calendário"), nav a:has-text("Calendário")').first();
    await expect(calendarLink).toBeVisible({ timeout: 15000 });
    await calendarLink.click();
    await expect(page).toHaveURL(/.*calendar/, { timeout: 15000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // Navigate to Playlist
    const playlistLink = page.locator('text=Playlist, a:has-text("Playlist"), nav a:has-text("Playlist")').first();
    await expect(playlistLink).toBeVisible({ timeout: 15000 });
    await playlistLink.click();
    await expect(page).toHaveURL(/.*playlist/, { timeout: 15000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // Navigate back to Home
    const inicioLink = page.locator('text=Início, a:has-text("Início"), nav a:has-text("Início")').first();
    await expect(inicioLink).toBeVisible({ timeout: 15000 });
    await inicioLink.click();
    await expect(page).toHaveURL(/\//, { timeout: 15000 });
  });

  test('should have accessible navigation links', async ({ page }) => {
    await page.goto('/');
    // Wait for React to hydrate
    await page.waitForSelector('#root', { state: 'attached' });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // Wait for navigation to be rendered - try both desktop and mobile nav
    await page.waitForSelector('nav, [role="navigation"]', { timeout: 15000 });
    const navLinks = page.locator('nav a, [role="navigation"] a');
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

