"use client";
import { type ReactNode } from "react";
import { type Session } from "@/src/lib/auth";
import { TaskLink } from "@/src/components/task-pages/task-link";
import { cn } from "@/lib/utils";
export function FeedbackModal({ children, session, variant = "button", className }: { children: ReactNode; session: Session | null; variant?: "button" | "link"; className?: string }) {
  return <TaskLink href="/feedback/new" className={cn(variant === "button" ? "inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-primary-foreground" : "text-primary hover:underline", className)}>{children}</TaskLink>;
}
