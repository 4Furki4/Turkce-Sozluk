/** @jest-environment node */

import { GET, HEAD } from "@/src/app/.well-known/mcp/server-card.json/route";

describe("/.well-known/mcp/server-card.json route", () => {
  it("returns MCP server discovery metadata", async () => {
    const response = GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("application/json");
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(body.serverInfo).toEqual({
      name: "Turkish Dictionary",
      version: "0.1.0",
    });
    expect(body.transport).toEqual({
      type: "streamable-http",
      endpoint: expect.stringContaining("/mcp"),
    });
    expect(body.capabilities).toEqual({
      tools: false,
      resources: false,
      prompts: false,
    });
    expect(body.remotes).toEqual([
      {
        type: "streamable-http",
        url: body.transport.endpoint,
      },
    ]);
  });

  it("returns discovery headers without a body for HEAD requests", async () => {
    const response = HEAD();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("application/json");
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=3600");
    expect(await response.text()).toBe("");
  });
});
