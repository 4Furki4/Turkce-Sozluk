import { readFileSync } from "node:fs";
import { credential } from "./identity.mjs";

const integrationSource = readFileSync(new URL("./integrations.mjs", import.meta.url), "utf8");

export function previewCompose({ identity, images, sha, secret, sharedKeys = [] }) {
  const authSecret = credential(secret, identity, "auth");
  const upstashToken = credential(secret, identity, "upstash");
  const middleware = `${identity.name}-headers`;
  // Coolify seeds these defaults once with firstOrCreate, retaining UI edits
  // on later parses. Shared references resolve in the dedicated previews scope.
  const editable = (key, fallback = "") => `\${${key}:-${fallback}}`;
  const sharedDefault = (key, fallback) => editable(key, sharedKeys.includes(key) ? `{{environment.${key}}}` : fallback);
  const appEnvironment = {
    NODE_ENV: "production", HOSTNAME: "0.0.0.0", PORT: "3000",
    ...Object.fromEntries(DATABASE_KEYS.map(key => [key, editable(key, `{{environment.${key}}}`)])),
    AUTH_SECRET: editable("AUTH_SECRET", authSecret), BETTER_AUTH_SECRET: "${AUTH_SECRET}", BETTER_AUTH_URL: identity.url,
    NEXT_PUBLIC_APP_URL: identity.url, NEXT_PUBLIC_URL: identity.url,
    ...Object.fromEntries(Object.entries(SHARED_RUNTIME_DEFAULTS).map(([key, fallback]) => [key,
      sharedDefault(key, fallback),
    ])),
    CRON_SECRET: editable("CRON_SECRET", credential(secret, identity, "cron")),
    UPSTASH_REDIS_REST_URL: sharedDefault("UPSTASH_REDIS_REST_URL", "http://integrations:8179"),
    UPSTASH_REDIS_REST_TOKEN: sharedDefault("UPSTASH_REDIS_REST_TOKEN", upstashToken),
  };
  return {
    networks: { development: { external: true, name: "dictionary-preview-development" } },
    services: {
      app: {
        image: images.app, restart: "unless-stopped", environment: appEnvironment,
        networks: ["development"],
        depends_on: { integrations: { condition: "service_started" } },
        mem_limit: "768m", cpus: 1,
        healthcheck: {
          test: ["CMD", "node", "-e", "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"],
          interval: "15s", timeout: "5s", retries: 12, start_period: "30s",
        },
        labels: {
          [`traefik.http.middlewares.${middleware}.headers.customresponseheaders.X-Robots-Tag`]: "noindex, nofollow",
          [`traefik.http.middlewares.${middleware}.headers.customresponseheaders.X-Preview-Commit`]: sha,
          "coolify.traefik.middlewares": middleware,
          "com.centurylinklabs.watchtower.enable": "false",
        },
      },
      integrations: {
        image: images.app, command: ["node", "--input-type=module", "-e", integrationSource],
        restart: "unless-stopped",
        environment: { PREVIEW_UPSTASH_TOKEN: appEnvironment.UPSTASH_REDIS_REST_TOKEN }, mem_limit: "64m", cpus: 0.25,
        labels: { "com.centurylinklabs.watchtower.enable": "false" },
      },
    },
  };
}

export const DATABASE_KEYS = ["DATABASE_URL", "DATABASE_HOST", "DATABASE_PORT", "DATABASE_USERNAME", "DATABASE_PASSWORD", "DATABASE_DATABASE"];

export const SHARED_RUNTIME_DEFAULTS = {
  AUTH_DISCORD_ID: "preview-disabled", AUTH_DISCORD_SECRET: "preview-disabled",
  AUTH_GOOGLE_ID: "preview-disabled", AUTH_GOOGLE_SECRET: "preview-disabled",
  AUTH_GITHUB_ID: "", AUTH_GITHUB_SECRET: "", RECAPTCHA_SECRET_KEY: "preview-disabled",
  MEILI_HOST: "", MEILI_MASTER_KEY: "", RESEND_API_KEY: "", RESEND_EMAIL_FROM: "",
  S3_API_URL: "", R2_ACCESS_KEY_ID: "", R2_SECRET_ACCESS_KEY: "", R2_BUCKET_NAME: "", UPLOADTHING_TOKEN: "", VALKEY_URL: "",
};
