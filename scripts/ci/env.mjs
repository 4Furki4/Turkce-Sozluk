import { readFileSync } from "node:fs";

// Never let Next.js/Bun fill missing CI variables from a developer's .env files.
// Only names are used; values from those files never enter the test environment.
/** @returns {Record<string, string> & {NODE_ENV: "production"}} */
export function ciEnvironment() {
  const environment = {};
  for (const name of ["PATH", "HOME", "TMPDIR", "CI", "NODE_OPTIONS", "PLAYWRIGHT_BROWSERS_PATH", "BUN_INSTALL_CACHE_DIR"]) {
    if (process.env[name]) environment[name] = process.env[name];
  }
  for (const file of [".env", ".env.local", ".env.production", ".env.production.local"]) {
    let source;
    try { source = readFileSync(file, "utf8"); } catch (error) {
      if (error.code === "ENOENT") continue;
      throw error;
    }
    for (const match of source.matchAll(/^\s*(?:export\s+)?([\w]+)\s*=/gm)) {
      environment[match[1]] = "";
    }
  }
  return {
    ...environment,
    NODE_ENV: "production",
    NEXT_TELEMETRY_DISABLED: "1",
    AUTH_SECRET: "ci-only-auth-secret-at-least-thirty-two-characters",
    AUTH_DISCORD_ID: "ci-discord-id",
    AUTH_DISCORD_SECRET: "ci-discord-secret",
    AUTH_GOOGLE_ID: "ci-google-id",
    AUTH_GOOGLE_SECRET: "ci-google-secret",
    CRON_SECRET: "ci-only-cron-secret",
    DATABASE_URL: "postgresql://postgres:ci-only-password@127.0.0.1:54329/turkish_dictionary_ci?sslmode=disable",
    DATABASE_HOST: "127.0.0.1",
    DATABASE_PORT: "54329",
    DATABASE_USERNAME: "postgres",
    DATABASE_PASSWORD: "ci-only-password",
    DATABASE_DATABASE: "turkish_dictionary_ci",
    BETTER_AUTH_SECRET: "ci-only-auth-secret-at-least-thirty-two-characters",
    BETTER_AUTH_URL: "http://localhost:3100",
    NEXT_PUBLIC_APP_URL: "http://localhost:3100",
    NEXT_PUBLIC_URL: "http://localhost:3100",
    NEXT_PUBLIC_RECAPTCHA_SITE_KEY: "ci-recaptcha-site-key",
    RECAPTCHA_SECRET_KEY: "ci-recaptcha-secret",
    UPSTASH_REDIS_REST_URL: "http://127.0.0.1:8179",
    UPSTASH_REDIS_REST_TOKEN: "ci-upstash-token",
    RESEND_API_KEY: "re_ci_only",
    NEXT_PUBLIC_R2_CUSTOM_URL: "http://localhost:3100",
  };
}
