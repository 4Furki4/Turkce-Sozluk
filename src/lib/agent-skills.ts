import { createHash } from "crypto";
import { getBaseUrl } from "@/src/lib/seo-utils";

const SKILL_PATH = "/.well-known/agent-skills/turkish-dictionary-api/SKILL.md";

export const TURKISH_DICTIONARY_API_SKILL = [
  "---",
  "name: turkish-dictionary-api",
  "description: Search Turkish Dictionary, navigate public dictionary pages, and authenticate to protected tRPC operations.",
  "---",
  "",
  "# Turkish Dictionary API",
  "",
  "Use this skill to find Turkish words and interact with Turkish Dictionary.",
  "",
  "## Public resources",
  "",
  "- Turkish search: `/tr/arama/{term}`",
  "- English search: `/en/search/{term}`",
  "- Health check: `/api/health`",
  "- API catalog: `/.well-known/api-catalog`",
  "",
  "## Authentication",
  "",
  "Protected tRPC operations require an OAuth access token with the `api` scope.",
  "",
  "1. Read `/auth.md` and `/.well-known/openid-configuration`.",
  "2. Register an OAuth client with the advertised registration endpoint.",
  "3. Use authorization code flow with S256 PKCE and request `openid api`.",
  "4. Send the issued token in the `Authorization: Bearer ACCESS_TOKEN` header to `/api/trpc`.",
  "",
  "Do not request access beyond the user-approved scope or attempt administrative actions without an authorized administrator account.",
  "",
].join("\n");

export function createAgentSkillsIndex(issuer = getBaseUrl()) {
  return {
    $schema: "https://schemas.agentskills.io/discovery/0.2.0/schema.json",
    skills: [
      {
        name: "turkish-dictionary-api",
        type: "skill-md",
        description:
          "Search Turkish Dictionary, navigate public dictionary pages, and authenticate to protected tRPC operations.",
        url: `${issuer}${SKILL_PATH}`,
        digest: `sha256:${createHash("sha256").update(TURKISH_DICTIONARY_API_SKILL).digest("hex")}`,
      },
    ],
  };
}

export { SKILL_PATH };
