import { test, expect } from '@playwright/test';

test.describe('Sobre Page with FAQ', () => {
  test('should display Sobre page with FAQ section', async ({ page }) => {
    await page.goto('/sobre');
    
    // Check main title
    await expect(page.locator('h1')).toContainText(/Sobre/i);
    
    // Check FAQ section exists
    const faqSection = page.locator('text=Perguntas Frequentes');
    await expect(faqSection).toBeVisible();
  });

  test('should expand FAQ items when clicked', async ({ page }) => {
    await page.goto('/sobre');
    
    // Find first FAQ question
    const firstFAQ = page.locator('button:has-text("O que é")').first();
    
    if (await firstFAQ.count() > 0) {
      // Click to expand
      await firstFAQ.click();
      
      // Check if answer is visible
      await expect(page.locator('text=/paródias musicais/i').first()).toBeVisible();
    }
  });

  test('should have Schema.org FAQPage structured data', async ({ page }) => {
    await page.goto('/sobre');
    
    // Check for FAQPage schema
    const schemaScript = page.locator('script[type="application/ld+json"]');
    const count = await schemaScript.count();
    
    expect(count).toBeGreaterThan(0);
    
    // Check content contains FAQPage
    const pageContent = await page.content();
    expect(pageContent).toContain('FAQPage');
  });
});

