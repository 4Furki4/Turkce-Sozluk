#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_dir"

container="turkish-dictionary-etymology-local"
if ! docker inspect --format '{{.State.Running}}' "$container" 2>/dev/null | grep -qx true; then
  echo "Start the $container Docker container before opening the preview." >&2
  exit 1
fi

db_password="$(docker exec "$container" printenv POSTGRES_PASSWORD)"
if [ -z "$db_password" ]; then
  echo "The pilot database password is unavailable." >&2
  exit 1
fi

export DATABASE_URL="postgresql://postgres:${db_password}@127.0.0.1:15435/turkish_dictionary_etymology?sslmode=disable"
export HOSTNAME=localhost
export PORT="${PORT:-3001}"
export ETYMOLOGY_OCR_DIR="${ETYMOLOGY_OCR_DIR:-$repo_dir/data/etymology/ocr-local/hasan-eren-pages-01-10}"

bun run build
mkdir -p .next/standalone/.next
cp -R .next/static .next/standalone/.next/static
cp -R public .next/standalone/public

echo "Etymology preview: http://localhost:${PORT}/tr/etymology-preview"
node -e 'require("dotenv").config({path:[".env.production.local",".env.local"]}); require("./.next/standalone/server.js")'
