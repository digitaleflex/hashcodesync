#!/usr/bin/env python3
import sys
import os
from datetime import datetime, timedelta, timezone
from b2sdk.v1 import B2Api, InMemoryAccountInfo

def cleanup_old_backups(prefix, retention_days):
    application_key_id = os.environ.get("B2_APPLICATION_KEY_ID", "")
    application_key = os.environ.get("B2_APPLICATION_KEY", "")
    endpoint = os.environ.get("B2_ENDPOINT", "")
    bucket_name = os.environ.get("B2_BUCKET", "")

    if not all([application_key_id, application_key, endpoint, bucket_name]):
        print("Missing B2 environment variables", file=sys.stderr)
        sys.exit(1)

    info = InMemoryAccountInfo()
    api = B2Api(info)
    api.authorize_account(
        endpoint,
        application_key_id,
        application_key,
    )
    bucket = api.get_bucket_by_name(bucket_name)

    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=int(retention_days))
    print(f"[b2] Cleaning backups older than {cutoff.isoformat()} in {prefix}")

    deleted = 0
    for file_version, _ in bucket.ls(prefix, recursive=True):
        if file_version.upload_timestamp:
            try:
                file_date = datetime.fromtimestamp(file_version.upload_timestamp, tz=timezone.utc)
            except (OSError, ValueError, OverflowError):
                continue
            if file_date < cutoff:
                print(f"[b2] Deleting {file_version.file_name}")
                bucket.delete_file_version(file_version.id_, file_version.file_name)
                deleted += 1

    print(f"[b2] Cleanup completed. Deleted {deleted} old backup(s)")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(f"Usage: {sys.argv[0]} <prefix> <retention_days>", file=sys.stderr)
        sys.exit(1)
    cleanup_old_backups(sys.argv[1], sys.argv[2])
