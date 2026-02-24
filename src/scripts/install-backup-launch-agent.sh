#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"

LAUNCH_AGENT_LABEL="${LAUNCH_AGENT_LABEL:-com.turkishdictionary.postgres.backup}"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
LAUNCH_AGENT_PATH="$LAUNCH_AGENTS_DIR/${LAUNCH_AGENT_LABEL}.plist"
BACKUP_SCRIPT="$PROJECT_ROOT/scripts/postgres-weekly-backup.sh"
BACKUP_HOUR="${BACKUP_HOUR:-9}"
BACKUP_MINUTE="${BACKUP_MINUTE:-0}"
LOG_DIR="${LOG_DIR:-$PROJECT_ROOT/backups/postgres}"

ENV_FILE="${ENV_FILE:-$PROJECT_ROOT/.env.production.local}"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/backups/postgres}"
BACKUP_PREFIX="${BACKUP_PREFIX:-aiven-postgres}"
PG_DUMP_BIN="${PG_DUMP_BIN:-pg_dump}"
RETENTION_WEEKS="${RETENTION_WEEKS:-0}"

validate_range() {
  local value="$1" min="$2" max="$3" field="$4"
  if ! [[ "$value" =~ ^[0-9]+$ ]] || ((value < min || value > max)); then
    printf 'Invalid %s: %s (expected %s-%s)\n' "$field" "$value" "$min" "$max" >&2
    exit 1
  fi
}

validate_range "$BACKUP_HOUR" 0 23 "BACKUP_HOUR"
validate_range "$BACKUP_MINUTE" 0 59 "BACKUP_MINUTE"

mkdir -p "$LAUNCH_AGENTS_DIR" "$LOG_DIR"

cat >"$LAUNCH_AGENT_PATH" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LAUNCH_AGENT_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>${BACKUP_SCRIPT}</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>ENV_FILE</key>
    <string>${ENV_FILE}</string>
    <key>BACKUP_DIR</key>
    <string>${BACKUP_DIR}</string>
    <key>BACKUP_PREFIX</key>
    <string>${BACKUP_PREFIX}</string>
    <key>PG_DUMP_BIN</key>
    <string>${PG_DUMP_BIN}</string>
    <key>RETENTION_WEEKS</key>
    <string>${RETENTION_WEEKS}</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Weekday</key>
    <integer>0</integer>
    <key>Hour</key>
    <integer>${BACKUP_HOUR}</integer>
    <key>Minute</key>
    <integer>${BACKUP_MINUTE}</integer>
  </dict>
  <key>WorkingDirectory</key>
  <string>${PROJECT_ROOT}</string>
  <key>StandardOutPath</key>
  <string>${LOG_DIR}/launchd.out.log</string>
  <key>StandardErrorPath</key>
  <string>${LOG_DIR}/launchd.err.log</string>
</dict>
</plist>
EOF

uid="$(id -u)"
launchctl bootout "gui/$uid" "$LAUNCH_AGENT_PATH" >/dev/null 2>&1 || true
launchctl bootstrap "gui/$uid" "$LAUNCH_AGENT_PATH"
launchctl enable "gui/$uid/$LAUNCH_AGENT_LABEL" >/dev/null 2>&1 || true

printf 'Installed LaunchAgent: %s\n' "$LAUNCH_AGENT_PATH"
printf 'Schedule: Sundays at %02d:%02d + on every boot/login.\n' "$BACKUP_HOUR" "$BACKUP_MINUTE"
printf 'Logs: %s\n' "$LOG_DIR"

