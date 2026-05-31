"use client";

import { onlineManager } from "@tanstack/react-query";
import { useEffect } from "react";

export default function OnlineStatusBridge() {
  useEffect(() => {
    const syncOnlineStatus = () => {
      onlineManager.setOnline(navigator.onLine);
    };

    syncOnlineStatus();
    window.addEventListener("online", syncOnlineStatus);
    window.addEventListener("offline", syncOnlineStatus);

    return () => {
      window.removeEventListener("online", syncOnlineStatus);
      window.removeEventListener("offline", syncOnlineStatus);
    };
  }, []);

  return null;
}
