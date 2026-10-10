import { formatDistanceToNow, isValid } from "date-fns";
import { tr } from "date-fns/locale";

export function requestDate(value: Date | string | null | undefined, locale: string) {
  if (!value) return null;
  const date = new Date(value);
  if (!isValid(date)) return null;
  return {
    relative: formatDistanceToNow(date, { addSuffix: true, locale: locale === "tr" ? tr : undefined }),
    dateTime: date.toISOString(),
    title: new Intl.DateTimeFormat(locale, { dateStyle: "long", timeStyle: "short" }).format(date),
  };
}

export function parseRequestPayload(value: unknown): Record<string, unknown> | null {
  let parsed = value;
  if (typeof value === "string") {
    try { parsed = JSON.parse(value); } catch { return null; }
  }
  return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
    ? parsed as Record<string, unknown>
    : null;
}

export function requestErrorKey(code: string | undefined, fallback: "errorLoading" | "errorLoadingDetail" | "messages.cancelFailed") {
  switch (code) {
    case "UNAUTHORIZED": return "messages.sessionExpired";
    case "FORBIDDEN": return "messages.permissionDenied";
    case "TOO_MANY_REQUESTS": return "messages.rateLimited";
    default: return fallback;
  }
}
