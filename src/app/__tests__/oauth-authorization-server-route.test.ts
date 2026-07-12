/** @jest-environment node */

import {
  GET,
  HEAD,
} from "@/src/app/.well-known/oauth-authorization-server/route";

describe("/.well-known/oauth-authorization-server route", () => {
  it("advertises OAuth metadata and agent registration instructions", async () => {
    const response = GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("application/json");
    expect(body.issuer).toMatch(/^https?:\/\//);
    expect(body.protected_resources).toEqual([
      `${body.issuer}/api/trpc`,
    ]);
    expect(body.agent_auth.skill).toBe(`${body.issuer}/auth.md`);
    expect(body.agent_auth.register_uri).toBe(
      `${body.issuer}/api/auth/oauth2/register`,
    );
    expect(body.agent_auth.claim_uri).toBe(
      `${body.issuer}/api/auth/oauth2/authorize`,
    );
    expect(body.agent_auth.identity_types_supported).toEqual(["anonymous"]);
    expect(body.agent_auth.anonymous.credential_types_supported).toEqual([
      "access_token",
    ]);
  });

  it("returns discovery headers without a body for HEAD requests", async () => {
    const response = HEAD();

    expect(response.headers.get("Cache-Control")).toBe("public, max-age=3600");
    expect(await response.text()).toBe("");
  });
});
