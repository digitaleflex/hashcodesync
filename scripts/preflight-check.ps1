param()

$ErrorActionPreference = "Stop"

Write-Host "=== HashCode Sync - Pré-production checks ===" -ForegroundColor Cyan
Write-Host ""

# 1. Variables d'environnement
Write-Host "[1/4] Vérification des variables d'environnement..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
  Write-Host "❌ Fichier .env manquant" -ForegroundColor Red
  exit 1
}

Get-Content ".env" | ForEach-Object {
  if ($_ -match '^(DATABASE_URL|BETTER_AUTH_SECRET|BETTER_AUTH_URL|NEXT_PUBLIC_BETTER_AUTH_URL)=') {
    $name = $_.Split('=')[0]
    $value = $_.Split('=')[1]
    if ([string]::IsNullOrWhiteSpace($value)) {
      Write-Host "❌ $name manquant dans .env" -ForegroundColor Red
      exit 1
    }
  }
}
Write-Host "✅ Variables d'environnement OK" -ForegroundColor Green
Write-Host ""

# 2. Migrations Prisma
Write-Host "[2/4] Vérification des migrations Prisma..." -ForegroundColor Yellow
try {
  npx prisma migrate status --quiet | Out-Null
  Write-Host "✅ Migrations Prisma OK" -ForegroundColor Green
} catch {
  Write-Host "❌ Migrations Prisma non appliquées" -ForegroundColor Red
  Write-Host "   Lancez: npx prisma migrate dev" -ForegroundColor Yellow
  exit 1
}
Write-Host ""

# 3. Compilation TypeScript
Write-Host "[3/4] Vérification TypeScript..." -ForegroundColor Yellow
try {
  npx tsc --noEmit 2>&1 | Out-Null
  Write-Host "✅ TypeScript OK" -ForegroundColor Green
} catch {
  Write-Host "❌ Erreurs TypeScript détectées" -ForegroundColor Red
  npx tsc --noEmit
  exit 1
}
Write-Host ""

# 4. Build Next.js
Write-Host "[4/4] Build de production..." -ForegroundColor Yellow
try {
  npm run build 2>&1 | Out-Null
  Write-Host "✅ Build OK" -ForegroundColor Green
} catch {
  Write-Host "❌ Build échoué" -ForegroundColor Red
  exit 1
}
Write-Host ""

Write-Host "=== ✅ Tous les checks sont passés ===" -ForegroundColor Cyan
