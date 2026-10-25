export class ApiError extends Error {
  constructor(service, status) {
    // Validation responses and container logs may contain secrets.
    super(`${service} API request failed (HTTP ${status})`);
    this.status = status;
  }
}

export function jsonClient({ baseUrl, token, service, fetchImpl = fetch, headers = {} }) {
  let base;
  try { base = new URL(baseUrl); } catch { throw new Error(`${service} URL is invalid`); }
  if (base.protocol !== "https:" || base.username || base.password || base.search || base.hash || !["", "/"].includes(base.pathname)) {
    throw new Error(`${service} must use an HTTPS origin without credentials or a path`);
  }
  if (typeof token !== "string" || !token.trim()) throw new Error(`${service} API token is missing`);
  return async (path, { method = "GET", body } = {}) => {
    if (typeof path !== "string" || !path.startsWith("/") || path.startsWith("//")) throw new Error("API path must be absolute");
    let response;
    try {
      response = await fetchImpl(`${base.origin}${path}`, {
        method, redirect: "error", cache: "no-store", signal: AbortSignal.timeout(30_000),
        headers: { accept: "application/json", authorization: `Bearer ${token}`, ...headers, ...(body ? { "content-type": "application/json" } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    } catch { throw new Error(`${service} API is unreachable or timed out`); }
    if (!response.ok) throw new ApiError(service, response.status);
    if (response.status === 204) return null;
    try { return await response.json(); } catch { throw new Error(`${service} returned an invalid JSON response`); }
  };
}
