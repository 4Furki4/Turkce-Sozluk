import { createAuthClient } from "better-auth/react";
import type { User } from "better-auth";
import { emailOTPClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
    baseURL: `https://${process.env.VERCEL_URL}`, // the base url of your auth server
    plugins: [
        emailOTPClient()
    ]
});

export type Session = typeof authClient.$Infer.Session;
export type { User };
