# PowerShell Deployment Script for PWA
# Música da Segunda - Preserves CNAME for custom domain

Write-Host "🚀 Deploying PWA to GitHub Pages..." -ForegroundColor Green

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Not in the project root. Please run this from the project directory." -ForegroundColor Red
    exit 1
}

# Build the project
Write-Host "🔨 Building production version..." -ForegroundColor Cyan
try {
    npm run build
    Write-Host "✅ Build successful!" -ForegroundColor Green
} catch {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

# Backup CNAME if it exists
$cnamePath = "docs\CNAME"
if (Test-Path $cnamePath) {
    $cnameContent = Get-Content $cnamePath -Raw
    Write-Host "📋 Found CNAME: $cnameContent" -ForegroundColor Cyan
} else {
    Write-Host "⚠️  No CNAME found in docs/" -ForegroundColor Yellow
}

# Clean docs directory (but preserve CNAME)
Write-Host "🧹 Cleaning docs directory..." -ForegroundColor Cyan
if (Test-Path "docs") {
    # Remove everything except CNAME
    Get-ChildItem "docs" -Exclude "CNAME" | Remove-Item -Recurse -Force
    Write-Host "✅ Docs cleaned (CNAME preserved)" -ForegroundColor Green
}

# Copy dist files to docs
Write-Host "📁 Copying build files to docs..." -ForegroundColor Cyan
Copy-Item "dist\*" "docs\" -Recurse
Write-Host "✅ Files copied!" -ForegroundColor Green

# Restore CNAME if it was backed up
if ($cnameContent) {
    Set-Content -Path $cnamePath -Value $cnameContent -NoNewline
    Write-Host "✅ CNAME restored: $cnameContent" -ForegroundColor Green
}

# Create .env in docs for production
$envContent = @"
VITE_VAPID_PUBLIC_KEY=BNmWY52nhsYuohsMsFuFw5-vPv20qLw6nehrF-vyzPm87xU-6cPUoJhwtAVxj_18TcREBqx2uLdr5dcl57gVVNw
VITE_PUSH_API_BASE=https://efnzmpzkzeuktqkghwfa.functions.supabase.co
"@

Set-Content -Path "docs\.env" -Value $envContent -NoNewline
Write-Host "✅ Production .env created!" -ForegroundColor Green

# Git operations
Write-Host "📝 Committing changes..." -ForegroundColor Cyan
git add .
git commit -m "🚀 Deploy: PWA update - CNAME preserved for www.amusicadasegunda.com"

Write-Host "🚀 Pushing to GitHub..." -ForegroundColor Cyan
git push origin main

Write-Host "`n🎉 Deployment Complete!" -ForegroundColor Green
Write-Host "`n🌐 Your site will be available at:" -ForegroundColor White
Write-Host "   https://www.amusicadasegunda.com" -ForegroundColor Cyan
Write-Host "   https://amusicadaegunda.com" -ForegroundColor Cyan

Write-Host "`n⏱️  GitHub Pages may take a few minutes to update." -ForegroundColor Yellow
Write-Host "`n✅ CNAME preserved - custom domain maintained!" -ForegroundColor Green
