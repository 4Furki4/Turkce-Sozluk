"use client";
import React, { useState, useEffect } from 'react';
import { useSnapshot } from 'valtio';
import { preferencesState } from '@/src/store/preferences';
import { cn } from '@/src/lib/utils';

export function BackgroundGradient() {
    const { isBlurEnabled } = useSnapshot(preferencesState);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    return (
        <div
            className={cn(
                'fixed inset-0 -z-50 pointer-events-none transition-opacity duration-1000 ease-out',
                isMounted && isBlurEnabled ? 'opacity-100' : 'opacity-0'
            )}
            aria-hidden={!isMounted || !isBlurEnabled}
        >
            {/* Base Background */}
            <div className="absolute inset-0 bg-background" />

            {/* 
                Option 3: "Linear Wash"
                Concept: A clean, modern, diagonal gradient.
                Strictly uses the Primary Color.
            */}

            <div
                className="absolute inset-0"
                style={{
                    background: `
                        linear-gradient(
                            135deg,
                            hsl(var(--primary) / 0.20) 0%,
                            hsl(var(--primary) / 0.10) 40%,
                            transparent 100%
                        )
                    `
                }}
            />
        </div>
    );
}
