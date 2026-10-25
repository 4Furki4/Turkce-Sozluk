"use client";

import NextLink from "next/link";
import { useLocale } from "next-intl";
import { getPathname, Link } from "@/src/i18n/routing";
import { usePathname, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useState,
  type ComponentProps,
  type MouseEvent,
} from "react";

import { type TaskHref } from "./task-page";
import { button, type ButtonVariantProps } from "@heroui/theme";

type Props = Omit<ComponentProps<typeof Link>, "href"> & {
  href: TaskHref;
};
function useTaskSource() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [hash, setHash] = useState("");
  useEffect(() => {
    const update = () => setHash(window.location.hash);
    update();
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, [pathname]);
  return `${pathname}${search.size ? `?${search}` : ""}${hash}`;
}
function targetWithSource(href: TaskHref, source: string) {
  return (
    typeof href === "string"
      ? { pathname: href, query: { returnTo: source } }
      : { ...href, query: { ...href.query, returnTo: source } }
  ) as TaskHref;
}
function rememberSource(event: MouseEvent<Element>, source: string) {
  if (
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    event.button === 0
  ) {
    try {
      sessionStorage.setItem(
        `task-source:${source}`,
        JSON.stringify({ scroll: window.scrollY, id: event.currentTarget.id }),
      );
    } catch {
      /* Optional focus/scroll restoration. */
    }
  }
}
/** Props for a whole menu item to become a localized anchor, including Enter activation. */
export function useTaskMenuLinks() {
  const source = useTaskSource();
  const locale = useLocale() as "en" | "tr";
  return useCallback(
    (href: TaskHref) => ({
      as: NextLink,
      href: getPathname({ locale, href: targetWithSource(href, source) }),
      onClick: (event: MouseEvent<Element>) => rememberSource(event, source),
    }),
    [locale, source],
  );
}
/** A real localized anchor. Modifier clicks and new tabs retain their normal behavior. */
export function TaskLink({ href, onClick, ...props }: Props) {
  const source = useTaskSource();
  const generatedId = useId();
  const target = targetWithSource(href, source);
  return (
    <Link
      {...props}
      id={props.id ?? `task-link-${generatedId}`}
      href={target as ComponentProps<typeof Link>["href"]}
      onClick={(event) => {
        rememberSource(event, source);
        onClick?.(event);
      }}
    />
  );
}

export function TaskButton({
  href,
  children,
  startContent,
  endContent,
  className,
  isIconOnly,
  color,
  variant,
  size,
  ...props
}: Props &
  ButtonVariantProps & {
    startContent?: React.ReactNode;
    endContent?: React.ReactNode;
  }) {
  return (
    <TaskLink
      {...props}
      href={href}
      className={button({ color, variant, size, isIconOnly, className })}
    >
      {startContent}
      {children}
      {endContent}
    </TaskLink>
  );
}
