import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should navigate between main pages', async ({ page }) => {
    await page.goto('/');
    
    // Navigate to Sobre
    await page.click('text=Sobre');
    await expect(page).toHaveURL(/.*sobre/);
    await expect(page.locator('h1')).toContainText(/Sobre/i);
    
    // Navigate to Calendar
    await page.click('text=Calendário');
    await expect(page).toHaveURL(/.*calendar/);
    
    // Navigate to Playlist
    await page.click('text=Playlist');
    await expect(page).toHaveURL(/.*playlist/);
    
    // Navigate back to Home
    await page.click('text=Início');
    await expect(page).toHaveURL(/\//);
  });

  test('should have accessible navigation links', async ({ page }) => {
    await page.goto('/');
    
    const navLinks = page.locator('nav a, nav button');
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

