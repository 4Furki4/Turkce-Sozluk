/** @jest-environment node */

import {
  GET as getRootMetadata,
  HEAD as headRootMetadata,
} from "@/src/app/.well-known/oauth-protected-resource/route";
import {
  GET as getTrpcMetadata,
  HEAD as headTrpcMetadata,
} from "@/src/app/.well-known/oauth-protected-resource/[...resource]/route";

const trpcParams = Promise.resolve({ resource: ["api", "trpc"] });

describe("/.well-known/oauth-protected-resource route", () => {
  it("describes the site resource and its authorization server", async () => {
    const response = getRootMetadata();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("application/json");
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(body.resource).toMatch(/^https?:\/\//);
    expect(body.authorization_servers).toEqual([body.resource]);
    expect(body.scopes_supported).toEqual(["api"]);
    expect(body.bearer_methods_supported).toEqual(["header"]);
  });

  it("serves resource-specific metadata for the protected tRPC endpoint", async () => {
    const response = await getTrpcMetadata(new Request("https://example.com"), {
      params: trpcParams,
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.resource).toMatch(/\/api\/trpc$/);
    expect(body.authorization_servers).toHaveLength(1);
  });

  it("returns discovery headers without a body for HEAD requests", async () => {
    const rootResponse = headRootMetadata();
    const trpcResponse = await headTrpcMetadata(new Request("https://example.com"), {
      params: trpcParams,
    });

    expect(rootResponse.headers.get("Cache-Control")).toBe("public, max-age=3600");
    expect(await rootResponse.text()).toBe("");
    expect(trpcResponse.status).toBe(200);
    expect(await trpcResponse.text()).toBe("");
  });
});
