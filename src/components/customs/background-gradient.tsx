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
                        radial-gradient(
                        circle at 50% -20%, 
                        rgba(169, 17, 1, 0.4) 0%,
                        rgba(169, 17, 1, 0.1) 40%, 
                        transparent 70%
                        )
                    `
                }}
            />
        </div>
    );
}
