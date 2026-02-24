#!/usr/bin/env bash
set -Eeuo pipefail

LAUNCH_AGENT_LABEL="${LAUNCH_AGENT_LABEL:-com.turkishdictionary.postgres.backup}"
LAUNCH_AGENT_PATH="$HOME/Library/LaunchAgents/${LAUNCH_AGENT_LABEL}.plist"

uid="$(id -u)"
launchctl bootout "gui/$uid" "$LAUNCH_AGENT_PATH" >/dev/null 2>&1 || true
rm -f "$LAUNCH_AGENT_PATH"

printf 'Removed LaunchAgent: %s\n' "$LAUNCH_AGENT_PATH"

