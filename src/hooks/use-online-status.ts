"use client";

import { useState, useEffect } from "react";
import { onlineManager } from "@tanstack/react-query";

/**
 * A simple hook to track the browser's online status.
 * It uses both navigator.onLine and tanstack/query's onlineManager
 * for robust detection.
 * * @returns `true` if the app is online, `false` otherwise.
 */
export function useOnlineStatus() {
    const [isOnline, setIsOnline] = useState(() => {
        if (typeof window === "undefined") return true;
        return navigator.onLine && onlineManager.isOnline();
    });

    useEffect(() => {
        const updateOnlineStatus = () => {
            const online = navigator.onLine && onlineManager.isOnline();
            setIsOnline(online);
        };

        window.addEventListener("online", updateOnlineStatus);
        window.addEventListener("offline", updateOnlineStatus);
        const unsubscribe = onlineManager.subscribe(updateOnlineStatus);

        return () => {
            window.removeEventListener("online", updateOnlineStatus);
            window.removeEventListener("offline", updateOnlineStatus);
            unsubscribe();
        };
    }, []);

    return isOnline;
}