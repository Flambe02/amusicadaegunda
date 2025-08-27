# Script PowerShell pour créer le fichier .env
# Exécutez ce script pour créer un fichier .env propre

$envContent = @"
VITE_SUPABASE_URL=https://efnzmpzkzeuktqkghwfa.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmbnptcHpremV1a3Rxa2dod2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMzE4MzcsImV4cCI6MjA3MTgwNzgzN30.iQiDuurPIkSNjHWP6TID0dATrOCJQ71-kblcsRsHiAk
"@

# Supprimer l'ancien fichier .env s'il existe
if (Test-Path ".env") {
    Remove-Item ".env" -Force
    Write-Host "Ancien fichier .env supprimé"
}

# Créer le nouveau fichier .env
$envContent | Out-File -FilePath ".env" -Encoding UTF8 -NoNewline

Write-Host "Fichier .env créé avec succès !"
Write-Host "Contenu du fichier .env :"
Get-Content ".env"
