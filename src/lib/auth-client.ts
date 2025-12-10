import { createAuthClient } from "better-auth/react";
import type { User } from "better-auth";
import { emailOTPClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
    baseURL: "http://localhost:3000", // the base url of your auth server
    plugins: [
        emailOTPClient()
    ]
});

export type Session = typeof authClient.$Infer.Session;
export type { User };
