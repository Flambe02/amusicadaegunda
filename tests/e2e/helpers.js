import { expect } from '@playwright/test';

export function normalizeText(value) {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export async function disableIntroOverlays(page) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('onboarding-v1-seen', '1');
      localStorage.setItem('ios-tutorial-seen', 'true');
      sessionStorage.setItem(`menu-seen-${new Date().toDateString()}`, '1');
    } catch {}
  });
}

export async function expectBrandTitle(page) {
  expect(normalizeText(await page.title())).toContain('musica da segunda');
}
