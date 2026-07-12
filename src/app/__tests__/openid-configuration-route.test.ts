/** @jest-environment node */

import { GET, HEAD } from "@/src/app/.well-known/openid-configuration/route";

describe("/.well-known/openid-configuration route", () => {
  it("advertises the configured OAuth authorization server", async () => {
    const response = GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("application/json");
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(body.issuer).toMatch(/^https?:\/\//);
    expect(body.authorization_endpoint).toBe(`${body.issuer}/api/auth/oauth2/authorize`);
    expect(body.token_endpoint).toBe(`${body.issuer}/api/auth/oauth2/token`);
    expect(body.jwks_uri).toBe(`${body.issuer}/api/auth/jwks`);
    expect(body.grant_types_supported).toEqual(["authorization_code", "refresh_token"]);
    expect(body.response_types_supported).toEqual(["code"]);
    expect(body.code_challenge_methods_supported).toEqual(["S256"]);
    expect(body.scopes_supported).toEqual(expect.arrayContaining(["openid", "api"]));
  });

  it("returns the discovery headers without a body for HEAD requests", async () => {
    const response = HEAD();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=3600");
    expect(await response.text()).toBe("");
  });
});
