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
    className
}: {
    word_data: any, isSavedWord?: boolean, className?: string
}) {
    const savedWordsQuery = api.user.getWordSaveStatus.useQuery(word_data.word_id, {
        initialData: isSavedWord
    })
    const t = useTranslations("WordCard");
    const utils = api.useUtils()
    const saveWordMutation = api.user.saveWord.useMutation({
        onMutate: async ({ wordId }) => {
            await utils.user.getWordSaveStatus.cancel(wordId)
            const previousValue = utils.user.getWordSaveStatus.getData(wordId);
            utils.user.getWordSaveStatus.setData(wordId, !previousValue);
            return { previousValue };
        },
        onError: (error, { wordId }, context) => {
            switch (error.message) {
                case "UNAUTHORIZED":
                    toast.error(t("UnauthSave"), {
                        position: "bottom-center",
                    });
                    utils.user.getWordSaveStatus.setData(wordId, context?.previousValue)
                    break;
            }
        },
        // Always refetch after error or success:
        onSettled: (newValue, error, { wordId }) => {
            void utils.user.getWordSaveStatus.invalidate(wordId)
        },
    });
    return (
        <Button
            className={cn("cursor-pointer z-50 sm:hover:scale-125 transition-all bg-transparent", className)}
            onPress={() => {
                saveWordMutation.mutate({ wordId: word_data.word_id });
            }}
            isIconOnly
            disableRipple

            disabled={saveWordMutation.isPending}
        >
            <Heart
                aria-label="save word"
                className={`w-5 h-5 sm:w-6 sm:h-6 ${savedWordsQuery.data ? "fill-primary text-primary" : "fill-transparent"} transition-colors`}
            />
        </Button>
    )
}
