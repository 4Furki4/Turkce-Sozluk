"use client";

import { useEffect, useRef, useState } from "react";

// Coordinate all pronunciation controls, including native community players.
export const PRONUNCIATION_PLAY_EVENT = "dictionary-pronunciation-play";

export function usePronunciationAudio(src: string | undefined, identity: string) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "playing" | "error">("idle");

  useEffect(() => {
    setState("idle");
    const stop = (event: Event) => {
      if ((event as CustomEvent).detail !== audioRef.current) audioRef.current?.pause();
    };
    window.addEventListener(PRONUNCIATION_PLAY_EVENT, stop);
    return () => {
      window.removeEventListener(PRONUNCIATION_PLAY_EVENT, stop);
      const audio = audioRef.current;
      audioRef.current = null;
      if (audio) {
        audio.onplaying = audio.onpause = audio.onended = audio.onerror = null;
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
      }
    };
  }, [src, identity]);

  const toggle = () => {
    if (!src) return;
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      return;
    }
    if (state === "error" && audioRef.current) {
      audioRef.current.onplaying = audioRef.current.onpause = audioRef.current.onended = audioRef.current.onerror = null;
      audioRef.current.pause();
      audioRef.current = null;
    }
    const audio = audioRef.current ?? new Audio(src);
    audioRef.current = audio;
    audio.onplaying = () => setState("playing");
    audio.onpause = audio.onended = () => setState("idle");
    audio.onerror = () => setState("error");
    window.dispatchEvent(new CustomEvent(PRONUNCIATION_PLAY_EVENT, { detail: audio }));
    setState("loading");
    audio.currentTime = 0;
    void audio.play().catch((error: unknown) => {
      if (audioRef.current === audio) setState(error instanceof DOMException && error.name === "AbortError" ? "idle" : "error");
    });
  };
  return { state, toggle };
}
