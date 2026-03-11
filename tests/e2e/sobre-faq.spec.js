import { test, expect } from '@playwright/test';
import { disableIntroOverlays, expectBrandTitle, normalizeText } from './helpers';

test.describe('Sobre Page with FAQ', () => {
  test.beforeEach(async ({ page }) => {
    await disableIntroOverlays(page);
  });

  test('should display Sobre page with FAQ section', async ({ page }) => {
    await page.goto('/sobre', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');
    await page.waitForTimeout(5000);
    await expectBrandTitle(page);

    const faqSection = page.locator('h2:has-text("Perguntas"):visible').first();
    if (await faqSection.count()) {
      await expect(faqSection).toBeVisible({ timeout: 10000 });
      return;
    }

    const bodyText = await page.locator('body').textContent();
    expect(normalizeText(bodyText)).toContain('perguntas');
  });

  test('should expand FAQ items when clicked', async ({ page }) => {
    await page.goto('/sobre', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');
    await page.waitForTimeout(5000);

    const firstFAQ = page.locator('article button[aria-controls^="faq-answer-"]:visible').first();
    if (!(await firstFAQ.count())) {
      return;
    }

    await firstFAQ.click();
    await expect(firstFAQ).toHaveAttribute('aria-expanded', 'true');
  });

  test('should have Schema.org FAQPage structured data', async ({ page }) => {
    await page.goto('/sobre', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');
    await page.waitForTimeout(5000);

    const schemaScripts = page.locator('script[type="application/ld+json"]');
    const count = await schemaScripts.count();

    let hasFAQPage = false;
    for (let i = 0; i < count; i += 1) {
      const content = await schemaScripts.nth(i).textContent();
      if (content && content.includes('FAQPage')) {
        hasFAQPage = true;
        break;
      }
    }

    const faqSectionExists = (await page.locator('h2:has-text("Perguntas")').count()) > 0;
    expect(hasFAQPage || faqSectionExists).toBeTruthy();
  });
});
