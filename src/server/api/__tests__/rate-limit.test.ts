import { getRateLimitIdentifier } from "../rate-limit-utils";

describe("getRateLimitIdentifier", () => {
  it("uses the authenticated user before a network identifier", () => {
    const headers = new Headers({ "cf-connecting-ip": "203.0.113.5" });

    expect(getRateLimitIdentifier(headers, "user-123")).toBe("user:user-123");
  });

  it("prefers Cloudflare's client IP header", () => {
    const headers = new Headers({
      "cf-connecting-ip": "203.0.113.5",
      "x-forwarded-for": "198.51.100.7, 10.0.0.2",
    });

    expect(getRateLimitIdentifier(headers)).toBe("ip:203.0.113.5");
  });

  it("uses only the first forwarded IP when Cloudflare's header is unavailable", () => {
    const headers = new Headers({ "x-forwarded-for": "198.51.100.7, 10.0.0.2" });

    expect(getRateLimitIdentifier(headers)).toBe("ip:198.51.100.7");
  });

  it("keeps unidentified traffic in one conservative bucket", () => {
    expect(getRateLimitIdentifier(new Headers())).toBe("ip:unknown");
  });
});
