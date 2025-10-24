# Script de déploiement pour corriger les pages blanches
Write-Host "🔧 Déploiement de la correction des pages blanches..." -ForegroundColor Yellow

# 1. Build avec la correction
Write-Host "📦 Building..." -ForegroundColor Cyan
npm run build:seo

# 2. Déployer
Write-Host "🚀 Deploying..." -ForegroundColor Cyan
npm run deploy

# 3. Commit et push
Write-Host "📝 Committing..." -ForegroundColor Cyan
git add .
git commit -m "🔧 Fix character encoding in JSON-LD stubs - Portuguese characters"
git push origin main

Write-Host "✅ Déploiement terminé !" -ForegroundColor Green
Write-Host "🧪 Testez maintenant: https://www.amusicadasegunda.com/chansons/o-croissant/" -ForegroundColor Yellow
