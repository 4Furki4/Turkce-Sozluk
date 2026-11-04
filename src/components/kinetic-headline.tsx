"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from "react";
import { claimHomeIntro, type HomeIntroMode } from "@/src/lib/home-intro";

const segmenter = typeof Intl.Segmenter === "function"
  ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
  : null;

/** Real text supplies the letterforms; the parent heading supplies its accessible name. */
export default function KineticHeadline({ children }: { children: ReactNode }) {
  const elementRef = useRef<HTMLSpanElement>(null);
  const frameRef = useRef(0);
  const pointerRef = useRef({ x: 0, y: 0 });
  const introModeRef = useRef<HomeIntroMode | null>(null);
  let glyphIndex = 0;

  function compose(nodes: ReactNode): ReactNode {
    return Children.map(nodes, (node) => {
      if (typeof node === "string") {
        return node.split(/(\s+)/u).map((word, wordIndex) => {
          if (!word) return null;
          if (/^\s+$/u.test(word)) return word;
          return (
            <span className="home-word" key={wordIndex}>
              {(segmenter ? Array.from(segmenter.segment(word), ({ segment }) => segment) : Array.from(word)).map((segment) => {
                const index = glyphIndex++;
                const angle = index * 2.39996;
                const radius = 54 + (index % 4) * 16;
                const style = {
                  "--glyph-x": `${Math.round(Math.cos(angle) * radius)}px`,
                  "--glyph-y": `${Math.round(Math.sin(angle) * radius)}px`,
                  "--glyph-turn": `${((index * 29) % 62) - 31}deg`,
                  "--glyph-depth": `${index % 2 ? -150 : 100}px`,
                  "--glyph-delay": `${80 + (index % 7) * 26 + Math.floor(index / 7) * 30}ms`,
                } as CSSProperties;
                return <span data-home-glyph className="home-glyph" style={style} key={index}>{segment}</span>;
              })}
            </span>
          );
        });
      }
      if (isValidElement<{ children?: ReactNode }>(node)) {
        return cloneElement(node, undefined, compose(node.props.children));
      }
      return node;
    });
  }

  const releaseLetters = useCallback(() => {
    cancelAnimationFrame(frameRef.current);
    frameRef.current = 0;
    elementRef.current?.querySelectorAll<HTMLElement>("[data-home-glyph]").forEach((glyph) => {
      glyph.style.removeProperty("--glyph-lift");
      glyph.style.removeProperty("--glyph-lean");
    });
  }, []);

  function followPointer(event: PointerEvent<HTMLSpanElement>) {
    if (event.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    pointerRef.current = { x: event.clientX, y: event.clientY };
    if (frameRef.current) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = 0;
      const glyphs = Array.from(elementRef.current?.querySelectorAll<HTMLElement>("[data-home-glyph]") ?? []);
      // Let the opening choreography finish before responding to the pointer.
      if (glyphs.some((glyph) => glyph.getAnimations().some((animation) =>
        "animationName" in animation && animation.animationName === "home-glyph-compose" && animation.playState === "running",
      ))) return;
      const positions = glyphs.map((glyph) => glyph.getBoundingClientRect());
      glyphs.forEach((glyph, index) => {
        const rect = positions[index]!;
        const dx = pointerRef.current.x - rect.left - rect.width / 2;
        const dy = pointerRef.current.y - rect.top - rect.height / 2;
        const influence = Math.max(0, 1 - Math.hypot(dx, dy) / 110);
        glyph.style.setProperty("--glyph-lift", `${-14 * influence}px`);
        glyph.style.setProperty("--glyph-lean", `${dx * influence * 0.09}deg`);
      });
    });
  }

  useLayoutEffect(() => {
    // Keep the same decision through Strict Mode's effect replay, but make a
    // fresh decision on a real return to this page.
    introModeRef.current ??= claimHomeIntro();
    document.documentElement.dataset.homeIntro = introModeRef.current;
  }, []);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const deferred = introModeRef.current === "play" ? Array.from(document.querySelectorAll<HTMLElement>(
      '[data-home-enter="features"], [data-home-enter="footer"]',
    )) : [];
    const observer = typeof IntersectionObserver === "function"
      ? new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            (entry.target as HTMLElement).dataset.homeVisible = "";
            observer?.unobserve(entry.target);
          });
        }, { threshold: 0.08 })
      : null;
    deferred.forEach((element) => {
      if (observer) observer.observe(element);
      else element.dataset.homeVisible = "";
    });
    const skipRestoredIntro = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      // A browser-cache restore keeps this component mounted. Cancel any
      // interrupted entrance instead of resuming it when the tab returns.
      introModeRef.current = "skip";
      document.documentElement.dataset.homeIntro = "skip";
      observer?.disconnect();
      releaseLetters();
    };
    window.addEventListener("pageshow", skipRestoredIntro);
    reducedMotion.addEventListener("change", releaseLetters);
    document.addEventListener("visibilitychange", releaseLetters);
    return () => {
      observer?.disconnect();
      deferred.forEach((element) => { delete element.dataset.homeVisible; });
      window.removeEventListener("pageshow", skipRestoredIntro);
      reducedMotion.removeEventListener("change", releaseLetters);
      document.removeEventListener("visibilitychange", releaseLetters);
      releaseLetters();
    };
  }, [releaseLetters]);

  return (
    <span
      ref={elementRef}
      aria-hidden="true"
      className="home-headline"
      onPointerMove={followPointer}
      onPointerLeave={releaseLetters}
    >
      {compose(children)}
    </span>
  );
}
