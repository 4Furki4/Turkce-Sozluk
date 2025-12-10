"use client"
import { Button, Input } from '@heroui/react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { MailIcon } from 'lucide-react'
import React, { useState } from 'react'
import { Controller, FieldValues, useForm } from 'react-hook-form'
import { z } from 'zod'
import { authClient } from "@/src/lib/auth-client"

export default function SigninWithEmailForm({ SigninWithEmailIntl, EnterYourEmailIntl, EmailSigninLabelIntl, MagicLinkIntl, InvalidEmailIntl }: { SigninWithEmailIntl: string, EnterYourEmailIntl: string, EmailSigninLabelIntl: string, MagicLinkIntl: string, InvalidEmailIntl: string }) {
    const [step, setStep] = useState<"email" | "otp">("email")
    const [email, setEmail] = useState("")

    const { control, handleSubmit, reset } = useForm({
        resolver: zodResolver(z.object({
            email: z.string().email({ message: InvalidEmailIntl }).optional(),
            code: z.string().min(6, { message: "Code must be 6 digits" }).optional()
        })),
        mode: 'all'
    })
    const mutation = useMutation({
        mutationFn: async (data: FieldValues) => {
            const res = await authClient.emailOtp.sendVerificationOtp({
                email: data.email,
                type: "sign-in"
            });
            if (!res?.error) {
                localStorage.setItem("otp_email", data.email)
                window.location.href = "/verify-otp"
            } else {
                throw new Error(res?.error?.message || "Failed to send email")
            }
        }
    })
    return (
        <form
            className="w-full flex flex-col gap-2"
            onSubmit={handleSubmit(async (data) => await mutation.mutateAsync(data))}
        >
            {step === "email" ? (
                <Controller
                    control={control}
                    name="email"
                    render={({ field, fieldState: { error } }) => (
                        <Input
                            classNames={{
                                inputWrapper: [
                                    "rounded-sm",
                                    "backdrop-blur-xs",
                                    "border-2 border-primary/40",
                                    "shadow-xl",
                                    "group-data-[hover=true]:border-primary/60",
                                ],
                                input: [
                                    "py-6",
                                    "text-base",
                                    "text-foreground",
                                    "placeholder:text-muted-foreground",
                                ]
                            }}
                            {...field}
                            className="rounded-sm w-full"
                            label={EmailSigninLabelIntl}
                            variant="bordered"
                            labelPlacement='outside'
                            color='primary'
                            type="email"
                            name="email"
                            errorMessage={error?.message}
                            placeholder={EnterYourEmailIntl}
                            description={MagicLinkIntl}
                            startContent={<MailIcon size={24} />}
                        />
                    )}
                />
            ) : (
                <Controller
                    control={control}
                    name="code"
                    render={({ field, fieldState: { error } }) => (
                        <Input
                            classNames={{
                                inputWrapper: [
                                    "rounded-sm",
                                    "backdrop-blur-xs",
                                    "border-2 border-primary/40",
                                    "shadow-xl",
                                    "group-data-[hover=true]:border-primary/60",
                                ],
                                input: [
                                    "py-6",
                                    "text-base",
                                    "text-foreground",
                                    "placeholder:text-muted-foreground",
                                    "tracking-[1em] text-center font-bold"
                                ]
                            }}
                            {...field}
                            className="rounded-sm w-full"
                            label="Verification Code"
                            variant="bordered"
                            labelPlacement='outside'
                            color='primary'
                            type="text"
                            maxLength={6}
                            name="code"
                            errorMessage={error?.message}
                            placeholder="123456"
                            description="Check your email for the code"
                        />
                    )}
                />
            )}
            <Button
                className="rounded-sm w-full"
                variant="flat"
                color="primary"
                type="submit"
                isLoading={mutation.isPending}
            >
                {step === "email" ? SigninWithEmailIntl : "Verify Code"}
            </Button>
        </form>
    )
}
