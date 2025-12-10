"use client"
import { Button } from "@heroui/button";
import { authClient } from "@/src/lib/auth-client"; // Added
export default function SigninButton({ provider, IntlMessage, startContent, redirectUrl }: { provider: "google" | "discord" | "github", IntlMessage: string, startContent: React.ReactNode, redirectUrl?: string }) {
    return (
        <Button
            onPress={async () => {
                await authClient.signIn.social({
                    provider: provider,
                    callbackURL: redirectUrl
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