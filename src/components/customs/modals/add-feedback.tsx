"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useTranslations } from "next-intl";
import {
    Button,
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@heroui/react";

import { type Session } from "@/src/lib/auth";
import { cn } from "@/lib/utils";
import { useRouter } from "@/src/i18n/routing";
import { startNavigationProgress } from "@/src/lib/navigation-progress";

const FeedbackDialog = dynamic(
    () =>
        import("./feedback-dialog").then(
            (module) => module.FeedbackDialog,
        ),
    { ssr: false },
);

export function FeedbackModal({
    children,
    session,
    variant = "button",
    className,
}: {
    children: React.ReactNode;
    session: Session | null;
    variant?: "button" | "link";
    className?: string;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const t = useTranslations("Feedback.NewForm");
    const tGlobal = useTranslations("Navbar");
    const router = useRouter();

    if (!session) {
        const trigger = (
            <Button
                color="primary"
                disableAnimation={variant === "link"}
                disableRipple={variant === "link"}
                variant="light"
                className={cn(
                    "p-0 m-0 h-max text-base text-text-foreground/60 data-[hover]:dark:bg-transparent data-[hover]:bg-transparent opacity-70 cursor-not-allowed",
                    className,
                )}
            >
                {children}
            </Button>
        );

        return (
            <Popover showArrow placement="top">
                <PopoverTrigger className="self-start">{trigger}</PopoverTrigger>
                <PopoverContent>
                    <div className="px-2 py-2">
                        <div className="text-small font-bold">
                            {t("authRequiredTitle")}
                        </div>
                        <div className="text-tiny">
                            {t("authRequiredDescription")} {" "}
                            <Button
                                color="primary"
                                variant="light"
                                onPress={() => {
                                    startNavigationProgress();
                                    router.push({
                                        pathname: "/signin",
                                        query: {
                                            backTo: window.location.pathname,
                                        },
                                    });
                                }}
                                className="p-0 m-0 h-max text-base font-semibold data-[hover]:dark:bg-transparent data-[hover]:bg-transparent data-[hover]:text-primary data-[hover]:underline data-[hover]:underline-offset-2 text-primary underline underline-offset-2"
                                disableAnimation
                                disableRipple
                            >
                                {tGlobal("Sign In")}
                            </Button>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        );
    }

    return (
        <>
            <Button
                color={variant === "button" ? "primary" : undefined}
                variant={variant === "link" ? "light" : undefined}
                onPress={() => setIsOpen(true)}
                disableAnimation={variant === "link"}
                disableRipple={variant === "link"}
                className={cn(
                    variant === "link" &&
                        "p-0 m-0 h-max text-base data-[hover]:dark:bg-transparent data-[hover]:bg-transparent",
                    className,
                )}
            >
                {children}
            </Button>
            {isOpen ? (
                <FeedbackDialog isOpen={isOpen} onOpenChange={setIsOpen} />
            ) : null}
        </>
    );
}
