# PowerShell Deployment Script for Supabase Push Function
# Música da Segunda - Web Push System

Write-Host "🚀 Deploying Supabase Push Function..." -ForegroundColor Green

# Check if Supabase CLI is installed
try {
    $supabaseVersion = supabase --version
    Write-Host "✅ Supabase CLI found: $supabaseVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Supabase CLI not found. Please install it first:" -ForegroundColor Red
    Write-Host "   npm install -g supabase" -ForegroundColor Yellow
    Write-Host "   or visit: https://supabase.com/docs/guides/cli" -ForegroundColor Yellow
    exit 1
}

# Check if we're in a Supabase project
if (-not (Test-Path "supabase\config.toml")) {
    Write-Host "❌ Not in a Supabase project. Initializing..." -ForegroundColor Yellow
    supabase init
}

# Set Supabase secrets (you'll need to fill these in)
Write-Host "🔑 Setting Supabase secrets..." -ForegroundColor Cyan
Write-Host "⚠️  Please update these values with your actual Supabase project details" -ForegroundColor Yellow

# These are the commands you need to run manually:
Write-Host "`n📋 Run these commands manually:" -ForegroundColor White
Write-Host "supabase secrets set SUPABASE_URL=https://<project>.supabase.co" -ForegroundColor Cyan
Write-Host "supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service_role_key>" -ForegroundColor Cyan
Write-Host "supabase secrets set ALLOWED_ORIGIN=https://amusicadasegunda.com" -ForegroundColor Cyan
Write-Host "supabase secrets set VAPID_PUBLIC_KEY=BNmWY52nhsYuohsMsFuFw5-vPv20qLw6nehrF-vyzPm87xU-6cPUoJhwtAVxj_18TcREBqx2uLdr5dcl57gVVNw" -ForegroundColor Cyan
Write-Host "supabase secrets set VAPID_PRIVATE_KEY=8_BfV3CxPoLgiCq4UnprD94oa6BYaRyRhentLVCRFlA" -ForegroundColor Cyan
Write-Host "supabase secrets set PUSH_DEFAULT_LOCALE=pt-BR" -ForegroundColor Cyan

# Deploy the function
Write-Host "`n🚀 Deploying push function..." -ForegroundColor Green
try {
    supabase functions deploy push --no-verify-jwt
    Write-Host "✅ Push function deployed successfully!" -ForegroundColor Green
} catch {
    Write-Host "❌ Deployment failed. Please check your Supabase configuration." -ForegroundColor Red
    exit 1
}

# Show next steps
Write-Host "`n🎉 Deployment Complete!" -ForegroundColor Green
Write-Host "`n📋 Next Steps:" -ForegroundColor White
Write-Host "1. Update your .env file with VITE_VAPID_PUBLIC_KEY" -ForegroundColor Cyan
Write-Host "2. Update VITE_PUSH_API_BASE with your Supabase function URL" -ForegroundColor Cyan
Write-Host "3. Create the database table using the migration file" -ForegroundColor Cyan
Write-Host "4. Test the push notifications" -ForegroundColor Cyan

Write-Host "`n🧪 Test Command:" -ForegroundColor White
Write-Host "curl -X POST 'https://<PROJECT-REF>.functions.supabase.co/push/send' -H 'Content-Type: application/json' -d '{\"topic\":\"new-song\",\"locale\":\"pt-BR\"}'" -ForegroundColor Cyan
