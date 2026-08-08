#!/usr/bin/env python3
import sys
import os
from pathlib import Path
from b2sdk.v1 import B2Api, InMemoryAccountInfo

def upload_folder(local_path, b2_prefix):
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

    local_path = Path(local_path)
    if not local_path.exists():
        print(f"Local path does not exist: {local_path}", file=sys.stderr)
        sys.exit(1)

    print(f"[b2] Uploading {local_path} to b2://{bucket_name}/{b2_prefix}")

    if local_path.is_file():
        bucket.upload_local_file(str(local_path), b2_prefix)
    else:
        for file_path in sorted(local_path.rglob("*")):
            if file_path.is_file():
                relative_path = file_path.relative_to(local_path)
                remote_path = f"{b2_prefix.rstrip('/')}/{relative_path.as_posix()}"
                print(f"[b2] Uploading {file_path} -> {remote_path}")
                bucket.upload_local_file(str(file_path), remote_path)

    print("[b2] Upload completed")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(f"Usage: {sys.argv[0]} <local_path> <b2_prefix>", file=sys.stderr)
        sys.exit(1)
    upload_folder(sys.argv[1], sys.argv[2])
