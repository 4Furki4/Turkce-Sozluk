"use client";

import React from 'react';
import { Link as NextIntlLink } from '@/src/i18n/routing'
import { CardFooter, Link as HeroUILink } from '@heroui/react'
import { useTranslations } from 'next-intl';
import { type Session } from '@/src/lib/auth';
import { type RouterOutputs } from '@/src/trpc/shared';
import { UserProfileHeader } from './UserProfileHeader';
import { Card, CardHeader, CardBody, Tooltip } from '@heroui/react';
import { CheckCheck, Clock, X } from 'lucide-react';
import { useSnapshot } from 'valtio';
import { preferencesState } from '@/src/store/preferences';

export type ProfileDataUser = RouterOutputs['user']['getPublicProfileData'];

interface ContributionStats {
    totalApproved: number;
    byType: Record<string, number>;
    totalPoints: number;
    totalPending: number;
    totalRejected: number;
}

interface ProfileDataWithContributionPoints extends ProfileDataUser {
    contributionStats: ContributionStats;
}

// Define ContributionData based on expected structure from profileData.contributions
export type ContributionData = {
    id: string;
    entityType: string;
    word?: { word: string } | null; // Assuming word can be null or have a word property
    requestType: string;
    createdAt: string | Date;
    status: string;
};

// Define SavedWordData based on expected structure from profileData.savedWords
export type SavedWordData = {
    wordId: number; // Assuming wordId is a number based on typical DB IDs
    wordName: string; // Assuming wordName is always present
    savedAt: string | Date;
    firstMeaning: string | null; // Assuming firstMeaning can be null
};

interface UserProfilePageClientProps {
    profileData: ProfileDataUser | null;
    session: Session | null;
    locale: string;
}

export function UserProfilePageClient({ profileData, session, locale }: UserProfilePageClientProps) {
    const t = useTranslations('ProfilePage');
    const tEntity = useTranslations('Requests.entityTypes');
    const tAction = useTranslations('RequestActions');
    const tStatus = useTranslations('RequestStatuses');
    const { isBlurEnabled } = useSnapshot(preferencesState);

    if (!profileData) {
        return (
            <div className="container mx-auto px-4 py-8">
                <p>{t('loadingProfileError')}</p>
            </div>
        );
    }

    const isOwnProfile = session?.user?.id === profileData.id;

    // Safely access contributions and savedWords, defaulting to empty arrays
    const contributionsToRender: ContributionData[] = profileData.recentContributions || [];
    const savedWordsToRender: SavedWordData[] = (profileData as any).savedWords || [];

    // Safely access contributionStats, defaulting counts to 0
    const rawStats = profileData.contributionStats;
    const totalApprovedCount = rawStats?.totalApproved ?? 0;
    const totalPoints = (rawStats as any)?.totalPoints ?? 0;
    const totalPendingCount = (rawStats as any)?.totalPending ?? 0;
    const totalRejectedCount = (rawStats as any)?.totalRejected ?? 0;

    return (
        <div className="container mx-auto px-4 py-8 space-y-8">
            <UserProfileHeader profileData={profileData} locale={locale} isOwnProfile={isOwnProfile} user={session?.user ?? null} />
            {/* Contribution Stats Section */}
            <Card isBlurred={isBlurEnabled} className="border border-border rounded-sm p-2 w-full" classNames={{
                base: "bg-background/10",
            }}>
                <CardHeader>
                    <h3 className="text-lg font-semibold">{t('contributionStatsTitle')}</h3>
                </CardHeader>
                <CardBody>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="p-4 bg-background/50 rounded-md shadow-sm text-center border">
                            <p className="text-2xl font-bold">{totalPoints}</p>
                            <div className="w-full flex items-center justify-center gap-1">
                                <p className=" text-muted-foreground">{t('totalContributionPointsLabel')}</p>
                            </div>
                        </div>
                        <div className="p-4 bg-background/50 rounded-md shadow-sm text-center border">
                            <p className="text-2xl font-bold">{totalApprovedCount}</p>
                            <div className="w-full flex items-center justify-center gap-1">
                                <p className=" text-muted-foreground">{t('approvedContributionsLabel')}</p>
                                <CheckCheck className="h-5 w-5 text-green-500" />
                            </div>
                        </div>
                        <div className="p-4 bg-background/50 rounded-md shadow-sm text-center border">
                            <p className="text-2xl font-bold">{totalPendingCount}</p>
                            <div className="w-full flex items-center justify-center gap-1">
                                <p className=" text-muted-foreground">{t('pendingContributionsLabel')}</p>
                                <Clock className="h-5 w-5 text-yellow-500" />
                            </div>
                        </div>
                        <div className="p-4 bg-background/50 rounded-md shadow-sm text-center border">
                            <p className="text-2xl font-bold">{totalRejectedCount}</p>
                            <div className="w-full flex items-center justify-center gap-1">
                                <p className=" text-muted-foreground">{t('rejectedContributionsLabel')}</p>
                                <X className="h-5 w-5 text-red-500" />
                            </div>
                        </div>
                    </div>
                </CardBody>
            </Card>

            {/* Badges Section */}
            <Card isBlurred={isBlurEnabled} className="border border-border rounded-sm p-2 w-full" classNames={{
                base: "bg-background/10",
            }}>
                <CardHeader>
                    <h3 className="text-lg font-semibold">{t('badgesTitle')}</h3>
                </CardHeader>
                <CardBody>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {(profileData as any).badges?.map((badge: any) => {
                            const name = locale === 'tr' ? badge.nameTr : badge.nameEn;
                            const description = locale === 'tr' ? badge.descriptionTr : badge.descriptionEn;

                            return (
                                <Tooltip
                                    key={badge.slug}
                                    content={badge.earned ? `${name}: ${description}` : `${t('lockedBadge')}: ${description}`}
                                >
                                    <div className={`flex flex-col items-center justify-center p-4 rounded-lg border ${badge.earned ? 'bg-primary/10 border-primary/20' : 'bg-muted/50 border-muted grayscale opacity-70'}`}>
                                        <div className="text-4xl mb-2">{badge.icon}</div>
                                        <p className="font-semibold text-center text-sm">{name}</p>
                                        {badge.earned && (
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {new Date(badge.awardedAt).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })}
                                            </p>
                                        )}
                                    </div>
                                </Tooltip>
                            );
                        })}
                        {(!(profileData as any).badges || (profileData as any).badges.length === 0) && (
                            <p className="text-muted-foreground col-span-full">{t('noBadges')}</p>
                        )}
                    </div>
                </CardBody>
            </Card>

            {/* Saved Words Section */}
            {isOwnProfile && (
                <Card isBlurred={isBlurEnabled} className="border border-border rounded-sm p-2 w-full" classNames={{
                    base: "bg-background/10",
                }}>
                    <CardHeader>
                        <h3 className="text-lg font-semibold">{t('savedWordsTitle')}</h3>
                    </CardHeader>
                    <CardBody>
                        {savedWordsToRender.length > 0 ? (
                            <ul className="space-y-3">
                                {savedWordsToRender.map((savedWord) => (
                                    <li key={savedWord.wordId} className="p-3 bg-background rounded-md shadow-sm border">
                                        <HeroUILink as={NextIntlLink} href={`/search/${savedWord.wordName}`}>{savedWord.wordName}</HeroUILink>
                                        {/* <p className="font-medium">{savedWord.wordName || t('unknownWord')}</p> */}
                                        {savedWord.firstMeaning && <p className="text-sm text-muted-foreground truncate">{savedWord.firstMeaning}</p>}
                                        <p className="text-xs text-muted-foreground">
                                            {t('savedOnLabel')}: {new Date(savedWord.savedAt).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-muted-foreground">{t('noSavedWords')}</p>
                        )}
                    </CardBody>
                    <CardFooter>

                        <NextIntlLink href={{
                            pathname: '/saved-words',
                        }} className='text-primary hover:underline'>
                            {t('seeAllSavedWords', { count: profileData.totalSavedWordsCount ?? 0 })}
                        </NextIntlLink>
                    </CardFooter>
                </Card>
            )}

            {/* Recent Contributions Section */}
            <Card isBlurred={isBlurEnabled} className="border border-border rounded-sm p-2 w-full" classNames={{
                base: "bg-background/10",
            }}>
                <CardHeader>
                    <h3 className="text-lg font-semibold">{t('recentContributionsTitle')}</h3>
                </CardHeader>
                <CardBody>
                    {contributionsToRender.length > 0 ? (
                        <ul className="space-y-3">
                            {contributionsToRender.map((contribution) => {

                                let displayText = `${tAction(contribution.requestType)} - ${tEntity(contribution.entityType)}`;
                                if (contribution.word?.word) {
                                    displayText = `${contribution.word.word} (${tEntity(contribution.entityType)} - ${tAction(contribution.requestType)})`;
                                }
                                return (
                                    <li key={contribution.id} className="p-3 bg-background rounded-md shadow-sm border">
                                        <NextIntlLink className='text-primary hover:underline' href={{
                                            pathname: '/my-requests/[id]',
                                            params: {
                                                id: contribution.id
                                            }
                                        }}>
                                            {displayText}
                                        </NextIntlLink>
                                        <p className="text-xs text-muted-foreground">
                                            {new Date(contribution.createdAt).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })} - {tStatus(contribution.status)}
                                        </p>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <p className="text-muted-foreground">{t('noContributions')}</p>
                    )}
                </CardBody>
                <CardFooter>
                    <NextIntlLink href={{
                        pathname: '/my-requests',
                        query: {
                            status: 'approved'
                        }
                    }} className="text-primary hover:underline">
                        {t('seeAllContributions')} ({profileData.contributionStats.totalApproved})
                    </NextIntlLink>
                </CardFooter>
            </Card>
        </div>
    );
}