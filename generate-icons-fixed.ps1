# Script PowerShell corrige pour generer toutes les tailles d'icones PWA et iOS
# Utilise ImageMagick avec le chemin complet

Write-Host "GENERATION DES ICONES PWA ET IOS A PARTIR DE LOGOMUSICA.PNG..." -ForegroundColor Green

# Chemin vers ImageMagick
$magickPath = "C:\Program Files\ImageMagick-7.1.2-Q16-HDRI\magick.exe"

# Verifier si ImageMagick existe
if (!(Test-Path $magickPath)) {
    Write-Host "ImageMagick non trouve a: $magickPath" -ForegroundColor Red
    exit 1
}

Write-Host "ImageMagick detecte: $magickPath" -ForegroundColor Green

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
    $faviconName = if ($size -eq 16) { "favicon-16x16.png" } elseif ($size -eq 32) { "favicon-32x32.png" } else { "icon-${size}x${size}.png" }
    $outputPath = "public/icons/pwa/$faviconName"
    
    & $magickPath convert "$sourceImage" -resize "${size}x${size}" -background transparent -gravity center -extent "${size}x${size}" "$outputPath"
    
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
    
    & $magickPath convert "$sourceImage" -resize "${size}x${size}" -background transparent -gravity center -extent "${size}x${size}" "$outputPath"
    
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
    
    & $magickPath convert "$sourceImage" -resize "${size}x${size}" -background transparent -gravity center -extent "${size}x${size}" "$outputPath"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "icon-${size}x${size}.png" -ForegroundColor Green
    } else {
        Write-Host "Erreur lors de la generation de icon-${size}x${size}.png" -ForegroundColor Red
    }
}

# Creer le favicon.ico (16x16, 32x32, 48x48)
Write-Host "GENERATION DU FAVICON.ICO..." -ForegroundColor Cyan
& $magickPath convert "$sourceImage" -resize "48x48" -background transparent -gravity center -extent "48x48" "public/favicon.ico"
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
