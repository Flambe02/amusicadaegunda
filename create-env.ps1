# Script PowerShell pour créer un fichier .env minimal (URL + clé publishable Supabase).
# Aucune clé n'est écrite dans ce fichier : les valeurs viennent de l'environnement
# (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) ou sont demandées à la saisie.
#
# Usage : .\create-env.ps1          (refuse d'écraser un .env existant)
#         .\create-env.ps1 -Force   (remplace le .env existant)

param(
    [switch]$Force
)

$ErrorActionPreference = 'Stop'
$defaultUrl = 'https://efnzmpzkzeuktqkghwfa.supabase.co'

if ((Test-Path '.env') -and -not $Force) {
    Write-Host 'Un fichier .env existe déjà (il peut contenir des secrets). Relancez avec -Force pour le remplacer.'
    exit 1
}

$url = $env:VITE_SUPABASE_URL
if (-not $url) {
    $url = Read-Host "VITE_SUPABASE_URL [$defaultUrl]"
    if (-not $url) { $url = $defaultUrl }
}

$key = $env:VITE_SUPABASE_ANON_KEY
if (-not $key) {
    $key = Read-Host 'VITE_SUPABASE_ANON_KEY (clé sb_publishable_...)'
}
$key = $key.Trim()

if (-not $key) {
    Write-Host 'Clé vide : .env non créé.'
    exit 1
}
if ($key.StartsWith('eyJ')) {
    Write-Host 'Clé JWT legacy refusée : les clés legacy sont désactivées sur ce projet. Utilisez la clé sb_publishable_.'
    exit 1
}
if (-not $key.StartsWith('sb_publishable_')) {
    Write-Host 'Attention : la clé ne commence pas par sb_publishable_. Ne mettez jamais une clé sb_secret_ dans une variable VITE_ lue par le site.'
}

$content = "VITE_SUPABASE_URL=$url`nVITE_SUPABASE_ANON_KEY=$key`n"
[System.IO.File]::WriteAllText((Join-Path (Get-Location) '.env'), $content, (New-Object System.Text.UTF8Encoding($false)))

Write-Host 'Fichier .env créé (valeurs non affichées).'
