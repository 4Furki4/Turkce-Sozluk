#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$PROJECT_ROOT/.env.development.pi}"
COMPOSE_FILE="${COMPOSE_FILE:-$PROJECT_ROOT/docker-compose.development.yml}"
SERVICE="${SERVICE:-db-development}"

if [[ ! -f "$ENV_FILE" ]]; then
  printf 'Missing required file: %s\n' "$ENV_FILE" >&2
  exit 1
fi

if [[ "${CONFIRM_SANITIZE_DEVELOPMENT_DB:-}" != "yes" ]]; then
  printf 'Refusing to sanitize without CONFIRM_SANITIZE_DEVELOPMENT_DB=yes\n' >&2
  exit 1
fi

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T "$SERVICE" \
  sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" psql -v ON_ERROR_STOP=1 -h 127.0.0.1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' <<'SQL'
BEGIN;

TRUNCATE TABLE
  accounts,
  session,
  verification,
  saved_words,
  user_search_history,
  search_logs,
  feedback_votes,
  feedbacks,
  foreign_term_suggestion_votes,
  foreign_term_suggestions,
  game_scores,
  pronunciation_votes,
  pronunciations,
  users_to_badges,
  request_votes,
  requests,
  contribution_logs
RESTART IDENTITY CASCADE;

WITH numbered_users AS (
  SELECT id, row_number() OVER (ORDER BY created_at, id) AS n
  FROM users
)
UPDATE users
SET
  email = concat('dev-user-', numbered_users.n, '@example.invalid'),
  name = concat('Development User ', numbered_users.n),
  username = concat('dev-user-', numbered_users.n),
  image = NULL,
  email_verified = false,
  "emailVerifiedTimestamp" = NULL,
  banned = false,
  ban_reason = NULL,
  ban_expires = NULL,
  points = 0,
  role = 'user'
FROM numbered_users
WHERE users.id = numbered_users.id;

COMMIT;
SQL
