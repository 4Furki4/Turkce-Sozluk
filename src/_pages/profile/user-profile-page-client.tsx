"use client";

import React from 'react';
import { Link as NextIntlLink } from '@/src/i18n/routing'
import { Link as HeroUILink, CardHeader, CardBody, Tooltip } from '@heroui/react'
import { useTranslations } from 'next-intl';
import { type Session } from '@/src/lib/auth';
import { type RouterOutputs } from '@/src/trpc/shared';
import { UserProfileHeader } from './UserProfileHeader';
import { CheckCheck, Clock, X } from 'lucide-react';
import { useSnapshot } from 'valtio';
import { preferencesState } from '@/src/store/preferences';
import CustomCard from '@/src/components/customs/heroui/custom-card';

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
        <div className="container mx-auto px-4 py-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Profile Header - Spans 2 Columns */}
                <UserProfileHeader
                    profileData={profileData}
                    locale={locale}
                    isOwnProfile={isOwnProfile}
                    user={session?.user ?? null}
                    className="md:col-span-2 h-full"
                />

                {/* Contribution Stats - Spans 1 Column */}
                <CustomCard isBlurred={isBlurEnabled} className="md:col-span-1 h-full transition-colors">
                    <CardHeader className="pb-2">
                        <h3 className="text-lg font-semibold text-foreground/90">{t('contributionStatsTitle')}</h3>
                    </CardHeader>
                    <CardBody className="pt-0">
                        <div className="grid grid-cols-2 gap-3 h-full content-center">
                            <div className="p-3 bg-zinc-500/10 rounded-xl border border-zinc-500/20 flex flex-col items-center justify-center gap-1 group hover:bg-zinc-500/20 transition-colors">
                                <p className="text-2xl font-bold text-foreground">{totalPoints}</p>
                                <p className="text-xs text-muted-foreground text-center line-clamp-1">{t('totalContributionPointsLabel')}</p>
                            </div>
                            <div className="p-3 bg-green-500/10 rounded-xl border border-green-500/20 flex flex-col items-center justify-center gap-1 group hover:bg-green-500/20 transition-colors">
                                <div className="flex items-center gap-1">
                                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{totalApprovedCount}</p>
                                    <CheckCheck className="h-4 w-4 text-green-500" />
                                </div>
                                <p className="text-xs text-muted-foreground text-center line-clamp-1">{t('approvedContributionsLabel')}</p>
                            </div>
                            <div className="p-3 bg-yellow-500/10 rounded-xl border border-yellow-500/20 flex flex-col items-center justify-center gap-1 group hover:bg-yellow-500/20 transition-colors">
                                <div className="flex items-center gap-1">
                                    <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{totalPendingCount}</p>
                                    <Clock className="h-4 w-4 text-yellow-500" />
                                </div>
                                <p className="text-xs text-muted-foreground text-center line-clamp-1">{t('pendingContributionsLabel')}</p>
                            </div>
                            <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20 flex flex-col items-center justify-center gap-1 group hover:bg-red-500/20 transition-colors">
                                <div className="flex items-center gap-1">
                                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">{totalRejectedCount}</p>
                                    <X className="h-4 w-4 text-red-500" />
                                </div>
                                <p className="text-xs text-muted-foreground text-center line-clamp-1">{t('rejectedContributionsLabel')}</p>
                            </div>
                        </div>
                    </CardBody>
                </CustomCard>

                {/* Badges Section - Spans Full Width (3 Columns) */}
                <CustomCard isBlurred={isBlurEnabled} className="md:col-span-3 transition-colors">
                    <CardHeader>
                        <h3 className="text-lg font-semibold text-foreground/90">{t('badgesTitle')}</h3>
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
                                        <div className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-200 hover:scale-105 cursor-help ${badge.earned ? 'bg-primary/10 border-primary/20' : 'bg-muted/50 border-muted grayscale opacity-60'}`}>
                                            <div className="text-4xl mb-2 filter drop-shadow-sm">{badge.icon}</div>
                                            <p className="font-semibold text-center text-sm">{name}</p>
                                            {badge.earned && (
                                                <p className="text-xs text-muted-foreground mt-1 text-center">
                                                    {new Date(badge.awardedAt).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })}
                                                </p>
                                            )}
                                        </div>
                                    </Tooltip>
                                );
                            })}
                            {(!(profileData as any).badges || (profileData as any).badges.length === 0) && (
                                <p className="text-muted-foreground col-span-full text-center py-8 italic">{t('noBadges')}</p>
                            )}
                        </div>
                    </CardBody>
                </CustomCard>

                {/* Saved Words Section - Spans 1 Column (Only for Own Profile) */}
                {isOwnProfile && (
                    <CustomCard isBlurred={isBlurEnabled} className="md:col-span-1 h-[500px] transition-colors">
                        <CardHeader className="flex justify-between items-center pb-2">
                            <h3 className="text-lg font-semibold text-foreground/90">{t('savedWordsTitle')}</h3>
                            <NextIntlLink href="/saved-words" className="text-xs font-mono text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest">
                                {t('seeAllSavedWords', { count: profileData.totalSavedWordsCount ?? 0 })}
                            </NextIntlLink>
                        </CardHeader>
                        <CardBody className="pt-0 overflow-y-auto custom-scrollbar">
                            {savedWordsToRender.length > 0 ? (
                                <ul className="space-y-2">
                                    {savedWordsToRender.map((savedWord) => (
                                        <li key={savedWord.wordId}>
                                            <HeroUILink as={NextIntlLink} href={`/search/${savedWord.wordName}`} className="block w-full text-left">
                                                <div className="p-3 bg-zinc-500/5 hover:bg-zinc-500/10 rounded-lg border border-transparent hover:border-zinc-500/20 transition-all duration-200 group">
                                                    <div className="flex justify-between items-start">
                                                        <span className="font-medium text-foreground group-hover:text-primary transition-colors">{savedWord.wordName}</span>
                                                        <span className="text-[10px] text-muted-foreground bg-zinc-500/10 px-1.5 py-0.5 rounded-full">
                                                            {new Date(savedWord.savedAt).toLocaleDateString(locale, { month: 'short', day: 'numeric' })}
                                                        </span>
                                                    </div>
                                                    {savedWord.firstMeaning && (
                                                        <p className="text-xs text-muted-foreground truncate mt-1 group-hover:text-foreground/80 transition-colors">
                                                            {savedWord.firstMeaning}
                                                        </p>
                                                    )}
                                                </div>
                                            </HeroUILink>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center p-4 text-muted-foreground">
                                    <p>{t('noSavedWords')}</p>
                                </div>
                            )}
                        </CardBody>
                    </CustomCard>
                )}

                {/* Recent Contributions Section - Spans 2 Columns (or 3 if not own) */}
                <CustomCard isBlurred={isBlurEnabled} className={`${isOwnProfile ? 'md:col-span-2' : 'md:col-span-3'} h-[500px] transition-colors`} >
                    <CardHeader className="flex justify-between items-center pb-2">
                        <h3 className="text-lg font-semibold text-foreground/90">{t('recentContributionsTitle')}</h3>
                        <NextIntlLink href={{ pathname: '/my-requests', query: { status: 'approved' } }} className="text-xs font-mono text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest">
                            {t('seeAllContributions')}
                        </NextIntlLink>
                    </CardHeader>
                    <CardBody className="pt-0 overflow-y-auto custom-scrollbar">
                        {contributionsToRender.length > 0 ? (
                            <ul className="space-y-2">
                                {contributionsToRender.map((contribution) => {
                                    let displayText = `${tAction(contribution.requestType)} - ${tEntity(contribution.entityType)}`;
                                    if (contribution.word?.word) {
                                        displayText = `${contribution.word.word} (${tEntity(contribution.entityType)} - ${tAction(contribution.requestType)})`;
                                    }
                                    return (
                                        <li key={contribution.id}>
                                            <NextIntlLink className='block w-full' href={{
                                                pathname: '/my-requests/[id]',
                                                params: { id: contribution.id }
                                            }}>
                                                <div className="p-3 bg-zinc-500/5 hover:bg-zinc-500/10 rounded-lg border border-transparent hover:border-zinc-500/20 transition-all duration-200 group flex items-center justify-between gap-4">
                                                    <div className="truncate flex-1">
                                                        <span className="font-medium text-foreground group-hover:text-primary transition-colors block truncate">{displayText}</span>
                                                        <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                                            {new Date(contribution.createdAt).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })}
                                                        </span>
                                                    </div>
                                                    <div className="flex-shrink-0">
                                                        <span className={`text-[10px] font-mono px-2 py-1 rounded-full uppercase tracking-wider border ${contribution.status === 'APPROVED' ? 'bg-green-500/10 text-green-600 border-green-500/20' :
                                                            contribution.status === 'REJECTED' ? 'bg-red-500/10 text-red-600 border-red-500/20' :
                                                                'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
                                                            }`}>
                                                            {tStatus(contribution.status)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </NextIntlLink>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center p-4 text-muted-foreground">
                                <p>{t('noContributions')}</p>
                            </div>
                        )}
                    </CardBody>
                </CustomCard>
            </div>
        </div>
    );

}