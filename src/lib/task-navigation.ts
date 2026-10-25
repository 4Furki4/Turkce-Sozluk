import { getSafeAuthReturnUrl } from "./play-url";

import { taskPathnames } from "@/src/i18n/task-pathnames";
const templates = [
  ...Object.values(taskPathnames).flatMap((route) => [route.en, route.tr]),
  "/contribute-word",
  "/kelime-katkisi",
  "/dashboard/create-word",
  "/panel/kelime-ekle",
  "/dashboard/announcements/new",
  "/panel/duyurular/yeni",
  "/dashboard/announcements/[id]/edit",
  "/panel/duyurular/[id]/duzenle",
  "/feedback/new",
  "/geri-bildirim/yeni",
];
const taskPatterns = templates.map(
  (path) =>
    new RegExp(
      "^" +
        path
          .replace(/[.*+?^${}()|\\]/g, "\\$&")
          .replace(/\[[^\]]+\]/g, "[^/]+") +
        "/?$",
    ),
);
export function isTaskPath(pathname: string): boolean {
  try {
    pathname = decodeURI(pathname);
  } catch {
    return false;
  }
  return taskPatterns.some((pattern) =>
    pattern.test(pathname.replace(/^\/(en|tr)(?=\/|$)/, "")),
  );
}

/** Selection pages are safe intermediate steps; unfinished editors are not. */
export function isTaskChooserPath(pathname: string): boolean {
  const path = pathname.replace(/^\/(en|tr)(?=\/|$)/, "").replace(/\/$/, "");
  return [
    taskPathnames["/contribute-word/[wordId]"],
    taskPathnames["/pronunciation-voting/new"],
  ].some((route) =>
    [route.en, route.tr].some((template) =>
      new RegExp("^" + template.replace("[wordId]", "[1-9]\\d*") + "$").test(
        path,
      ),
    ),
  );
}

/** Parameters from URLSearchParams have already been decoded once. */
export function resolveTaskReturn(
  value: string | null,
  fallback: string,
  origin: string,
  currentPath?: string,
): string {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\u0000-\u0020]/.test(value)
  )
    return fallback;
  const safe = getSafeAuthReturnUrl(value, origin);
  if (!safe) return fallback;
  const path = new URL(safe, origin).pathname;
  if (
    (currentPath && path === new URL(currentPath, origin).pathname) ||
    (isTaskPath(path) && !isTaskChooserPath(path)) ||
    /%(?:2f|5c|00)/i.test(path)
  )
    return fallback;
  // Old/direct editor URLs may still carry the original word/list as returnTo.
  // Keep that context behind the parent chooser instead of skipping the step.
  if (
    isTaskChooserPath(new URL(fallback, origin).pathname) &&
    !isTaskChooserPath(path)
  )
    return withTaskReturn(fallback, safe);
  return safe;
}

export function withTaskReturn(task: string, source: string): string {
  const url = new URL(task, "https://task.invalid");
  url.searchParams.set("returnTo", source);
  return `${url.pathname}${url.search}${url.hash}`;
}

// Only record navigation observed in this document. A pasted link, reload, or
// new tab cannot establish what the preceding browser history entry contains.
let currentLocation: string | null = null;
let previousLocation: string | null = null;
export function recordTaskLocation(location: string) {
  if (location !== currentLocation) {
    previousLocation = currentLocation;
    currentLocation = location;
  }
}
export function canReturnThroughHistory(location: string, target: string) {
  return currentLocation === location && previousLocation === target;
}

export const TASK_DRAFT_VERSION = 1;
export const TASK_DRAFT_MAX_AGE = 24 * 60 * 60 * 1000;
export interface TaskDraft<T> {
  version: number;
  savedAt: number;
  revision: string;
  values: T;
}
export function readTaskDraft<T>(
  raw: string | null,
  now = Date.now(),
): TaskDraft<T> | null {
  try {
    const value = JSON.parse(raw ?? "null") as TaskDraft<T> | null;
    return value?.version === TASK_DRAFT_VERSION &&
      typeof value.savedAt === "number" &&
      now - value.savedAt < TASK_DRAFT_MAX_AGE &&
      now >= value.savedAt &&
      typeof value.revision === "string" &&
      value.values != null
      ? value
      : null;
  } catch {
    return null;
  }
}

/** Drop media resources instead of recovering invalid serialized File/Blob placeholders. */
export function textDraftValues<T>(value: T): T {
  const clean = (item: unknown): unknown => {
    if (typeof Blob !== "undefined" && item instanceof Blob) return undefined;
    if (item instanceof Date) return item.toISOString();
    if (Array.isArray(item))
      return item.map(clean).filter((value) => value !== undefined);
    if (item && typeof item === "object")
      return Object.fromEntries(
        Object.entries(item)
          .map(([key, value]) => [key, clean(value)])
          .filter(([, value]) => value !== undefined),
      );
    return typeof item === "function" || typeof item === "symbol"
      ? undefined
      : item;
  };
  return clean(value) as T;
}
