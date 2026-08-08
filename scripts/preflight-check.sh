#!/usr/bin/env bash
set -euo pipefail

echo "=== HashCode Sync - Pré-production checks ==="
echo ""

# 1. Variables d'environnement
echo "[1/4] Vérification des variables d'environnement..."
if [ ! -f .env ]; then
  echo "❌ Fichier .env manquant"
  exit 1
fi

source .env

MISSING=0
for var in DATABASE_URL BETTER_AUTH_SECRET BETTER_AUTH_URL NEXT_PUBLIC_BETTER_AUTH_URL CRON_SECRET NEXT_PUBLIC_APP_DOMAIN NEXT_PUBLIC_APP_URL; do
  if [ -z "${!var:-}" ]; then
    echo "❌ $var manquant dans .env"
    MISSING=1
  fi
done

if [ $MISSING -eq 1 ]; then
  echo "❌ Variables d'environnement manquantes"
  exit 1
fi
echo "✅ Variables d'environnement OK"
echo ""

# 2. Migrations Prisma
echo "[2/4] Vérification des migrations Prisma..."
if ! npx prisma migrate status --quiet 2>/dev/null; then
  echo "❌ Migrations Prisma non appliquées"
  echo "   Lancez: npx prisma migrate dev"
  exit 1
fi
echo "✅ Migrations Prisma OK"
echo ""

# 3. Compilation TypeScript
echo "[3/4] Vérification TypeScript..."
if ! npx tsc --noEmit 2>/dev/null; then
  echo "❌ Erreurs TypeScript détectées"
  npx tsc --noEmit
  exit 1
fi
echo "✅ TypeScript OK"
echo ""

# 4. Build Next.js
echo "[4/4] Build de production..."
if ! npm run build 2>/dev/null; then
  echo "❌ Build échoué"
  exit 1
fi
echo "✅ Build OK"
echo ""

echo "=== ✅ Tous les checks sont passés ==="
