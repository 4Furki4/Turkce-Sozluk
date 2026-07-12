/** @jest-environment node */

import { GET, HEAD } from "@/src/app/auth.md/route";

describe("/auth.md route", () => {
  it("explains how agents register and use OAuth tokens", async () => {
    const response = GET();
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/markdown");
    expect(body).toContain("# Turkish Dictionary auth.md");
    expect(body).toContain("/.well-known/oauth-protected-resource");
    expect(body).toContain("/api/auth/oauth2/register");
    expect(body).toContain("`openid api`");
    expect(body).toContain("Authorization: Bearer ACCESS_TOKEN");
  });

  it("returns discovery headers without a body for HEAD requests", async () => {
    const response = HEAD();

    expect(response.headers.get("Cache-Control")).toBe("public, max-age=3600");
    expect(await response.text()).toBe("");
  });
});
