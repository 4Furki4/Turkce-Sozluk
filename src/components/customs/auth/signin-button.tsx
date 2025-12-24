"use client"
import { Button } from "@heroui/button";
import { authClient } from "@/src/lib/auth-client";

export default function SigninButton({ provider, IntlMessage, startContent, redirectPath }: { provider: "google" | "discord" | "github", IntlMessage: string, startContent: React.ReactNode, redirectPath?: string }) {
    return (
        <Button
            onPress={async () => {
                // better-auth requires absolute URLs (with full origin) for callback URLs
                // Construct the absolute URL from the path
                const absoluteUrl = redirectPath
                    ? `${window.location.origin}${redirectPath.startsWith('/') ? '' : '/'}${redirectPath}`
                    : undefined;
                await authClient.signIn.social({
                    provider: provider,
                    callbackURL: absoluteUrl
                });
            }}
            className="rounded-sm w-full"
            variant="flat"
            color="primary"
            type="submit"
            startContent={startContent}
        > {IntlMessage} </Button>
    )
}
