export function getRateLimitIdentifier(headers: Headers, userId?: string): string {
  if (userId) {
    return `user:${userId}`;
  }

  const cloudflareIp = headers.get("cf-connecting-ip")?.trim();
  if (cloudflareIp) {
    return `ip:${cloudflareIp}`;
  }

  const forwardedFor = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwardedFor) {
    return `ip:${forwardedFor}`;
  }

  return "ip:unknown";
}
