#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"

echo "============================================"
echo "  HashCode Sync - Demarrage automatique"
echo "============================================"
echo

# 1. .env
if [ ! -f .env ]; then
  echo "[!] .env introuvable - creation depuis .env.example"
  cp .env.example .env
  echo "[!] Edite .env et renseigne tes valeurs !"
fi

# 2. Docker
echo "[1/4] Verification de Docker..."
if ! docker info >/dev/null 2>&1; then
  echo "[ERREUR] Docker n'est pas lance. Lance Docker Desktop puis relance ce script."
  exit 1
fi

echo "[2/4] Demarrage du conteneur PostgreSQL (port 5433)..."
if ! docker start hashcode-postgres >/dev/null 2>&1; then
  echo "[ERREUR] Conteneur 'hashcode-postgres' introuvable."
  echo "        Cree-le une premiere fois avec :"
  echo "        docker run -d --name hashcode-postgres \\"
  echo "          -e POSTGRES_USER=hashcode -e POSTGRES_PASSWORD=hashcode123 \\"
  echo "          -e POSTGRES_DB=hashcodesyncdb -p 5433:5432 postgres:16"
  exit 1
fi

# 3. Dependances
echo "[3/4] Verification des dependances..."
if [ ! -d node_modules ]; then
  echo "      npm install (premier lancement)..."
  npm install
fi

# 4. Migrations
echo "[4/4] Application des migrations..."
npx prisma migrate deploy

echo
echo "============================================"
echo "  Pret ! Ouvre http://localhost:3000"
echo "  (Ctrl+C pour arreter le serveur)"
echo "============================================"
echo
npm run dev
