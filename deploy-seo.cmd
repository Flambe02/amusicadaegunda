@echo off
chcp 65001 >nul
cls

echo.
echo ╔══════════════════════════════════════════════════════════════════╗
echo ║                                                                  ║
echo ║  🚀 DÉPLOIEMENT CORRECTIONS SEO                                  ║
echo ║                                                                  ║
echo ╚══════════════════════════════════════════════════════════════════╝
echo.

:: Vérifier Node.js
echo 📦 Vérification de Node.js...
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Node.js n'est pas installé
    echo.
    echo 📖 Lis le guide : INSTALLER_NODEJS.md
    echo.
    echo 🚀 Installation rapide :
    echo    1. Va sur : https://nodejs.org/
    echo    2. Télécharge la version LTS
    echo    3. Installe avec l'assistant
    echo    4. Relance ce script
    echo.
    pause
    exit /b 1
)

:: Afficher la version
for /f "tokens=*" %%a in ('node --version') do set NODE_VERSION=%%a
echo ✅ Node.js %NODE_VERSION% est installé
echo.

:: Vérifier npm
echo 📦 Vérification de npm...
where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ npm n'est pas trouvé
    echo    Réinstalle Node.js depuis nodejs.org
    pause
    exit /b 1
)

for /f "tokens=*" %%a in ('npm --version') do set NPM_VERSION=%%a
echo ✅ npm %NPM_VERSION% est installé
echo.

:: Vérifier node_modules
if not exist "node_modules\" (
    echo ⚠️  node_modules n'existe pas
    echo 📦 Installation des dépendances...
    echo.
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo ❌ Erreur lors de l'installation
        pause
        exit /b 1
    )
    echo.
    echo ✅ Dépendances installées
    echo.
) else (
    echo ✅ node_modules existe déjà
    echo.
)

:: Déploiement
echo 🚀 Déploiement en cours...
echo.
call npm run deploy
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Erreur lors du déploiement
    echo    Essaye : npm run build
    pause
    exit /b 1
)

echo.
echo ✅ Déploiement réussi!
echo.
echo ╔══════════════════════════════════════════════════════════════════╗
echo ║                                                                  ║
echo ║  📊 CORRECTIONS SEO DÉPLOYÉES                                    ║
echo ║                                                                  ║
echo ╚══════════════════════════════════════════════════════════════════╝
echo.
echo    • src/components/SEO.jsx (domaine corrigé)
echo    • src/config/routes.js (double SEO supprimé)
echo    • src/pages/Home.jsx (description unifiée)
echo.
echo ╔══════════════════════════════════════════════════════════════════╗
echo ║                                                                  ║
echo ║  🎯 PROCHAINES ÉTAPES                                            ║
echo ║                                                                  ║
echo ╚══════════════════════════════════════════════════════════════════╝
echo.
echo 1️⃣  Commit et push vers GitHub :
echo.
echo    git add .
echo    git commit -m "fix(seo): Corriger domaine et unifier SEO home"
echo    git push origin main
echo.
echo 2️⃣  Attendre 2-5 minutes le déploiement GitHub Pages
echo.
echo 3️⃣  Vérifier le site :
echo    https://www.amusicadasegunda.com
echo.
echo 4️⃣  Google Search Console (dans les 24h) :
echo    • Demander l'indexation de la page d'accueil
echo    • Soumettre le sitemap
echo.
echo 📖 Guide complet : GUIDE_REINDEXATION_GOOGLE.md
echo.
pause


