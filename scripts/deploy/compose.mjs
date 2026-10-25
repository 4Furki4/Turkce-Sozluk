export const IMAGE_REPOSITORY = "furki4/turkish-dictionary-app";
export const DEVELOPMENT_URL = "https://development.turkce-sozluk.com";

export function validateDigest(digest) {
  if (typeof digest !== "string" || !/^sha256:[a-f0-9]{64}$/.test(digest)) throw new Error("A published SHA256 image digest is required");
  return digest;
}

export function readinessMarker({ digest, nonce }) {
  validateDigest(digest);
  if (typeof nonce !== "string" || !/^[a-f0-9]{64}$/.test(nonce)) throw new Error("A fresh 32-byte deployment nonce is required");
  return `DICTIONARY_DEVELOPMENT_READY nonce=${nonce} digest=${digest}`;
}

export function readinessCommand({ digest, nonce }) {
  const marker = readinessMarker({ digest, nonce });
  // Repeated timestamped checks survive log bursts and prevent a historical
  // startup line from being mistaken for current application/database health.
  return `const fs = require("node:fs");
(async () => {
  if (process.env.COOLIFY_DEPLOY_NONCE !== ${JSON.stringify(nonce)} || process.env.COOLIFY_DEPLOY_DIGEST !== ${JSON.stringify(digest)}) throw new Error("deployment identity mismatch");
  const response = await fetch("http://127.0.0.1:3000/api/health", { cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error("unhealthy");
  const body = await response.json();
  if (body.status !== "ok" || body.checks?.app !== "ok" || body.checks?.database !== "ok") throw new Error("unhealthy");
  fs.appendFileSync("/proc/1/fd/1", ${JSON.stringify(marker)} + " checkedAt=" + Date.now() + "\\n");
})().catch(() => process.exit(1));`;
}

export function developmentCompose({ digest, nonce, publishPort = true }) {
  validateDigest(digest);
  const healthCommand = readinessCommand({ digest, nonce });
  if (typeof publishPort !== "boolean") throw new Error("publishPort must be boolean");
  return {
    services: {
      app: {
        image: `${IMAGE_REPOSITORY}@${digest}`,
        restart: "unless-stopped",
        init: true,
        security_opt: ["no-new-privileges:true"],
        cap_drop: ["ALL"],
        tmpfs: ["/tmp"],
        mem_limit: "768m",
        cpus: 1,
        logging: { driver: "json-file", options: { "max-size": "10m", "max-file": "3" } },
        labels: { "com.centurylinklabs.watchtower.enable": "false" },
        // Coolify injects the saved service .env. Keeping only these owned values
        // here leaves all database/provider settings under the runtime editor.
        environment: {
          NODE_ENV: "production", HOSTNAME: "0.0.0.0", PORT: "3000",
          BETTER_AUTH_URL: DEVELOPMENT_URL,
          NEXT_PUBLIC_APP_URL: DEVELOPMENT_URL, NEXT_PUBLIC_URL: DEVELOPMENT_URL,
          COOLIFY_DEPLOY_NONCE: nonce, COOLIFY_DEPLOY_DIGEST: digest,
        },
        ...(publishPort ? { ports: ["127.0.0.1:3002:3000"] } : {}),
        networks: ["development"],
        healthcheck: { test: ["CMD", "node", "-e", healthCommand], interval: "10s", timeout: "10s", retries: 6, start_period: "30s" },
      },
    },
    networks: { development: { name: "turkce-sozluk_default", external: true } },
  };
}
