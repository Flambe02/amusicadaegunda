# 🔍 Script de vérification et déploiement SEO
# Vérifie Node.js, guide l'installation si nécessaire, puis déploie

Write-Host ""
Write-Host "🔍 Vérification de l'environnement..." -ForegroundColor Cyan
Write-Host ""

# Fonction pour vérifier si une commande existe
function Test-CommandExists {
    param($command)
    $null = Get-Command $command -ErrorAction SilentlyContinue
    return $?
}

# Vérifier Node.js
Write-Host "📦 Vérification de Node.js..." -ForegroundColor Yellow

if (Test-CommandExists node) {
    $nodeVersion = node --version
    Write-Host "✅ Node.js $nodeVersion est installé" -ForegroundColor Green
    
    # Vérifier npm
    if (Test-CommandExists npm) {
        $npmVersion = npm --version
        Write-Host "✅ npm $npmVersion est installé" -ForegroundColor Green
        Write-Host ""
        
        # Vérifier si node_modules existe
        if (-not (Test-Path "node_modules")) {
            Write-Host "⚠️  node_modules n'existe pas" -ForegroundColor Yellow
            Write-Host "📦 Installation des dépendances..." -ForegroundColor Cyan
            Write-Host ""
            
            try {
                npm install
                Write-Host ""
                Write-Host "✅ Dépendances installées avec succès!" -ForegroundColor Green
            } catch {
                Write-Host "❌ Erreur lors de l'installation des dépendances" -ForegroundColor Red
                Write-Host "   Essaye manuellement : npm install" -ForegroundColor Yellow
                exit 1
            }
        } else {
            Write-Host "✅ node_modules existe déjà" -ForegroundColor Green
        }
        
        Write-Host ""
        Write-Host "🚀 Lancement du déploiement..." -ForegroundColor Cyan
        Write-Host ""
        
        # Déploiement
        try {
            npm run deploy
            Write-Host ""
            Write-Host "✅ Déploiement réussi!" -ForegroundColor Green
            Write-Host ""
            
            # Afficher les prochaines étapes
            Write-Host "📊 Corrections SEO appliquées:" -ForegroundColor Cyan
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
            Write-Host "✨ Tout est prêt!" -ForegroundColor Green
            
        } catch {
            Write-Host "❌ Erreur lors du déploiement" -ForegroundColor Red
            Write-Host "   Essaye manuellement : npm run build && npm run deploy" -ForegroundColor Yellow
            exit 1
        }
        
    } else {
        Write-Host "❌ npm n'est pas installé (bizarre, il vient normalement avec Node.js)" -ForegroundColor Red
        Write-Host "   Réinstalle Node.js depuis https://nodejs.org" -ForegroundColor Yellow
        exit 1
    }
    
} else {
    Write-Host "❌ Node.js n'est pas installé" -ForegroundColor Red
    Write-Host ""
    Write-Host "📖 Guide d'installation créé : INSTALLER_NODEJS.md" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "🚀 Installation rapide (5 minutes) :" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   1️⃣  Va sur : https://nodejs.org/" -ForegroundColor White
    Write-Host "   2️⃣  Télécharge la version LTS (recommandée)" -ForegroundColor White
    Write-Host "   3️⃣  Installe avec l'assistant" -ForegroundColor White
    Write-Host "   4️⃣  Rouvre PowerShell et relance ce script" -ForegroundColor White
    Write-Host ""
    Write-Host "Ou ouvre INSTALLER_NODEJS.md pour plus de détails" -ForegroundColor Cyan
    Write-Host ""
    
    # Demander si on veut ouvrir le navigateur
    $response = Read-Host "Veux-tu ouvrir nodejs.org maintenant ? (O/N)"
    if ($response -eq "O" -or $response -eq "o" -or $response -eq "Y" -or $response -eq "y") {
        Start-Process "https://nodejs.org/"
        Write-Host ""
        Write-Host "✅ Navigateur ouvert sur nodejs.org" -ForegroundColor Green
        Write-Host "   Télécharge et installe Node.js, puis relance ce script!" -ForegroundColor Yellow
    }
    
    exit 1
}

