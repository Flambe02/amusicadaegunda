import { test, expect } from '@playwright/test';

test.describe('TikTok Player E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Aller à la page de démo TikTok
    await page.goto('/tiktok/7467353900979424534');
  });

  test('devrait charger la page TikTok demo sans erreur', async ({ page }) => {
    // Vérifier que la page se charge
    await expect(page.locator('h1')).toContainText('TikTok Player Demo');
    
    // Vérifier que l'ID est affiché
    await expect(page.locator('code')).toContainText('7467353900979424534');
  });

  test('devrait afficher l\'overlay "Activer le son" initialement', async ({ page }) => {
    // Attendre que le composant se charge
    await page.waitForSelector('.tiktok-player-container');
    
    // Vérifier que l'overlay est visible
    await expect(page.locator('.unmute-button')).toBeVisible();
    await expect(page.locator('.unmute-button')).toContainText('Ativar Som');
  });

  test('devrait avoir une interface mobile-first responsive', async ({ page }) => {
    // Tester en mode mobile (iPhone 12)
    await page.setViewportSize({ width: 390, height: 844 });
    
    // Vérifier que le container s'adapte
    const container = page.locator('.tiktok-player-container');
    await expect(container).toBeVisible();
    
    // Vérifier les dimensions responsive
    const boundingBox = await container.boundingBox();
    expect(boundingBox.width).toBeLessThanOrEqual(390);
    expect(boundingBox.height).toBeGreaterThan(300);
  });

  test('devrait gérer l\'absence de scroll vertical en mode mobile', async ({ page }) => {
    // Tester en mode mobile
    await page.setViewportSize({ width: 390, height: 844 });
    
    // Vérifier que le body n'a pas de scroll vertical
    const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
    const viewportHeight = await page.evaluate(() => window.innerHeight);
    
    // Le body ne devrait pas dépasser la hauteur du viewport
    expect(bodyHeight).toBeLessThanOrEqual(viewportHeight + 100); // Tolérance de 100px
    
    // Vérifier que le container TikTok est bien visible
    const container = page.locator('.tiktok-player-container');
    await expect(container).toBeVisible();
    
    // Vérifier qu'il n'y a pas de scroll sur le container
    const containerScrollHeight = await container.evaluate(el => el.scrollHeight);
    const containerClientHeight = await container.evaluate(el => el.clientHeight);
    expect(containerScrollHeight).toBeLessThanOrEqual(containerClientHeight);
  });

  test('devrait activer le son et relancer la vidéo au clic sur l\'overlay', async ({ page }) => {
    // Attendre que le composant se charge
    await page.waitForSelector('.tiktok-player-container');
    
    // Vérifier que l'overlay est visible initialement
    const overlay = page.locator('.tiktok-player-overlay');
    await expect(overlay).toBeVisible();
    
    // Cliquer sur le bouton "Activer le son"
    const unmuteButton = page.locator('.unmute-button');
    await unmuteButton.click();
    
    // Attendre que l'overlay disparaisse
    await expect(overlay).not.toBeVisible();
    
    // Vérifier que le bouton plein écran est toujours visible
    await expect(page.locator('.fullscreen-button')).toBeVisible();
  });

  test('devrait gérer le bouton plein écran', async ({ page }) => {
    // Attendre que le composant se charge
    await page.waitForSelector('.tiktok-player-container');
    
    // Vérifier que le bouton plein écran est visible
    const fullscreenButton = page.locator('.fullscreen-button');
    await expect(fullscreenButton).toBeVisible();
    
    // Vérifier l'accessibilité du bouton
    await expect(fullscreenButton).toHaveAttribute('aria-label', 'Tela cheia');
    await expect(fullscreenButton).toHaveAttribute('aria-pressed', 'false');
    
    // Cliquer sur le bouton (note: le plein écran peut être bloqué en test)
    await fullscreenButton.click();
    
    // Vérifier que le bouton est toujours visible
    await expect(fullscreenButton).toBeVisible();
  });

  test('devrait valider les props et contrôles', async ({ page }) => {
    // Tester avec contrôles visibles
    await page.check('input[type="checkbox"]:first-child');
    
    // Tester avec autoplay désactivé
    await page.uncheck('input[type="checkbox"]:last-child');
    
    // Vérifier que les changements sont appliqués
    const controlsCheckbox = page.locator('input[type="checkbox"]:first-child');
    const autoplayCheckbox = page.locator('input[type="checkbox"]:last-child');
    
    await expect(controlsCheckbox).toBeChecked();
    await expect(autoplayCheckbox).not.toBeChecked();
  });

  test('devrait gérer la navigation et les routes dynamiques', async ({ page }) => {
    // Tester la navigation vers un autre ID
    const input = page.locator('input[placeholder*="7467353900979424534"]');
    await input.fill('1234567890123456789');
    
    const testButton = page.locator('button:has-text("Testar Vídeo")');
    await testButton.click();
    
    // Vérifier que l'URL change
    await expect(page).toHaveURL(/\/tiktok\/1234567890123456789/);
    
    // Vérifier que le nouvel ID est affiché
    await expect(page.locator('code')).toContainText('1234567890123456789');
  });

  test('devrait avoir une accessibilité complète', async ({ page }) => {
    // Vérifier les labels ARIA
    const unmuteButton = page.locator('.unmute-button');
    const fullscreenButton = page.locator('.fullscreen-button');
    
    await expect(unmuteButton).toHaveAttribute('aria-label', 'Ativar o som e reproduzir vídeo');
    await expect(unmuteButton).toHaveAttribute('aria-pressed', 'false');
    await expect(fullscreenButton).toHaveAttribute('aria-label', 'Tela cheia');
    
    // Vérifier les rôles
    await expect(unmuteButton).toHaveAttribute('role', 'button');
    await expect(fullscreenButton).toHaveAttribute('role', 'button');
    
    // Vérifier la navigation au clavier
    await page.keyboard.press('Tab');
    await expect(unmuteButton).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(fullscreenButton).toBeFocused();
  });

  test('devrait gérer les erreurs et fallbacks', async ({ page }) => {
    // Tester avec un ID invalide
    await page.goto('/tiktok/invalid-id');
    
    // Vérifier que le fallback s'affiche
    await expect(page.locator('.tiktok-player-fallback')).toBeVisible();
    await expect(page.locator('.fallback-content')).toContainText('Vídeo TikTok não disponível');
  });

  test('devrait être performant et optimisé', async ({ page }) => {
    // Mesurer le temps de chargement
    const startTime = Date.now();
    
    await page.waitForSelector('.tiktok-player-container');
    
    const loadTime = Date.now() - startTime;
    
    // Le chargement devrait être rapide (< 3 secondes)
    expect(loadTime).toBeLessThan(3000);
    
    // Vérifier que les ressources sont optimisées
    const resources = await page.evaluate(() => {
      return performance.getEntriesByType('resource')
        .filter(r => r.name.includes('tiktok'))
        .map(r => ({ name: r.name, duration: r.duration }));
    });
    
    // Les ressources TikTok devraient se charger rapidement
    resources.forEach(resource => {
      expect(resource.duration).toBeLessThan(2000);
    });
  });
});

test.describe('TikTok Player Mobile Experience', () => {
  test('devrait fonctionner parfaitement sur iPhone 12', async ({ page }) => {
    // Configuration iPhone 12
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => {
      // Simuler les APIs mobiles
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
      });
    });
    
    await page.goto('/tiktok/7467353900979424534');
    
    // Vérifier l'absence de scroll vertical
    const bodyScrollHeight = await page.evaluate(() => document.body.scrollHeight);
    const viewportHeight = await page.evaluate(() => window.innerHeight);
    
    expect(bodyScrollHeight).toBeLessThanOrEqual(viewportHeight + 50);
    
    // Vérifier que l'overlay est bien visible et accessible
    const overlay = page.locator('.tiktok-player-overlay');
    await expect(overlay).toBeVisible();
    
    // Vérifier la zone tactile minimale (48px)
    const unmuteButton = page.locator('.unmute-button');
    const buttonBox = await unmuteButton.boundingBox();
    
    expect(buttonBox.width).toBeGreaterThanOrEqual(48);
    expect(buttonBox.height).toBeGreaterThanOrEqual(48);
    
    // Tester le tap sur l'overlay
    await unmuteButton.click();
    
    // Vérifier que l'overlay disparaît
    await expect(overlay).not.toBeVisible();
  });
});
