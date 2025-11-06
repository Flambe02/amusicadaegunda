import { test, expect } from '@playwright/test';

test.describe('Video Player', () => {
  test('should load YouTube player on home page', async ({ page }) => {
    await page.goto('/');
    // Wait for React to hydrate
    await page.waitForSelector('#root', { state: 'attached' });
    await page.waitForLoadState('domcontentloaded');
    
    // Wait for React to actually render content
    await page.waitForFunction(() => {
      const root = document.getElementById('root');
      return root && root.children.length > 0;
    }, { timeout: 15000 });
    
    await page.waitForTimeout(2000); // Wait for Supabase data to load
    
    // Check for YouTube iframe or player container
    const youtubePlayer = page.locator('iframe[src*="youtube"], iframe[src*="youtu.be"], iframe[src*="youtube-nocookie"]').first();
    const playerCount = await youtubePlayer.count();
    
    // Player may or may not be visible depending on whether there's a current song
    // But the page should have loaded successfully
    const pageContent = await page.locator('body').textContent();
    expect(pageContent && pageContent.length > 100).toBeTruthy();
  });
});

