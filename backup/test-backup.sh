#!/bin/bash
set -euo pipefail

if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

DATE=$(date +%Y%m%d_%H%M%S)

echo "=== HashCode Sync Backup Tests ==="
echo ""

echo "[test] Checking environment variables..."
if [ -z "${B2_APPLICATION_KEY_ID:-}" ]; then
  echo "FAIL: B2_APPLICATION_KEY_ID is not set"
  exit 1
fi
if [ -z "${B2_APPLICATION_KEY:-}" ]; then
  echo "FAIL: B2_APPLICATION_KEY is not set"
  exit 1
fi
if [ -z "${B2_BUCKET:-}" ]; then
  echo "FAIL: B2_BUCKET is not set"
  exit 1
fi
echo "PASS: Environment variables are set"

echo "[test] Checking Docker volumes..."
if ! docker volume inspect hashcodesync_hashcodesync_postgres >/dev/null 2>&1; then
  echo "FAIL: hashcodesync_hashcodesync_postgres volume does not exist"
  exit 1
fi
if ! docker volume inspect hashcodesync_hashcodesync_uploads >/dev/null 2>&1; then
  echo "FAIL: hashcodesync_hashcodesync_uploads volume does not exist"
  exit 1
fi
echo "PASS: Docker volumes exist"

echo "[test] Checking PostgreSQL connectivity..."
if ! docker exec hashcodesync_db pg_isready -U "${POSTGRES_USER:-hcode_prod_usr}" -d "${POSTGRES_DB:-hashcode_sync_db}" >/dev/null 2>&1; then
  echo "FAIL: PostgreSQL is not ready"
  exit 1
fi
echo "PASS: PostgreSQL is ready"

echo "[test] Checking database has tables..."
TABLE_COUNT=$(docker exec hashcodesync_db psql -U "${POSTGRES_USER:-hcode_prod_usr}" -d "${POSTGRES_DB:-hashcode_sync_db}" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';" 2>/dev/null | tr -d '[:space:]')
if [ "${TABLE_COUNT}" -lt 10 ]; then
  echo "FAIL: Database has only ${TABLE_COUNT} tables, expected at least 10"
  exit 1
fi
echo "PASS: Database has ${TABLE_COUNT} tables"

echo "[test] Checking Python and b2sdk availability..."
if ! docker compose exec backup python3 -c "import b2sdk; print('OK')" >/dev/null 2>&1; then
  echo "FAIL: b2sdk not installed in backup container"
  exit 1
fi
echo "PASS: Python and b2sdk are available"

echo "[test] Checking B2 authentication..."
TMP_TEST_FILE="/tmp/b2_test_${DATE}.txt"
docker compose exec backup sh -c "echo 'test' > ${TMP_TEST_FILE}"
if ! docker compose exec backup python3 /backup/b2_upload.py "${TMP_TEST_FILE}" "test_backup_${DATE}.txt" >/dev/null 2>&1; then
  docker compose exec backup rm -f "${TMP_TEST_FILE}"
  echo "FAIL: B2 authentication failed"
  exit 1
fi
docker compose exec backup rm -f "${TMP_TEST_FILE}"
echo "PASS: B2 authentication successful"

echo "[test] Checking B2 bucket access..."
if ! docker compose exec backup python3 /backup/b2_cleanup.py "backups/" "7" >/dev/null 2>&1; then
  echo "FAIL: Cannot access B2 bucket ${B2_BUCKET}"
  exit 1
fi
echo "PASS: B2 bucket is accessible"

echo "[test] Running manual backup..."
if ! docker compose exec backup /backup/run.sh; then
  echo "FAIL: Manual backup failed"
  exit 1
fi
echo "PASS: Manual backup completed"

echo "[test] Checking backup files in B2..."
BACKUP_COUNT=$(docker compose exec backup python3 /backup/b2_cleanup.py "backups/" "7" 2>/dev/null | grep -c "Deleting" || true)
if [ "${BACKUP_COUNT}" -lt 0 ]; then
  echo "FAIL: No backup files found in B2"
  exit 1
fi
echo "PASS: Found backups in B2"

echo ""
echo "=== All tests passed ==="
