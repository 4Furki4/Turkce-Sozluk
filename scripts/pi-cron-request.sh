#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 4 ] || [ "$#" -gt 5 ]; then
  echo "Usage: $0 <env-file> <base-url> <job-name> <endpoint> [uptime-kuma-push-url]" >&2
  exit 64
fi

ENV_FILE="$1"
BASE_URL="${2%/}"
JOB_NAME="$3"
ENDPOINT="$4"
UPTIME_KUMA_PUSH_URL="${5:-}"
UPTIME_KUMA_PUSH_URL="${UPTIME_KUMA_PUSH_URL%%\?*}"

LOG_DIR="${LOG_DIR:-/var/log/turkish-dictionary}"
STATE_DIR="${STATE_DIR:-/var/lib/turkish-dictionary/cron}"
LOG_FILE="${LOG_DIR}/${JOB_NAME}.log"
STATE_FILE="${STATE_DIR}/${JOB_NAME}.last_success"

mkdir -p "$LOG_DIR" "$STATE_DIR"

timestamp() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

read_env_value() {
  local key="$1"
  local value

  value="$(
    sed -nE "s/^[[:space:]]*(export[[:space:]]+)?${key}[[:space:]]*=[[:space:]]*//p" "$ENV_FILE" \
      | tail -n 1
  )"

  value="${value%$'\r'}"

  if [[ "$value" == \"*\" && "$value" == *\" ]]; then
    value="${value:1:${#value}-2}"
  elif [[ "$value" == \'*\' && "$value" == *\' ]]; then
    value="${value:1:${#value}-2}"
  fi

  printf '%s' "$value"
}

CRON_SECRET="$(read_env_value CRON_SECRET)"

if [ -z "$CRON_SECRET" ]; then
  echo "$(timestamp) FAIL ${JOB_NAME}: CRON_SECRET is missing in ${ENV_FILE}" | tee -a "$LOG_FILE" >&2
  exit 78
fi

URL="${BASE_URL}${ENDPOINT}"
RESPONSE_FILE="$(mktemp)"
HTTP_CODE="000"

cleanup() {
  rm -f "$RESPONSE_FILE"
}
trap cleanup EXIT

echo "$(timestamp) START ${JOB_NAME}: ${URL}" >> "$LOG_FILE"

if HTTP_CODE="$(
  curl \
    --silent \
    --show-error \
    --location \
    --retry 3 \
    --retry-delay 5 \
    --max-time 180 \
    --output "$RESPONSE_FILE" \
    --write-out "%{http_code}" \
    --header "Authorization: Bearer ${CRON_SECRET}" \
    "$URL"
)"; then
  if [[ "$HTTP_CODE" =~ ^2[0-9][0-9]$ ]]; then
    timestamp > "$STATE_FILE"
    {
      echo "$(timestamp) OK ${JOB_NAME}: HTTP ${HTTP_CODE}"
      sed 's/^/response: /' "$RESPONSE_FILE"
    } >> "$LOG_FILE"

    if [ -n "$UPTIME_KUMA_PUSH_URL" ]; then
      curl --silent --show-error --max-time 30 "${UPTIME_KUMA_PUSH_URL}?status=up&msg=${JOB_NAME}%20ok" >/dev/null || true
    fi

    exit 0
  fi
fi

{
  echo "$(timestamp) FAIL ${JOB_NAME}: HTTP ${HTTP_CODE}"
  sed 's/^/response: /' "$RESPONSE_FILE"
} >> "$LOG_FILE"

if [ -n "$UPTIME_KUMA_PUSH_URL" ]; then
  curl --silent --show-error --max-time 30 "${UPTIME_KUMA_PUSH_URL}?status=down&msg=${JOB_NAME}%20failed%20HTTP%20${HTTP_CODE}" >/dev/null || true
fi

exit 1
