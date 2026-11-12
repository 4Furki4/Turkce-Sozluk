"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";

const spacing = 16;
const reach = 88;
const maxShift = 22;
const padding = reach + maxShift + spacing;

export default function HeroDotField() {
  const { resolvedTheme } = useTheme();
  const fieldRef = useRef<HTMLDivElement>(null);
  const patternRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const field = fieldRef.current;
    const pattern = patternRef.current;
    const canvas = canvasRef.current;
    const glow = glowRef.current;
    const hero = field?.parentElement;
    if (!field || !hero || !pattern || !canvas || !glow) return;

    const hover = window.matchMedia("(any-hover: hover) and (any-pointer: fine) and (prefers-reduced-motion: no-preference)");
    let dotRadius: number;
    let context: CanvasRenderingContext2D | null = null;
    let pointer: { x: number; y: number } | null = null;
    let x = 0;
    let y = 0;
    let strength = 0;
    let frame = 0;
    let lastTime = 0;

    const paint = (ctx: CanvasRenderingContext2D, left: number, top: number, right: number, bottom: number) => {
      ctx.clearRect(left, top, right - left, bottom - top);
      ctx.beginPath();

      for (let row = top + spacing / 2; row < bottom + dotRadius; row += spacing) {
        for (let column = left + spacing / 2; column < right + dotRadius; column += spacing) {
          const dx = column - x;
          const dy = row - y;
          const distance = strength > 0 ? Math.hypot(dx, dy) : reach;
          const falloff = Math.max(0, 1 - distance / reach);
          const shift = strength * maxShift * falloff ** 2 / Math.max(12, distance);
          const dotX = column + dx * shift;
          const dotY = row + dy * shift;
          ctx.moveTo(dotX + dotRadius, dotY);
          ctx.arc(dotX, dotY, dotRadius, 0, Math.PI * 2);
        }
      }

      ctx.fill();
    };

    const render = (time: number) => {
      frame = 0;
      const bounds = field.getBoundingClientRect();
      const active = pointer && pointer.x >= bounds.left && pointer.x < bounds.right
        && pointer.y >= bounds.top && pointer.y < bounds.bottom ? pointer : null;
      if (!context) {
        if (!active) return;
        context = canvas.getContext("2d");
        if (!context) return;
        resize();
        pattern.style.visibility = "hidden";
      }
      const targetX = active ? active.x - bounds.left : x;
      const targetY = active ? active.y - bounds.top : y;
      const targetStrength = active ? 1 : 0;
      const ease = 1 - Math.exp(-(lastTime ? time - lastTime : 16) / 50);
      const previousX = strength === 0 ? targetX : x;
      const previousY = strength === 0 ? targetY : y;

      x = previousX + (targetX - previousX) * ease;
      y = previousY + (targetY - previousY) * ease;
      strength += (targetStrength - strength) * ease;
      const moving = Math.abs(targetX - x) > 0.2 || Math.abs(targetY - y) > 0.2
        || Math.abs(targetStrength - strength) > 0.005;
      if (!moving) {
        x = targetX;
        y = targetY;
        strength = targetStrength;
      }

      if (strength === 0) {
        showStaticPattern();
        lastTime = 0;
        return;
      }

      // Redraw the previous and current neighborhoods together, aligned to the dot grid.
      const left = Math.max(0, Math.floor((Math.min(previousX, x) - padding) / spacing) * spacing);
      const top = Math.max(0, Math.floor((Math.min(previousY, y) - padding) / spacing) * spacing);
      const right = Math.min(field.clientWidth, Math.ceil((Math.max(previousX, x) + padding) / spacing) * spacing);
      const bottom = Math.min(field.clientHeight, Math.ceil((Math.max(previousY, y) + padding) / spacing) * spacing);
      paint(context, left, top, right, bottom);
      glow.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
      glow.style.opacity = String(strength);

      lastTime = moving ? time : 0;
      if (moving) schedule();
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(render);
    };

    const resize = () => {
      if (!context) return;
      const width = field.clientWidth;
      const height = field.clientHeight;
      const ratio = Math.min(window.devicePixelRatio, 2);
      canvas.width = Math.ceil(width * ratio);
      canvas.height = Math.ceil(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const dotStyle = getComputedStyle(pattern);
      dotRadius = Number.parseFloat(dotStyle.getPropertyValue("--hero-dot-radius"));
      context.fillStyle = dotStyle.color;
      paint(context, 0, 0, width, height);
    };

    const move = (event: PointerEvent) => {
      if (!hover.matches || event.pointerType === "touch") return;
      pointer = { x: event.clientX, y: event.clientY };
      schedule();
    };

    function leave() {
      if (!pointer) return;
      pointer = null;
      schedule();
    }

    const dismissOnTouch = (event: PointerEvent) => {
      if (event.pointerType === "touch") leave();
    };

    const showStaticPattern = () => {
      context = null;
      canvas.width = canvas.height = 0;
      pattern.style.visibility = "";
      glow.style.opacity = "0";
    };

    const reset = () => {
      cancelAnimationFrame(frame);
      frame = lastTime = strength = 0;
      pointer = null;
      showStaticPattern();
    };

    function scroll() {
      if (pointer) schedule();
    }

    const observer = new ResizeObserver(() => {
      resize();
      scroll();
    });
    observer.observe(field);
    hero.addEventListener("pointermove", move, { passive: true });
    hero.addEventListener("pointerleave", leave);
    hero.addEventListener("pointercancel", leave);
    window.addEventListener("blur", leave);
    window.addEventListener("pointerdown", dismissOnTouch, { passive: true, capture: true });
    window.addEventListener("scroll", scroll, { passive: true, capture: true });
    hover.addEventListener("change", reset);

    return () => {
      observer.disconnect();
      hero.removeEventListener("pointermove", move);
      hero.removeEventListener("pointerleave", leave);
      hero.removeEventListener("pointercancel", leave);
      window.removeEventListener("blur", leave);
      window.removeEventListener("pointerdown", dismissOnTouch, true);
      window.removeEventListener("scroll", scroll, true);
      hover.removeEventListener("change", reset);
      reset();
    };
  }, [resolvedTheme]);

  return (
    <div ref={fieldRef} aria-hidden="true" className="pointer-events-none absolute inset-0 -z-20 overflow-hidden">
      <div className="absolute inset-0 opacity-20 motion-safe:any-pointer-fine:opacity-35 [mask-image:radial-gradient(ellipse_54%_60%_at_50%_44%,#000_65%,transparent_100%)]">
        <div
          ref={patternRef}
          className="absolute inset-0 text-[#b8b8bf] [--hero-dot-radius:2px] dark:text-[#71717a] dark:[--hero-dot-radius:1.75px] bg-[radial-gradient(currentColor_var(--hero-dot-radius),transparent_var(--hero-dot-radius))] [background-size:16px_16px]"
        />
        <canvas ref={canvasRef} width={0} height={0} className="absolute inset-0 size-full" />
      </div>
      <div
        ref={glowRef}
        className="absolute left-0 top-0 size-40 rounded-full bg-[radial-gradient(circle,rgba(205,45,29,0.18),transparent_70%)] opacity-0 dark:bg-[radial-gradient(circle,rgba(255,89,64,0.23),transparent_70%)]"
      />
    </div>
  );
}
