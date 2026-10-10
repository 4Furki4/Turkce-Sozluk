"use client"
import { cn } from '@/src/lib/utils';
import { api } from '@/src/trpc/react';
import { Button } from '@heroui/react';
import { Heart } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React from 'react'
import { toast } from 'sonner';

export default function SaveWord({
    word_data,
    isSavedWord,
    className,
    iconClassName
}: {
    word_data: any, isSavedWord?: boolean, className?: string, iconClassName?: string
}) {
    const savedWordsQuery = api.user.getWordSaveStatus.useQuery(word_data.word_id, {
        initialData: isSavedWord
    })
    const t = useTranslations("WordCard");
    const utils = api.useUtils()
    const saveWordMutation = api.user.saveWord.useMutation({
        onSuccess: () => Promise.all([
            utils.user.getSavedWords.invalidate(),
            utils.user.getSavedWordCount.invalidate(),
        ]),
        onMutate: async ({ wordId }) => {
            await utils.user.getWordSaveStatus.cancel(wordId)
            const previousValue = utils.user.getWordSaveStatus.getData(wordId);
            utils.user.getWordSaveStatus.setData(wordId, !previousValue);
            return { previousValue };
        },
        onError: (error, { wordId }, context) => {
            utils.user.getWordSaveStatus.setData(wordId, context?.previousValue);
            toast.error(t(error.data?.code === "UNAUTHORIZED" ? "UnauthSave" : "saveFailed"), {
                position: "bottom-center",
            });
        },
        // Always refetch after error or success:
        onSettled: (newValue, error, { wordId }) => {
            void utils.user.getWordSaveStatus.invalidate(wordId)
        },
    });
    return (
        <Button
            className={cn("cursor-pointer h-11 min-w-11 bg-transparent", className)}
            aria-label={t(savedWordsQuery.data ? "Unsave" : "Save")}
            aria-pressed={Boolean(savedWordsQuery.data)}
            onPress={() => {
                saveWordMutation.mutate({ wordId: word_data.word_id });
            }}
            isIconOnly
            disableRipple

            isDisabled={saveWordMutation.isPending}
        >
            <Heart
                aria-hidden
                className={cn(
                    "h-5 w-5 sm:h-6 sm:w-6 transition-colors",
                    savedWordsQuery.data ? "fill-primary text-primary" : "fill-transparent",
                    iconClassName,
                )}
            />
        </Button>
    )
}
