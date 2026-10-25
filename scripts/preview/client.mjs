export class ApiError extends Error {
  constructor(service, status) {
    // Never include response bodies: Coolify validation errors may echo secrets.
    super(`${service} API request failed (HTTP ${status})`);
    this.status = status;
  }
}

export function jsonClient({ baseUrl, token, service, fetchImpl = fetch, headers = {} }) {
  const base = new URL(baseUrl);
  if (base.protocol !== "https:" || base.username || base.password || base.search || base.hash || !["", "/"].includes(base.pathname)) {
    throw new Error(`${service} must use an HTTPS origin without credentials or a path`);
  }
  if (!token) throw new Error(`${service} API token is missing`);
  return async (path, { method = "GET", body, missing = false } = {}) => {
    if (!path.startsWith("/")) throw new Error("API path must be absolute");
    let response;
    try {
      response = await fetchImpl(`${base.origin}${path}`, {
        method, redirect: "error", signal: AbortSignal.timeout(30_000),
        headers: { accept: "application/json", authorization: `Bearer ${token}`, ...headers, ...(body ? { "content-type": "application/json" } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    } catch { throw new Error(`${service} API is unreachable or timed out`); }
    if (missing && response.status === 404) return null;
    if (!response.ok) throw new ApiError(service, response.status);
    if (response.status === 204) return null;
    try { return await response.json(); } catch { throw new Error(`${service} returned an invalid JSON response`); }
  };
}
