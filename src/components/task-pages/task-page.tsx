"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import NextLink from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { Button, Spinner } from "@heroui/react";
import { cn } from "@/lib/utils";
import { getPathname } from "@/src/i18n/routing";
import { useHasHydrated } from "@/src/hooks/use-has-hydrated";
import { useProgressRouter } from "@/src/hooks/use-progress-router";
import {
  canReturnThroughHistory,
  isTaskChooserPath,
  replaceTaskLocation,
  resolveTaskReturn,
} from "@/src/lib/task-navigation";
import { authClient } from "@/src/lib/auth-client";
import { api } from "@/src/trpc/react";

interface TaskActions {
  complete: () => void;
  cancel: () => void;
  replaceSearchParams: (query: URLSearchParams) => void;
  setDirty: (dirty: boolean) => void;
  registerClear: (clear: () => void) => () => void;
}
const Context = createContext<TaskActions>({
  complete() {},
  cancel() {},
  replaceSearchParams() {},
  setDirty() {},
  registerClear: () => () => {},
});
export const useTaskActions = () => useContext(Context);
export type TaskHref = Parameters<typeof getPathname>[0]["href"];
export function useTaskHref(href: TaskHref) {
  const locale = useLocale() as "en" | "tr";
  return getPathname({ locale, href });
}

export function TaskPage({
  title,
  parent,
  parentLabel,
  children,
  ancestors,
  breadcrumbLabel,
  description,
  capability = "signed-in",
  media = false,
  initialUser,
  className,
  hideTitle = false,
}: {
  title: string;
  parent: TaskHref;
  parentLabel: string;
  children: ReactNode;
  ancestors?: { href: TaskHref; label: string }[];
  breadcrumbLabel?: string;
  description?: string;
  capability?: "public" | "signed-in" | "admin";
  media?: boolean;
  initialUser?: { id: string; role?: string | null };
  className?: string;
  hideTitle?: boolean;
}) {
  const t = useTranslations("TaskPage");
  const locale = useLocale() as "en" | "tr";
  const fallback = useTaskHref(parent);
  const dashboard = useTaskHref("/dashboard");
  const pathname = usePathname();
  const search = useSearchParams();
  const router = useProgressRouter();
  const utils = api.useUtils();
  const session = authClient.useSession();
  const hasHydrated = useHasHydrated();
  // A server-gated task can render while Better Auth starts its client session.
  const useInitialUser = initialUser && (!hasHydrated || session.isPending);
  const awaitingHydration = Boolean(initialUser) && !hasHydrated;
  const user = useInitialUser ? initialUser : session.data?.user;
  const waitingForSession = session.isPending && !useInitialUser;
  const [dirty, setDirty] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<{
    run: () => void;
  } | null>(null);
  const [offline, setOffline] = useState(false);
  const [generation, setGeneration] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const leavePanel = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);
  const clears = useRef(new Set<() => void>());
  const startUrl = useRef("");
  const returnTo = resolveTaskReturn(
    search.get("returnTo"),
    fallback,
    typeof window === "undefined"
      ? "https://task.invalid"
      : window.location.origin,
    pathname,
  );
  const sameParent = returnTo.split(/[?#]/)[0] === fallback.split(/[?#]/)[0];
  const sourceLabel = sameParent
    ? parentLabel
    : /\/(saved-words|kaydedilen-kelimeler)(?:[?#]|$)/.test(returnTo)
      ? t("savedWords")
      : /\/(search|arama)(?:\/|[?#]|$)/.test(returnTo)
        ? t("search")
        : t("source");
  useEffect(() => {
    mounted.current = true;
    startUrl.current = window.location.pathname + window.location.search;
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      mounted.current = false;
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, [pathname, search]);
  useEffect(() => {
    document.title = title;
  }, [title]);
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);
  const navigate = useCallback(
    (target: string) => {
      const current =
        window.location.pathname +
        window.location.search +
        window.location.hash;
      if (canReturnThroughHistory(current, target)) router.back();
      else router.replace(target);
    },
    [router],
  );
  const requestNavigation = useCallback(
    (run: () => void) => {
      if (dirty) setPendingNavigation({ run });
      else run();
    },
    [dirty],
  );
  const leave = useCallback(
    (target: string) => requestNavigation(() => navigate(target)),
    [navigate, requestNavigation],
  );
  const replaceSearchParams = useCallback(
    (query: URLSearchParams) => {
      requestNavigation(() => {
        const { pathname, search, hash } = window.location;
        const current = `${pathname}${search}${hash}`;
        const target = `${pathname}${query.size ? `?${query}` : ""}${hash}`;
        if (current === target) return;
        // Next syncs useSearchParams without navigating away from the task.
        window.history.replaceState(null, "", target);
        replaceTaskLocation(current, target);
      });
    },
    [requestNavigation],
  );
  useEffect(() => {
    if (pendingNavigation) {
      leavePanel.current?.scrollIntoView({ block: "center" });
      leavePanel.current?.focus();
    }
  }, [pendingNavigation]);
  useEffect(() => {
    if (!dirty) return;
    const guard = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const anchor = (event.target as Element)?.closest?.("a");
      if (
        !anchor ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download")
      )
        return;
      const target = new URL(anchor.href, window.location.href);
      if (
        target.origin !== window.location.origin ||
        !mounted.current ||
        window.location.pathname + window.location.search !== startUrl.current
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      leave(target.pathname + target.search + target.hash);
    };
    document.addEventListener("click", guard, true);
    return () => document.removeEventListener("click", guard, true);
  }, [dirty, leave]);
  const complete = useCallback(async () => {
    clears.current.forEach((clear) => clear());
    setDirty(false);
    setFinishing(true);
    try {
      await utils.invalidate();
    } finally {
      setFinishing(false);
      // A late response must not pull someone away from a different page.
      if (
        mounted.current &&
        window.location.pathname + window.location.search === startUrl.current
      ) {
        setGeneration((value) => value + 1);
        navigate(returnTo);
      }
    }
  }, [utils, returnTo, navigate]);
  const registerClear = useCallback((clear: () => void) => {
    clears.current.add(clear);
    return () => {
      clears.current.delete(clear);
    };
  }, []);
  const taskUrl = `${pathname}${search.size ? `?${search}` : ""}`;
  const signin = getPathname({
    locale,
    href: { pathname: "/signin", query: { backTo: taskUrl } },
  });
  const denied =
    capability !== "public" &&
    !waitingForSession &&
    (!user || (capability === "admin" && user.role !== "admin"));
  return (
    <Context.Provider
      value={{
        complete,
        cancel: () => leave(returnTo),
        replaceSearchParams,
        setDirty,
        registerClear,
      }}
    >
      <section
        className={cn("mx-auto w-full max-w-5xl space-y-6 px-3 py-5 sm:space-y-8 sm:px-6 sm:py-8", className)}
        onChangeCapture={() => { if (!isTaskChooserPath(pathname)) setDirty(true); }}
      >
        <header className="min-w-0 space-y-5 sm:space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-divider pb-3">
            <NextLink
              data-task-back
              href={returnTo}
              onClick={(event) => {
                if (
                  event.metaKey ||
                  event.ctrlKey ||
                  event.shiftKey ||
                  event.button !== 0
                )
                  return;
                event.preventDefault();
                leave(returnTo);
              }}
              className="inline-flex min-h-11 min-w-0 max-w-full items-center gap-2 rounded-md text-sm font-medium text-foreground/70 transition-colors hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
              <ArrowLeft aria-hidden className="h-4 w-4 shrink-0" />
              <span className="min-w-0 [overflow-wrap:anywhere]">
                {t("back", { destination: sourceLabel })}
              </span>
            </NextLink>
            <nav aria-label={t("breadcrumbs")} className="min-w-0 max-w-full">
              <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-foreground/60">
                {(
                  ancestors ??
                  (fallback.startsWith(dashboard + "/")
                    ? [
                        {
                          href: "/dashboard" as TaskHref,
                          label: t("dashboard"),
                        },
                      ]
                    : [])
                ).map((ancestor, index) => (
                  <li key={index} className="flex min-w-0 items-center gap-2">
                    <NextLink
                      href={getPathname({ locale, href: ancestor.href })}
                      className="inline-flex min-h-11 min-w-0 items-center rounded-sm break-words hover:text-foreground focus-visible:outline focus-visible:outline-primary [overflow-wrap:anywhere]"
                    >
                      {ancestor.label}
                    </NextLink>
                    <ChevronRight
                      aria-hidden
                      className="h-3.5 w-3.5 shrink-0 text-foreground/40"
                    />
                  </li>
                ))}
                <li className="flex min-w-0 items-center gap-2">
                  <NextLink
                    href={sameParent ? returnTo : fallback}
                    className="inline-flex min-h-11 min-w-0 items-center rounded-sm break-words hover:text-foreground focus-visible:outline focus-visible:outline-primary [overflow-wrap:anywhere]"
                  >
                    {parentLabel}
                  </NextLink>
                  <ChevronRight
                    aria-hidden
                    className="h-3.5 w-3.5 shrink-0 text-foreground/40"
                  />
                </li>
                <li
                  aria-current="page"
                  className="min-w-0 font-medium text-foreground/80 [overflow-wrap:anywhere]"
                >
                  {breadcrumbLabel ?? title}
                </li>
              </ol>
            </nav>
          </div>
          <div className="space-y-3">
            <h1 className={hideTitle ? "sr-only" : "max-w-3xl text-2xl font-bold leading-tight text-foreground [overflow-wrap:anywhere] sm:text-3xl"}>
              {title}
            </h1>
            {description && (
              <p className="max-w-2xl text-base leading-relaxed text-foreground/70">
                {description}
              </p>
            )}
          </div>
        </header>
        {pendingNavigation && (
          <div
            ref={leavePanel}
            tabIndex={-1}
            role="alert"
            className="rounded-md border border-warning p-4 space-y-3 bg-background/40"
          >
            <p>{t("leave")}</p>
            <div className="flex flex-wrap gap-2">
              <Button onPress={() => setPendingNavigation(null)}>
                {t("keepEditing")}
              </Button>
              <Button
                color="danger"
                onPress={() => {
                  clears.current.forEach((clear) => clear());
                  setDirty(false);
                  setGeneration((value) => value + 1);
                  setPendingNavigation(null);
                  pendingNavigation.run();
                }}
              >
                {t("discard")}
              </Button>
            </div>
          </div>
        )}
        {offline && <p role="status">{t("offline")}</p>}
        {media && <p className="text-sm text-default-600">{t("media")}</p>}
        <div
          key={`${user?.id ?? "guest"}:${generation}`}
          aria-busy={finishing}
          className="min-w-0 space-y-4 rounded-xl border border-divider bg-background/40 p-3 shadow-sm sm:p-6 lg:p-8"
        >
          <fieldset disabled={finishing || awaitingHydration} className="min-w-0 space-y-4">
            {capability !== "public" && waitingForSession ? (
              <Spinner label={t("loading")} />
            ) : denied ? (
              <div role="alert" className="space-y-3">
                <p>{user ? t("forbidden") : t("signInRequired")}</p>
                {!user && (
                  <NextLink className="text-primary underline" href={signin}>
                    {t("signIn")}
                  </NextLink>
                )}
              </div>
            ) : (
              children
            )}
          </fieldset>
        </div>
      </section>
    </Context.Provider>
  );
}

export function TaskState({
  loading,
  error,
  missing,
  retry,
}: {
  loading?: boolean;
  error?: { message: string } | null;
  missing?: boolean;
  retry?: () => void;
}) {
  const t = useTranslations("TaskPage");
  if (loading) return <Spinner label={t("loading")} />;
  return (
    <div role="alert" className="space-y-3">
      <p>{missing ? t("missing") : t("loadError")}</p>
      {retry && <Button onPress={retry}>{t("retry")}</Button>}
    </div>
  );
}

export function TaskCancel() {
  const t = useTranslations("TaskPage");
  const { cancel } = useTaskActions();
  return (
    <Button
      variant="light"
      className="min-h-11 min-w-0 max-w-full whitespace-normal"
      onPress={cancel}
    >
      {t("cancel")}
    </Button>
  );
}
