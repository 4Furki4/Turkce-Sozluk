"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";

export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const elementRef = useRef<HTMLDivElement>(null);
  const previousPathnameRef = useRef(pathname);
  const animationRef = useRef<Animation | null>(null);
  const keyboardRef = useRef(false);

  useLayoutEffect(() => {
    const handleKeyDown = () => { keyboardRef.current = true; };
    const handlePointerDown = () => { keyboardRef.current = false; };
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const cancelAnimation = () => {
      animationRef.current?.cancel();
      animationRef.current = null;
    };

    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("pointerdown", handlePointerDown, true);
    motionPreference.addEventListener("change", cancelAnimation);

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("pointerdown", handlePointerDown, true);
      motionPreference.removeEventListener("change", cancelAnimation);
      cancelAnimation();
    };
  }, []);

  useLayoutEffect(() => {
    // Leave the first render visible, including SSR and hydration. Query-only
    // updates and refreshes retain the same pathname and do not animate.
    if (previousPathnameRef.current === pathname) return;
    previousPathnameRef.current = pathname;

    const element = elementRef.current;
    if (!element || typeof element.animate !== "function") return;

    // The homepage owns its first-visit entrance; return visits stay immediate.
    if (element.querySelector("[data-home-page]")) {
      animationRef.current?.cancel();
      animationRef.current = null;
      return;
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const styles = getComputedStyle(element);
    const interrupted = animationRef.current?.playState === "running";
    const opacity = interrupted ? styles.opacity : "0.82";
    const transform = interrupted ? styles.transform : "translateY(6px)";
    animationRef.current?.cancel();
    animationRef.current = null;

    // Keep keyboard navigation immediate and stationary.
    if (keyboardRef.current) return;

    const animation = element.animate(
      reducedMotion
        ? [{ opacity }, { opacity: 1 }]
        : [{ opacity, transform }, { opacity: 1, transform: "none" }],
      {
        duration: reducedMotion ? 100 : 200,
        easing: styles.getPropertyValue("--ease-content-out").trim(),
      },
    );
    animationRef.current = animation;
    animation.onfinish = () => {
      if (animationRef.current === animation) animationRef.current = null;
    };
  }, [pathname]);

  return (
    <div ref={elementRef} className="flex w-full min-w-0 flex-1" data-page-transition>
      {children}
    </div>
  );
}
