#!/bin/bash
set -euo pipefail

DATE=$(date +%Y%m%d_%H%M%S)
TMP_DIR="/tmp/backup_${DATE}"
mkdir -p "${TMP_DIR}"

echo "[backup] Starting backup at ${DATE}"

export PGPASSWORD="${DATABASE_PASSWORD:-5ace782fb8dba068d5541b3029f9acec7705623246dabba3}"
pg_dump -h "${DATABASE_HOST:-db}" -U "${DATABASE_USER:-hcode_prod_usr}" -d "${DATABASE_NAME:-hashcode_sync_db}" -F c -f "${TMP_DIR}/db_${DATE}.dump"

if [ -d "/backup/uploads" ]; then
  cp -r /backup/uploads "${TMP_DIR}/uploads"
fi

echo "[backup] Uploading to Backblaze B2..."
b2 authorize-account "${B2_APPLICATION_KEY_ID}" "${B2_APPLICATION_KEY}" --stor "${B2_ENDPOINT}"

b2 sync "${TMP_DIR}/" "b2://${B2_BUCKET}/backups/${DATE}/"

echo "[backup] Cleaning old backups..."
b2 ls "b2://${B2_BUCKET}/backups/" | awk -v retention="${BACKUP_RETENTION_DAYS:-7}" -v prefix="backups/" '{
  cmd = "date -d \"" $1 "\" +%s"
  cmd | getline file_date
  close(cmd)
  cmd = "date +%s"
  cmd | getline now
  close(cmd)
  diff = (now - file_date) / 86400
  if (diff > retention) print $1
}' | while read -r old_backup; do
  if [ -n "${old_backup}" ]; then
    echo "[backup] Deleting old backup: ${old_backup}"
    b2 rm "b2://${B2_BUCKET}/${old_backup}"
  fi
done

rm -rf "${TMP_DIR}"
echo "[backup] Backup completed successfully: ${DATE}"
