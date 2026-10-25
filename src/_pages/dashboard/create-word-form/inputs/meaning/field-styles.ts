import type { InputProps, SelectProps } from "@heroui/react";

const shared = {
  base: "min-w-0",
  label: "text-sm font-medium text-foreground",
  description: "text-sm text-muted-foreground",
};

export const meaningInputClasses = {
  ...shared,
  inputWrapper: "h-12 min-h-12",
  input: "text-base",
} satisfies InputProps["classNames"];

export const meaningSelectClasses = {
  ...shared,
  trigger: "h-12 min-h-12",
  value: "text-base",
  endContent: "mb-0 flex shrink-0 items-center",
} satisfies SelectProps["classNames"];
