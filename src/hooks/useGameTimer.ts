"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface UseGameTimerOptions {
    /** Initial time in seconds */
    initialTime: number;
    /** Count direction - "down" for countdown, "up" for elapsed time */
    direction?: "up" | "down";
    /** Callback when timer reaches 0 (only for countdown) */
    onComplete?: () => void;
    /** Whether to auto-start the timer */
    autoStart?: boolean;
}

interface UseGameTimerReturn {
    /** Current time value in seconds */
    time: number;
    /** Whether the timer is currently running */
    isRunning: boolean;
    /** Start or resume the timer */
    start: () => void;
    /** Pause the timer */
    pause: () => void;
    /** Stop and reset the timer to initial value */
    reset: () => void;
    /** Set a new time value */
    setTime: (time: number) => void;
}

/**
 * Custom hook for managing game timers
 * Supports both countdown and elapsed time modes
 */
export function useGameTimer({
    initialTime,
    direction = "down",
    onComplete,
    autoStart = false,
}: UseGameTimerOptions): UseGameTimerReturn {
    const [time, setTime] = useState(initialTime);
    const [isRunning, setIsRunning] = useState(autoStart);
    const onCompleteRef = useRef(onComplete);

    // Keep callback ref updated
    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    // Timer effect
    useEffect(() => {
        if (!isRunning) return;

        const interval = setInterval(() => {
            setTime((prev) => {
                if (direction === "down") {
                    if (prev <= 1) {
                        setIsRunning(false);
                        onCompleteRef.current?.();
                        return 0;
                    }
                    return prev - 1;
                } else {
                    return prev + 1;
                }
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [isRunning, direction]);

    const start = useCallback(() => {
        setIsRunning(true);
    }, []);

    const pause = useCallback(() => {
        setIsRunning(false);
    }, []);

    const reset = useCallback(() => {
        setIsRunning(false);
        setTime(initialTime);
    }, [initialTime]);

    const setTimeValue = useCallback((newTime: number) => {
        setTime(newTime);
    }, []);

    return {
        time,
        isRunning,
        start,
        pause,
        reset,
        setTime: setTimeValue,
    };
}
