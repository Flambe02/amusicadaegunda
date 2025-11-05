import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should load the home page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/A Música da Segunda/i);
  });

  test('should display the main header', async ({ page }) => {
    await page.goto('/');
    const header = page.locator('h1').first();
    await expect(header).toBeVisible();
  });

  test('should navigate to sobre page', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Sobre');
    await expect(page).toHaveURL(/.*sobre/);
  });

  test('should navigate to FAQ page', async ({ page }) => {
    await page.goto('/');
    await page.click('text=FAQ');
    await expect(page).toHaveURL(/.*faq/);
  });
});

