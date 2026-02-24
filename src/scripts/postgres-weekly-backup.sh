#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"

ENV_FILE="${ENV_FILE:-$PROJECT_ROOT/.env.production.local}"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/backups/postgres}"
BACKUP_PREFIX="${BACKUP_PREFIX:-aiven-postgres}"
PG_DUMP_BIN="${PG_DUMP_BIN:-pg_dump}"
RETENTION_WEEKS="${RETENTION_WEEKS:-0}"

log() {
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

error() {
  log "ERROR: $*"
}

is_bsd_date() {
  date -v-1d +%F >/dev/null 2>&1
}

last_sunday() {
  local dow offset

  dow="$(date +%u)"
  offset=$((dow % 7))

  if is_bsd_date; then
    date -v-"${offset}"d +%F
  else
    date -d "-${offset} day" +%F
  fi
}

read_env_value() {
  local file="$1" key="$2" raw value

  raw="$(
    grep -E "^[[:space:]]*(export[[:space:]]+)?${key}=" "$file" | tail -n 1 || true
  )"

  if [[ -z "$raw" ]]; then
    return 1
  fi

  value="$(printf '%s' "$raw" | sed -E "s/^[[:space:]]*(export[[:space:]]+)?${key}=//")"

  if [[ "$value" == \"*\" && "$value" == *\" ]]; then
    value="${value#\"}"
    value="${value%\"}"
  elif [[ "$value" == \'*\' && "$value" == *\' ]]; then
    value="${value#\'}"
    value="${value%\'}"
  fi

  printf '%s' "$value"
}

resolve_database_url() {
  local db_url

  if [[ -n "${DATABASE_URL:-}" ]]; then
    printf '%s' "$DATABASE_URL"
    return 0
  fi

  if [[ -n "${AIVEN_DATABASE_URL:-}" ]]; then
    printf '%s' "$AIVEN_DATABASE_URL"
    return 0
  fi

  if [[ -f "$ENV_FILE" ]]; then
    if db_url="$(read_env_value "$ENV_FILE" "DATABASE_URL")" && [[ -n "$db_url" ]]; then
      printf '%s' "$db_url"
      return 0
    fi

    if db_url="$(read_env_value "$ENV_FILE" "AIVEN_DATABASE_URL")" && [[ -n "$db_url" ]]; then
      printf '%s' "$db_url"
      return 0
    fi
  fi

  return 1
}

file_mtime_epoch() {
  local file="$1"

  if stat -f %m "$file" >/dev/null 2>&1; then
    stat -f %m "$file"
  else
    stat -c %Y "$file"
  fi
}

retention_cutoff_epoch() {
  local weeks="$1"

  if is_bsd_date; then
    date -v-"${weeks}"w +%s
  else
    date -d "-${weeks} week" +%s
  fi
}

if ! command -v "$PG_DUMP_BIN" >/dev/null 2>&1; then
  error "'$PG_DUMP_BIN' not found. Install PostgreSQL client tools first."
  exit 1
fi

DATABASE_URL="$(resolve_database_url || true)"
if [[ -z "$DATABASE_URL" ]]; then
  error "DATABASE_URL is missing. Set it in environment or in $ENV_FILE."
  exit 1
fi

mkdir -p "$BACKUP_DIR"

target_sunday="$(last_sunday)"
marker_file="$BACKUP_DIR/sunday-${target_sunday}.ok"

if [[ -f "$marker_file" ]]; then
  recorded_dump="$(<"$marker_file")"
  if [[ -z "$recorded_dump" || -f "$BACKUP_DIR/$recorded_dump" ]]; then
    log "Backup already exists for Sunday $target_sunday. Nothing to do."
    exit 0
  fi
fi

timestamp="$(date '+%Y%m%d_%H%M%S')"
backup_filename="${BACKUP_PREFIX}_${timestamp}_for-sunday-${target_sunday}.dump"
backup_path="$BACKUP_DIR/$backup_filename"

log "Creating PostgreSQL backup for Sunday $target_sunday ..."
if ! "$PG_DUMP_BIN" \
  --format=custom \
  --compress=9 \
  --no-owner \
  --no-privileges \
  --file="$backup_path" \
  "$DATABASE_URL"; then
  rm -f "$backup_path"
  error "pg_dump failed."
  exit 1
fi

printf '%s\n' "$backup_filename" >"$marker_file"
ln -sfn "$backup_filename" "$BACKUP_DIR/latest.dump"
log "Backup completed: $backup_path"

if [[ "$RETENTION_WEEKS" =~ ^[0-9]+$ ]] && ((RETENTION_WEEKS > 0)); then
  cutoff_epoch="$(retention_cutoff_epoch "$RETENTION_WEEKS")"
  while IFS= read -r -d '' file; do
    file_epoch="$(file_mtime_epoch "$file")"
    if ((file_epoch < cutoff_epoch)); then
      rm -f "$file"
      log "Pruned old backup artifact: $(basename "$file")"
    fi
  done < <(
    find "$BACKUP_DIR" -type f \
      \( -name "${BACKUP_PREFIX}_*.dump" -o -name 'sunday-*.ok' \) \
      -print0
  )
fi
