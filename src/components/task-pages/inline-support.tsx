"use client";
import { useEffect, useRef, type ReactNode } from "react";
/** A supporting editor stays in document flow and never nests a form. */
export function InlineSupport({
  open,
  title,
  children,
  onSubmit,
  isPending = false,
}: {
  open: boolean;
  title: ReactNode;
  children: ReactNode;
  onSubmit?: () => void | Promise<void>;
  isPending?: boolean;
}) {
  const submitting = useRef(false);
  const region = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (open) {
      trigger.current = document.activeElement as HTMLElement;
      region.current
        ?.querySelector<HTMLInputElement>("input,textarea,button")
        ?.focus();
    } else trigger.current?.focus();
  }, [open]);
  if (!open) return null;
  return (
    <div
      ref={region}
      role="group"
      onKeyDown={(event) => {
        if (
          event.key !== "Enter" ||
          event.defaultPrevented ||
          event.nativeEvent.isComposing ||
          !(event.target instanceof HTMLInputElement) ||
          ["file", "checkbox", "radio", "button", "submit"].includes(
            event.target.type,
          )
        )
          return;
        event.preventDefault();
        event.stopPropagation();
        if (isPending || submitting.current) return;
        submitting.current = true;
        Promise.resolve()
          .then(() => onSubmit?.())
          .catch(() => { /* Supporting forms announce their submission errors. */ })
          .finally(() => {
            submitting.current = false;
          });
      }}
      className="my-4 space-y-3 rounded-md border border-divider bg-background/40 p-4"
    >
      <h3 className="font-semibold">{title}</h3>
      {children}
    </div>
  );
}
