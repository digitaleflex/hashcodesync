@echo off
setlocal
cd /d "%~dp0"
title HashCode Sync - Launcher

echo ============================================
echo   HashCode Sync - Demarrage automatique
echo ============================================
echo.

rem --- 1. .env ---------------------------------------------------------------
if not exist .env (
  echo [!] Fichier .env introuvable - creation depuis .env.example
  copy .env.example .env >nul
  echo [!] OUVRES .env et remplace USER/PASSWORD/DATABASE par tes valeurs !
  pause
)

rem --- 2. Docker --------------------------------------------------------------
echo [1/4] Verification de Docker...
docker info >nul 2>&1
if errorlevel 1 (
  echo [ERREUR] Docker n'est pas lance. Ouvre Docker Desktop puis relance ce script.
  pause
  exit /b 1
)

echo [2/4] Demarrage du conteneur PostgreSQL (port 5433)...
docker start hashcode-postgres >nul 2>&1
if errorlevel 1 (
  echo [ERREUR] Conteneur "hashcode-postgres" introuvable.
  echo          Cree-le une premiere fois avec cette commande :
  echo          docker run -d --name hashcode-postgres -e POSTGRES_USER=hashcode -e POSTGRES_PASSWORD=hashcode123 -e POSTGRES_DB=hashcodesyncdb -p 5433:5432 postgres:16
  pause
  exit /b 1
)

rem --- 3. Dependances ---------------------------------------------------------
echo [3/4] Verification des dependances...
if not exist node_modules (
  echo      Installation de npm install (premier lancement)...
  call npm install
  if errorlevel 1 (
    echo [ERREUR] npm install a echoue.
    pause
    exit /b 1
  )
)

rem --- 4. Migrations ----------------------------------------------------------
echo [4/4] Application des migrations...
call npx prisma migrate deploy
if errorlevel 1 (
  echo [ERREUR] Migrations echouees. Verifie DATABASE_URL dans .env.
  pause
  exit /b 1
)

echo.
echo ============================================
echo   Pret ! Ouvre http://localhost:3000
echo   (Ctrl+C pour arreter le serveur)
echo ============================================
echo.
call npm run dev
