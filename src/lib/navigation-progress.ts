"use client";

import { useSyncExternalStore } from "react";

type NavigationProgressPhase = "idle" | "loading" | "finishing";

type NavigationProgressState = {
  phase: NavigationProgressPhase;
  version: number;
};

let state: NavigationProgressState = {
  phase: "idle",
  version: 0,
};

const listeners = new Set<() => void>();

let finishTimer: ReturnType<typeof setTimeout> | undefined;
let failsafeTimer: ReturnType<typeof setTimeout> | undefined;

function emit() {
  listeners.forEach((listener) => listener());
}

function updateState(next: Partial<NavigationProgressState>) {
  state = {
    ...state,
    ...next,
    version: state.version + 1,
  };
  emit();
}

function clearTimers() {
  if (finishTimer !== undefined) {
    clearTimeout(finishTimer);
    finishTimer = undefined;
  }

  if (failsafeTimer !== undefined) {
    clearTimeout(failsafeTimer);
    failsafeTimer = undefined;
  }
}

export function startNavigationProgress() {
  if (typeof window === "undefined") {
    return;
  }

  clearTimers();
  updateState({ phase: "loading" });
  failsafeTimer = setTimeout(() => {
    finishNavigationProgress();
  }, 8000);
}

export function finishNavigationProgress() {
  if (typeof window === "undefined") {
    return;
  }

  clearTimers();

  if (state.phase === "idle") {
    return;
  }

  updateState({ phase: "finishing" });
  finishTimer = setTimeout(() => {
    updateState({ phase: "idle" });
  }, 200);
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return state;
}

export function useNavigationProgress() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
