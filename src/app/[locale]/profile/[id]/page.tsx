import { auth } from "@/src/lib/auth";
import { api } from '@/src/trpc/server';
import React from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import ProfilePageWrapper from '@/src/_pages/profile/profile-page-wrapper';
import { notFound } from 'next/navigation';
import { TRPCError } from '@trpc/server';
import { ErrorBoundary } from 'react-error-boundary';
import { Card, CardBody } from '@heroui/react';
import { headers } from "next/headers";
interface ProfilePageProps {
    params: Promise<{
        id: string;
        locale: string;
    }>;
}

export default async function ProfilePage({ params: paramsPromise }: ProfilePageProps) {
    const { id, locale } = await paramsPromise;
    setRequestLocale(locale);
    const t = await getTranslations('Common');
    const session = await auth.api.getSession({
        headers: await headers()
    });
    try {
        const profileData = await api.user.getPublicProfileData({ userId: id });

        return (
            <ErrorBoundary fallback={<Card className='w-full bg-transparent'>
                <CardBody className='flex items-center justify-center'>
                    <h1 className='text-fs-2'>{t('somethingWentWrong')}</h1>
                </CardBody>
            </Card>}>
                <ProfilePageWrapper profileData={profileData} userId={id} session={session} locale={locale} />
            </ErrorBoundary>
        )
    } catch (error) {

        if (error instanceof TRPCError && error.code === 'NOT_FOUND') {
            notFound();
        } else {

        }
    }
}
