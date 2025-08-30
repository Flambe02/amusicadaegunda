# Script PowerShell pour generer toutes les tailles d'icones PWA et iOS
# Utilise ImageMagick pour redimensionner LogoMusica.png

Write-Host "GENERATION DES ICONES PWA ET IOS A PARTIR DE LOGOMUSICA.PNG..." -ForegroundColor Green

# Verifier si ImageMagick est installe
try {
    $magickVersion = magick -version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "ImageMagick detecte: $magickVersion" -ForegroundColor Green
    } else {
        throw "ImageMagick non trouve"
    }
} catch {
    Write-Host "ImageMagick n'est pas installe. Installation..." -ForegroundColor Red
    Write-Host "Telechargement et installation d'ImageMagick..." -ForegroundColor Yellow
    
    # Installer ImageMagick via winget
    try {
        winget install ImageMagick.ImageMagick
        Write-Host "ImageMagick installe avec succes!" -ForegroundColor Green
        # Redemarrer la session PowerShell pour charger le PATH
        Write-Host "Veuillez redemarrer ce terminal et relancer le script." -ForegroundColor Yellow
        exit
    } catch {
        Write-Host "Echec de l'installation d'ImageMagick. Installation manuelle requise." -ForegroundColor Red
        Write-Host "Telechargez depuis: https://imagemagick.org/script/download.php#windows" -ForegroundColor Yellow
        exit 1
    }
}

# Creer les dossiers de destination
$folders = @(
    "public/icons/pwa",
    "public/icons/apple",
    "public/icons/android"
)

foreach ($folder in $folders) {
    if (!(Test-Path $folder)) {
        New-Item -ItemType Directory -Path $folder -Force | Out-Null
        Write-Host "Dossier cree: $folder" -ForegroundColor Blue
    }
}

# Tailles d'icones PWA
$pwaSizes = @(16, 32, 72, 96, 128, 144, 152, 180, 192, 384, 512)

# Tailles d'icones iOS
$iosSizes = @(57, 60, 72, 76, 114, 120, 144, 152, 180)

# Tailles d'icones Android
$androidSizes = @(36, 48, 72, 96, 144, 192)

# Source image
$sourceImage = "public/images/LogoMusica.png"

if (!(Test-Path $sourceImage)) {
    Write-Host "Image source non trouvee: $sourceImage" -ForegroundColor Red
    exit 1
}

Write-Host "Image source: $sourceImage" -ForegroundColor Blue

# Generer les icones PWA
Write-Host "GENERATION DES ICONES PWA..." -ForegroundColor Cyan
foreach ($size in $pwaSizes) {
    $outputPath = "public/icons/pwa/icon-${size}x${size}.png"
    $faviconName = if ($size -eq 16) { "favicon-16x16.png" } elseif ($size -eq 32) { "favicon-32x32.png" } else { "icon-${size}x${size}.png" }
    $outputPath = "public/icons/pwa/$faviconName"
    
    magick convert "$sourceImage" -resize "${size}x${size}" -background transparent -gravity center -extent "${size}x${size}" "$outputPath"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "$faviconName (${size}x${size})" -ForegroundColor Green
    } else {
        Write-Host "Erreur lors de la generation de $faviconName" -ForegroundColor Red
    }
}

# Generer les icones iOS
Write-Host "GENERATION DES ICONES IOS..." -ForegroundColor Cyan
foreach ($size in $iosSizes) {
    $outputPath = "public/icons/apple/apple-touch-icon-${size}x${size}.png"
    
    magick convert "$sourceImage" -resize "${size}x${size}" -background transparent -gravity center -extent "${size}x${size}" "$outputPath"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "apple-touch-icon-${size}x${size}.png" -ForegroundColor Green
    } else {
        Write-Host "Erreur lors de la generation de apple-touch-icon-${size}x${size}.png" -ForegroundColor Red
    }
}

# Generer les icones Android
Write-Host "GENERATION DES ICONES ANDROID..." -ForegroundColor Cyan
foreach ($size in $androidSizes) {
    $outputPath = "public/icons/android/icon-${size}x${size}.png"
    
    magick convert "$sourceImage" -resize "${size}x${size}" -background transparent -gravity center -extent "${size}x${size}" "$outputPath"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "icon-${size}x${size}.png" -ForegroundColor Green
    } else {
        Write-Host "Erreur lors de la generation de icon-${size}x${size}.png" -ForegroundColor Red
    }
}

# Creer le favicon.ico (16x16, 32x32, 48x48)
Write-Host "GENERATION DU FAVICON.ICO..." -ForegroundColor Cyan
magick convert "$sourceImage" -resize "48x48" -background transparent -gravity center -extent "48x48" "public/favicon.ico"
if ($LASTEXITCODE -eq 0) {
    Write-Host "favicon.ico cree" -ForegroundColor Green
} else {
    Write-Host "Erreur lors de la generation du favicon.ico" -ForegroundColor Red
}

Write-Host "GENERATION DES ICONES TERMINEE !" -ForegroundColor Green
Write-Host "Icones PWA: public/icons/pwa/" -ForegroundColor Blue
Write-Host "Icones iOS: public/icons/apple/" -ForegroundColor Blue
Write-Host "Icones Android: public/icons/android/" -ForegroundColor Blue
Write-Host "Favicon: public/favicon.ico" -ForegroundColor Blue
