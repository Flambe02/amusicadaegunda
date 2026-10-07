/**
 * Après `cap copy` / `cap sync` : retire des apps natives les animations de la mascotte
 * « à la demande » (public/mascot/). Elles restent sur le site ; l'app les télécharge
 * quand elles sont jouées et les garde en cache (src/components/mobile/catalogo/
 * mascotCatalog.js). L'APK ne grossit donc pas avec chaque nouvelle animation.
 *
 * Lancé tout seul par Capacitor (crochet `capacitor:copy:after` de package.json).
 */
const fs = require('fs');
const path = require('path');

const targets = [
  path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'assets', 'public', 'mascot'),
  path.join(__dirname, '..', 'ios', 'App', 'App', 'public', 'mascot'),
];
for (const target of targets) {
  if (!fs.existsSync(target)) continue;
  const bytes = fs.readdirSync(target).reduce((sum, name) => sum + fs.statSync(path.join(target, name)).size, 0);
  fs.rmSync(target, { recursive: true, force: true });
  console.log(`✅ mascot/ retiré de ${path.relative(path.join(__dirname, '..'), target)} (${Math.round(bytes / 1024)} Ko hors de l'app)`);
}
