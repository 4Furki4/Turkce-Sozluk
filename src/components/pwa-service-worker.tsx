"use client";

import { useEffect } from "react";

const isServiceWorkerEnabled = process.env.NODE_ENV === "production";

export default function PWAServiceWorker() {
  useEffect(() => {
    if (
      !isServiceWorkerEnabled ||
      !("serviceWorker" in navigator) ||
      window.serwist === undefined
    ) {
      return;
    }

    const registerServiceWorker = async () => {
      try {
        const registration = await window.serwist.register();
        await navigator.serviceWorker.ready;
        console.info("[PWA] Service worker ready:", registration?.scope ?? "/");
      } catch (error) {
        console.error("[PWA] Service worker registration failed:", error);
      }
    };

    void registerServiceWorker();
  }, []);

  return null;
}
