/** Shareable list state is untrusted URL data. Keep only the expected shape. */
export function parseListState<T extends object>(
  raw: string | null,
  defaults: T,
): T {
  const merge = (candidate: unknown, baseline: unknown): unknown => {
    if (baseline === null)
      return candidate === null ||
        (typeof candidate === "string" &&
          Number.isFinite(Date.parse(candidate)))
        ? candidate
        : null;
    if (Array.isArray(baseline))
      return Array.isArray(candidate) &&
        candidate.every((item) => typeof item === "string")
        ? candidate
        : baseline;
    if (typeof baseline === "number")
      return typeof candidate === "number" &&
        Number.isSafeInteger(candidate) &&
        candidate > 0
        ? candidate
        : baseline;
    if (typeof baseline === "string" || typeof baseline === "boolean")
      return typeof candidate === typeof baseline ? candidate : baseline;
    if (baseline && typeof baseline === "object") {
      const record =
        candidate && typeof candidate === "object" && !Array.isArray(candidate)
          ? (candidate as Record<string, unknown>)
          : {};
      return Object.fromEntries(
        Object.entries(baseline).map(([key, value]) => [
          key,
          merge(record[key], value),
        ]),
      );
    }
    return baseline;
  };
  try {
    return merge(JSON.parse(raw ?? "null"), defaults) as T;
  } catch {
    return defaults;
  }
}
