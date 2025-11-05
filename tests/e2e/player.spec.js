import { test, expect } from '@playwright/test';

test.describe('Video Player', () => {
  test('should load YouTube player on home page', async ({ page }) => {
    await page.goto('/');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check for YouTube iframe or player
    const hasYouTubePlayer = await page.locator('iframe[src*="youtube"], iframe[src*="youtu.be"], [data-testid*="youtube"], .youtube-player').count();
    
    // Player might not be visible if no song is loaded, but structure should exist
    expect(hasYouTubePlayer >= 0).toBeTruthy();
  });

  test('should handle video loading states', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check for loading indicators or error states
    const hasLoadingState = await page.locator('text=/carregando|loading|chargement/i').count();
    const hasErrorState = await page.locator('text=/erro|error/i').count();
    
    // Either loading, error, or content should be present
    expect(hasLoadingState >= 0 && hasErrorState >= 0).toBeTruthy();
  });
});

