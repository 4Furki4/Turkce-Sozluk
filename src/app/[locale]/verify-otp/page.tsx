"use client"
import { Button, InputOtp } from "@heroui/react";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { authClient } from "@/src/lib/auth-client";
export default function VerifyOtpPage() {
    const [email, setEmail] = useState<string | null>(null);
    const [otp, setOtp] = useState("");
    const router = useRouter();
    const t = useTranslations("VerifyOtp");

    useEffect(() => {
        const storedEmail = localStorage.getItem("otp_email");
        if (!storedEmail) {
            router.push("/signin");
        } else {
            setEmail(storedEmail);
        }
    }, [router]);


    // ...

    const mutation = useMutation({
        mutationFn: async () => {
            if (!email || otp.length !== 6) return;
            const res = await authClient.signIn.emailOtp({
                email,
                otp,
            });

            if (res.error) {
                // Handle error
                console.error(res.error);
                // Maybe set error state?
                // For now, let's throw or alert
                throw new Error(res.error.message);
            }

            // On success, better-auth handles redirection or we can do it manually if redirect:false
            // If we used default redirect: true (default), it redirects.
            // But we should clear storage
            localStorage.removeItem("otp_email");
        }
    });

    const handleBackToSignin = () => {
        localStorage.removeItem("otp_email");
        router.push("/signin");
    };

    if (!email) return null;

    return (
        <div className="max-md:h-lvh w-full flex flex-col items-center justify-center">

            <div className="flex flex-col items-center gap-2 w-11/12 sm:w-full max-w-2xl shadow-md bg-background/10 backdrop-saturate-150 p-6 sm:p-12 rounded-sm border-2 border-border">
                <div className="flex flex-col items-center gap-2 text-center">
                    <h1 className="text-2xl font-bold">{t("title")}</h1>
                    <p className="text-muted-foreground">
                        {t("description")} <span className="font-semibold text-foreground">{email}</span>
                    </p>
                </div>

                <InputOtp
                    length={6}
                    value={otp}
                    onValueChange={setOtp}
                    errorMessage={otp.length > 0 && otp.length < 6 ? t("invalidCode") : undefined}
                />

                <Button
                    color="primary"
                    isLoading={mutation.isPending}
                    isDisabled={otp.length !== 6}
                    onPress={() => mutation.mutate()}
                    className="w-full max-w-xs"
                >
                    {t("verifyCode")}
                </Button>

                <Button
                    variant="light"
                    onPress={handleBackToSignin}
                    className="text-muted-foreground"
                >
                    {t("backToSignIn")}
                </Button>
            </div>
        </div>
    );
}
