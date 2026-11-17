#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_dir"

container="turkish-dictionary-etymology-local"
if ! docker inspect --format '{{.State.Running}}' "$container" 2>/dev/null | grep -qx true; then
  echo "Start the $container Docker container before importing OCR." >&2
  exit 1
fi

db_password="$(docker exec "$container" printenv POSTGRES_PASSWORD)"
if [ -z "$db_password" ]; then
  echo "The pilot database password is unavailable." >&2
  exit 1
fi

export DATABASE_URL="postgresql://postgres:${db_password}@127.0.0.1:15435/turkish_dictionary_etymology?sslmode=disable"
exec bun src/scripts/import-etymology-ocr.ts "$@"
