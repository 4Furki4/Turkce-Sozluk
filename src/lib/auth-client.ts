import { createAuthClient } from "better-auth/react";
import type { User } from "better-auth";
import { emailOTPClient } from "better-auth/client/plugins";

// For client-side, we need NEXT_PUBLIC_ prefixed env vars
// If not set (same-origin deployment), use empty string which defaults to current origin
const getBaseURL = () => {
    // In production on Vercel, use the deployment URL
    if (typeof window !== "undefined") {
        // Client-side: use current origin (same-origin requests)
        return "";
    }
    // Server-side: can use VERCEL_URL if needed
    return process.env.NEXT_PUBLIC_VERCEL_URL
        ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
        : "";
};

export const authClient = createAuthClient({
    baseURL: getBaseURL(),
    plugins: [
        emailOTPClient()
    ]
});

export type Session = typeof authClient.$Infer.Session;
export type { User };
