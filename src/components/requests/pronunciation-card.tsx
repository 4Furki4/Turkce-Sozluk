"use client";

import { FC, useState } from "react";
import { Link } from "@/src/i18n/routing";
import { useTranslations } from "next-intl";
import { api } from "@/src/trpc/react";
import { RouterOutputs } from "@/src/trpc/shared";
import {
    CardHeader,
    CardBody,
    CardFooter,
    Avatar,
    Popover,
    PopoverTrigger,
    PopoverContent,
    Button,
} from "@heroui/react";
import { PlayIcon, ArrowUpIcon, ArrowDownIcon } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useLocale } from 'next-intl';
import CustomCard from "../customs/heroui/custom-card";

type PronunciationRequest = RouterOutputs["request"]["getVotablePronunciationRequests"]["requests"][number];

interface PronunciationCardProps extends PronunciationRequest { }

export const PronunciationCard: FC<PronunciationCardProps> = ({ request, user, word, voteCount, hasVoted, userVote }) => {
    const locale = useLocale();
    const t = useTranslations("PronunciationVoting");
    const utils = api.useUtils();
    const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

    const { mutate: toggleVote } = api.vote.toggleVote.useMutation({
        onMutate: async ({ requestId, voteType }) => {
            await utils.request.getVotablePronunciationRequests.cancel();
            const previousData = utils.request.getVotablePronunciationRequests.getData();

            utils.request.getVotablePronunciationRequests.setData({
                search: "",
                limit: 10,
                sortBy: "createdAt",
                sortOrder: "desc",
                page: 1,
            }, (oldData) => {
                if (!oldData) return oldData;
                return {
                    ...oldData,
                    requests: oldData.requests.map((item) => {
                        if (item.request.id === requestId) {
                            let newVoteCount = Number(item.voteCount);
                            const currentVote = item.userVote;
                            const voteValue = voteType === 'up' ? 1 : -1;
                            if (currentVote === voteValue) { // Toggling off
                                newVoteCount -= voteValue;
                            } else if (currentVote === -voteValue) { // Changing vote
                                newVoteCount += 2 * voteValue;
                            } else { // New vote
                                newVoteCount += voteValue;
                            }

                            return {
                                ...item,
                                voteCount: newVoteCount,
                                hasVoted: currentVote !== voteValue,
                                userVote: currentVote === voteValue ? 0 : voteValue,
                            };
                        }
                        return item;
                    }),
                };
            });

            return { previousData };
        },
        onError: (err, newVote, context) => {
            toast.error(t("voteError"));
            if (context?.previousData) {
                utils.request.getVotablePronunciationRequests.setData({
                    search: "",
                    limit: 10,
                    sortBy: "createdAt",
                    sortOrder: "desc",
                    page: 1,
                }, context.previousData);
            }
        },
        onSettled: () => {
            utils.request.getVotablePronunciationRequests.invalidate();
        },
    });

    const handlePlayAudio = () => {
        const audioUrl = (request.newData as { audio_url: string }).audio_url;
        if (audio) {
            audio.pause();
            setAudio(null);
        }
        const newAudio = new Audio(audioUrl);
        setAudio(newAudio);
        newAudio.play();
    };

    const handleVote = (voteType: 'up' | 'down') => {
        toggleVote({ requestId: request.id, voteType });
    };

    return (
        <CustomCard>
            <CardHeader className="justify-between">
                <div className="flex gap-5">
                    <Popover>
                        <PopoverTrigger>
                            <Avatar isBordered radius="full" size="md" src={user?.image || ''} />
                        </PopoverTrigger>
                        <PopoverContent>
                            <div className="px-1 py-2">
                                <div className="text-small font-bold">{user?.name}</div>
                                <div className="text-tiny">{t("userDetails")}</div>
                            </div>
                        </PopoverContent>
                    </Popover>
                    <div className="flex flex-col gap-1 items-start justify-center">
                        <h4 className="text-small font-semibold leading-none text-default-600">{user?.name}</h4>
                        <h5 className="text-small tracking-tight text-default-400">
                            {formatDistanceToNow(new Date(request.requestDate), {
                                addSuffix: true,
                                locale: locale === 'tr' ? tr : undefined,
                            })}
                        </h5>
                    </div>
                </div>
                <Button
                    isIconOnly
                    color="primary"
                    variant="light"
                    onPress={handlePlayAudio}
                >
                    <PlayIcon className="w-6 h-6" />
                </Button>
            </CardHeader>
            <CardBody className="px-3 py-0 text-small text-default-400">
                <Link href={{
                    pathname: '/search/[word]',
                    params: {
                        word: word?.name || ''
                    }
                }} className="font-bold text-lg text-primary hover:underline max-w-max">
                    {word?.name}
                </Link>
            </CardBody>
            <CardFooter className="gap-3">
                <div className="flex gap-1 items-center">
                    <Button isIconOnly size="sm" variant={userVote === 1 ? "solid" : "light"} color={userVote === 1 ? "primary" : "default"} onPress={() => handleVote('up')}>
                        <ArrowUpIcon className="w-5 h-5" />
                    </Button>
                    <p className="font-semibold text-default-400 text-small">{voteCount}</p>
                    <Button isIconOnly size="sm" variant={userVote === -1 ? "solid" : "light"} color={userVote === -1 ? "danger" : "default"} onPress={() => handleVote('down')}>
                        <ArrowDownIcon className="w-5 h-5" />
                    </Button>
                </div>
                <div className="flex gap-1">
                    <p className="text-default-400 text-small">{t("reasonLabel")}</p>
                    <p className="font-semibold text-default-400 text-small">{request.reason || t("noReasonProvided")}</p>
                </div>
            </CardFooter>
        </CustomCard>
    );
};
