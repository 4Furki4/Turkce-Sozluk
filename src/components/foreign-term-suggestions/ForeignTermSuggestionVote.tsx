"use client";

import { Button } from "@heroui/react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { api } from "@/src/trpc/react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface ForeignTermSuggestionVoteProps {
    suggestionId: number;
    voteCount: number;
    userVote: number | null;
    isAuthenticated: boolean;
    onVoteChange?: () => void;
}

export function ForeignTermSuggestionVote({
    suggestionId,
    voteCount,
    userVote,
    isAuthenticated,
    onVoteChange,
}: ForeignTermSuggestionVoteProps) {
    const t = useTranslations("ForeignTermSuggestions");
    const utils = api.useUtils();

    const voteMutation = api.foreignTermSuggestion.vote.useMutation({
        onSuccess: () => {
            utils.foreignTermSuggestion.list.invalidate();
            utils.foreignTermSuggestion.getById.invalidate({ id: suggestionId });
            onVoteChange?.();
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    const handleVote = (voteType: "up" | "down") => {
        if (!isAuthenticated) {
            toast.error(t("errors.loginRequired"));
            return;
        }
        voteMutation.mutate({ suggestionId, voteType });
    };

    return (
        <div className="flex items-center gap-2">
            <Button
                isIconOnly
                size="sm"
                variant={userVote === 1 ? "solid" : "light"}
                color={userVote === 1 ? "success" : "default"}
                onPress={() => handleVote("up")}
                isDisabled={voteMutation.isPending}
                className={cn("rounded-md", {
                    "bg-success/20 text-success": userVote === 1,
                })}
            >
                <ThumbsUp className="w-4 h-4" />
            </Button>
            <span
                className={cn("font-semibold min-w-[2rem] text-center", {
                    "text-success": voteCount > 0,
                    "text-danger": voteCount < 0,
                    "text-muted-foreground": voteCount === 0,
                })}
            >
                {voteCount}
            </span>
            <Button
                isIconOnly
                size="sm"
                variant={userVote === -1 ? "solid" : "light"}
                color={userVote === -1 ? "danger" : "default"}
                onPress={() => handleVote("down")}
                isDisabled={voteMutation.isPending}
                className={cn("rounded-md", {
                    "bg-danger/20 text-danger": userVote === -1,
                })}
            >
                <ThumbsDown className="w-4 h-4" />
            </Button>
        </div>
    );
}
