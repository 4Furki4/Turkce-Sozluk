"use client";

import { FC, useState } from "react";
import {
    Accordion,
    AccordionItem,
    Button,
    Avatar,
    Chip,
    Popover,
    PopoverTrigger,
    PopoverContent
} from "@heroui/react";
import { PlayIcon, PauseIcon, ArrowUpIcon, ArrowDownIcon, User } from "lucide-react";
import { api } from "@/src/trpc/react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Session } from "next-auth";
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useLocale } from 'next-intl';

interface PronunciationAccordionProps {
    wordId: number;
    session: Session | null;
}

export const PronunciationAccordion: FC<PronunciationAccordionProps> = ({ wordId, session }) => {
    const locale = useLocale();
    const t = useTranslations("Pronunciations");
    const [playingId, setPlayingId] = useState<number | null>(null);
    const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

    const { data: pronunciations, isLoading } = api.word.getPronunciationsForWord.useQuery({
        wordId
    });

    const utils = api.useUtils();
    const { mutate: toggleVote } = api.vote.togglePronunciationVote.useMutation({
        onMutate: async ({ pronunciationId, voteType }) => {
            await utils.word.getPronunciationsForWord.cancel();
            const previousData = utils.word.getPronunciationsForWord.getData({ wordId });

            utils.word.getPronunciationsForWord.setData({ wordId }, (oldData) => {
                if (!oldData) return oldData;
                return oldData.map((pronunciation) => {
                    if (pronunciation.id === pronunciationId) {
                        const currentVote = pronunciation.userVote;
                        const voteValue = voteType === 'up' ? 1 : -1;
                        let newVoteCount = pronunciation.voteCount;

                        if (currentVote === voteValue) { // Toggling off
                            newVoteCount -= voteValue;
                        } else if (currentVote === -voteValue) { // Changing vote
                            newVoteCount += 2 * voteValue;
                        } else { // New vote
                            newVoteCount += voteValue;
                        }

                        return {
                            ...pronunciation,
                            voteCount: newVoteCount,
                            hasVoted: currentVote !== voteValue,
                            userVote: currentVote === voteValue ? 0 : voteValue,
                        };
                    }
                    return pronunciation;
                });
            });

            return { previousData };
        },
        onError: (err, newVote, context) => {
            toast.error(t("voteError") || "Failed to vote");
            if (context?.previousData) {
                utils.word.getPronunciationsForWord.setData({ wordId }, context.previousData);
            }
        },
        onSettled: () => {
            utils.word.getPronunciationsForWord.invalidate({ wordId });
        },
    });

    const handlePlayAudio = (pronunciationId: number, audioUrl: string) => {
        if (playingId === pronunciationId && audio) {
            // Pause current audio
            audio.pause();
            setPlayingId(null);
            setAudio(null);
        } else {
            // Stop any currently playing audio
            if (audio) {
                audio.pause();
            }

            // Play new audio
            const newAudio = new Audio(audioUrl);
            setAudio(newAudio);
            setPlayingId(pronunciationId);

            newAudio.play().catch(() => {
                toast.error(t("audioPlayError") || "Failed to play audio");
                setPlayingId(null);
                setAudio(null);
            });

            newAudio.onended = () => {
                setPlayingId(null);
                setAudio(null);
            };
        }
    };

    const handleVote = (pronunciationId: number, voteType: 'up' | 'down') => {
        if (!session) {
            toast.error(t("loginToVote") || "Please login to vote");
            return;
        }
        toggleVote({ pronunciationId, voteType });
    };

    if (isLoading) {
        return (
            <div className="p-4 text-center">
                <div className="text-sm text-muted-foreground">{t("loading") || "Loading pronunciations..."}</div>
            </div>
        );
    }

    if (!pronunciations || pronunciations.length === 0) {
        return (
            <div className="p-4 text-center text-muted-foreground">
                <p>{t("noPronunciations") || "No pronunciations available yet."}</p>
            </div>
        );
    }

    return (
        <Accordion variant="splitted" className="px-0">
            {pronunciations.map((pronunciation, index) => (
                <AccordionItem
                    key={pronunciation.id}
                    aria-label={`Pronunciation ${index + 1}`}
                    title={
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-3">
                                <Popover>
                                    <PopoverTrigger>
                                        <Avatar
                                            size="sm"
                                            src={pronunciation.user?.image || ''}
                                            name={pronunciation.user?.name || 'User'}
                                            className="cursor-pointer"
                                        />
                                    </PopoverTrigger>
                                    <PopoverContent>
                                        <div className="px-1 py-2">
                                            <div className="text-small font-bold">{pronunciation.user?.name || 'User'}</div>
                                            <div className="text-tiny">{t("userDetails") || "User details"}</div>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                                <div>
                                    <div className="text-sm font-medium">{pronunciation.user?.name || 'User'}</div>
                                    <div className="text-xs text-muted-foreground">
                                        {t("contributedBy") || "Contributed pronunciation"}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <Chip
                                    size="sm"
                                    variant="flat"
                                    color={pronunciation.voteCount > 0 ? "success" : pronunciation.voteCount < 0 ? "danger" : "default"}
                                >
                                    {pronunciation.voteCount} {t("votes") || "votes"}
                                </Chip>
                                <Button
                                    isIconOnly
                                    size="sm"
                                    color="primary"
                                    variant="light"
                                    onPress={() => handlePlayAudio(pronunciation.id, pronunciation.audioUrl)}
                                >
                                    {playingId === pronunciation.id ? (
                                        <PauseIcon className="w-4 h-4" />
                                    ) : (
                                        <PlayIcon className="w-4 h-4" />
                                    )}
                                </Button>
                            </div>
                        </div>
                    }
                >
                    <div className="space-y-4">
                        {/* Audio Player */}
                        <div>
                            <audio
                                controls
                                src={pronunciation.audioUrl}
                                className="w-full"
                                onPlay={() => {
                                    // Stop other audio if playing
                                    if (audio && playingId !== pronunciation.id) {
                                        audio.pause();
                                    }
                                    setPlayingId(pronunciation.id);
                                }}
                                onPause={() => setPlayingId(null)}
                                onEnded={() => setPlayingId(null)}
                            >
                                {t("audioNotSupported") || "Your browser does not support the audio element."}
                            </audio>
                        </div>

                        {/* Voting Section */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                                <Button
                                    isIconOnly
                                    size="sm"
                                    variant={pronunciation.userVote === 1 ? "solid" : "light"}
                                    color={pronunciation.userVote === 1 ? "success" : "default"}
                                    onPress={() => handleVote(pronunciation.id, 'up')}
                                    isDisabled={!session}
                                >
                                    <ArrowUpIcon className="w-4 h-4" />
                                </Button>
                                <span className="font-semibold text-sm px-2">{pronunciation.voteCount}</span>
                                <Button
                                    isIconOnly
                                    size="sm"
                                    variant={pronunciation.userVote === -1 ? "solid" : "light"}
                                    color={pronunciation.userVote === -1 ? "danger" : "default"}
                                    onPress={() => handleVote(pronunciation.id, 'down')}
                                    isDisabled={!session}
                                >
                                    <ArrowDownIcon className="w-4 h-4" />
                                </Button>
                            </div>

                            {!session && (
                                <div className="text-xs text-muted-foreground">
                                    {t("loginToVoteMessage") || "Login to vote on pronunciations"}
                                </div>
                            )}
                        </div>
                    </div>
                </AccordionItem>
            ))}
        </Accordion>
    );
};

export default PronunciationAccordion;


