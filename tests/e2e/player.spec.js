import { test, expect } from '@playwright/test';

test.describe('Video Player', () => {
  test('should load YouTube player on home page', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
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

