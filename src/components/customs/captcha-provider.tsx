"use client";

import { env } from "@/src/env.mjs";
import { GoogleReCaptchaProvider } from "react-google-recaptcha-v3";

export function CaptchaProvider({ children }: { children: React.ReactNode }) {
    return (
        <GoogleReCaptchaProvider
            reCaptchaKey={env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}
            scriptProps={{
                async: true,
                defer: true,
                appendTo: "head",
                nonce: undefined,
            }}
        >
            {children}
        </GoogleReCaptchaProvider>
    );
}
