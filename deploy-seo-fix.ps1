# 🚀 Script de déploiement des corrections SEO
# À exécuter dans PowerShell avec npm configuré

Write-Host "🔧 Déploiement des corrections SEO..." -ForegroundColor Cyan
Write-Host ""

# Vérifier que npm est disponible
Write-Host "📦 Vérification de npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "✅ npm version $npmVersion détecté" -ForegroundColor Green
} catch {
    Write-Host "❌ npm n'est pas installé ou pas dans le PATH" -ForegroundColor Red
    Write-Host "   Installe Node.js depuis https://nodejs.org" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Build et déploiement
Write-Host "🏗️  Build et déploiement en cours..." -ForegroundColor Yellow
Write-Host ""

try {
    npm run deploy
    Write-Host ""
    Write-Host "✅ Build et déploiement réussis!" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur lors du déploiement" -ForegroundColor Red
    Write-Host "   Essaye manuellement : npm run build && npm run deploy" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "📊 Fichiers modifiés pour le SEO:" -ForegroundColor Cyan
Write-Host "   • src/components/SEO.jsx (domaine corrigé)" -ForegroundColor White
Write-Host "   • src/config/routes.js (double SEO supprimé)" -ForegroundColor White
Write-Host "   • src/pages/Home.jsx (description unifiée)" -ForegroundColor White

Write-Host ""
Write-Host "🎯 Prochaines étapes:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1️⃣  Commit et push vers GitHub:" -ForegroundColor Yellow
Write-Host "   git add ." -ForegroundColor White
Write-Host "   git commit -m 'fix(seo): Corriger domaine et unifier SEO home'" -ForegroundColor White
Write-Host "   git push origin main" -ForegroundColor White
Write-Host ""
Write-Host "2️⃣  Attendre 2-5 minutes le déploiement GitHub Pages" -ForegroundColor Yellow
Write-Host ""
Write-Host "3️⃣  Vérifier le site:" -ForegroundColor Yellow
Write-Host "   https://www.amusicadasegunda.com" -ForegroundColor White
Write-Host ""
Write-Host "4️⃣  Google Search Console (dans les 24h):" -ForegroundColor Yellow
Write-Host "   • Demander l'indexation de la page d'accueil" -ForegroundColor White
Write-Host "   • Soumettre le sitemap" -ForegroundColor White
Write-Host ""
Write-Host "📖 Guide complet: GUIDE_REINDEXATION_GOOGLE.md" -ForegroundColor Cyan
Write-Host ""
Write-Host "✨ Déploiement terminé!" -ForegroundColor Green


