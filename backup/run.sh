#!/bin/bash
set -euo pipefail

DATE=$(date +%Y%m%d_%H%M%S)
TMP_DIR="/tmp/backup_${DATE}"
mkdir -p "${TMP_DIR}"

send_discord_notification() {
  local status="$1"
  local message="$2"
  local webhook_url="${DISCORD_WEBHOOK_URL:-}"

  if [ -z "${webhook_url}" ] || [ "${BACKUP_NOTIFY_DISCORD:-true}" != "true" ]; then
    return 0
  fi

  local color
  if [ "${status}" = "success" ]; then
    color="3066993"
  else
    color="15158332"
  fi

  local escaped_message
  escaped_message=$(echo "${message}" | sed 's/"/\\"/g' | sed ':a;N;$!ba;s/\n/\\n/g')

  curl -s -X POST "${webhook_url}" \
    -H "Content-Type: application/json" \
    -d "{\"embeds\": [{\"title\": \"HashCode Sync Backup - ${status^^}\", \"description\": \"${escaped_message}\", \"color\": ${color}, \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}]}" || true
}

send_email_notification() {
  local status="$1"
  local message="$2"
  local to_email="${BACKUP_NOTIFY_EMAIL:-}"
  local api_key="${RESEND_API_KEY:-}"
  local from_email="${RESEND_FROM:-HashCode Sync <no-reply@joinhashcode.com>}"

  if [ -z "${to_email}" ] || [ -z "${api_key}" ]; then
    return 0
  fi

  if [ "${status}" = "success" ] && [ "${BACKUP_NOTIFY_EMAIL_ON_SUCCESS:-false}" != "true" ]; then
    return 0
  fi

  local subject="HashCode Sync Backup - ${status^^}"
  local escaped_message
  escaped_message=$(echo "${message}" | sed 's/"/\\"/g' | sed ':a;N;$!ba;s/\n/<br>/g')

  curl -s -X POST "https://api.resend.com/emails" \
    -H "Authorization: Bearer ${api_key}" \
    -H "Content-Type: application/json" \
    -d "{\"from\": \"${from_email}\", \"to\": \"${to_email}\", \"subject\": \"${subject}\", \"html\": \"<html><body><p>${escaped_message}</p><p>Date: ${DATE}</p></body></html>\"}" || true
}

notify_success() {
  local size
  size=$(du -sh "${TMP_DIR}" 2>/dev/null | cut -f1 || echo "unknown")
  local message="Backup completed successfully on ${DATE}\nSize: ${size}\nRetention: ${BACKUP_RETENTION_DAYS:-7} days"
  send_discord_notification "success" "$(echo -e "${message}")"
  send_email_notification "success" "$(echo -e "${message}")"
}

notify_failure() {
  local error="$1"
  local message="Backup failed on ${DATE}\nError: ${error}"
  send_discord_notification "failure" "$(echo -e "${message}")"
  send_email_notification "failure" "$(echo -e "${message}")"
}

trap 'notify_failure "Script exited with code $?"' ERR

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
b2 ls "b2://${B2_BUCKET}/backups/" | awk -v retention="${BACKUP_RETENTION_DAYS:-7}" '{
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
notify_success
