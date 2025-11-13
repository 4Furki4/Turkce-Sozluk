"use client"
import React from 'react'
import { Card, CardHeader, CardBody, Button } from '@heroui/react'
import { useSnapshot } from 'valtio';
import { preferencesState } from '@/src/store/preferences';
import Image from 'next/image';
import { formatDate } from '@/src/utils/date';
import { Link } from "@/src/i18n/routing";
import { useTranslations } from 'next-intl';
type Announcement = {
    id: number;
    slug: string;
    status: string;
    imageUrl: string | null;
    actionUrl: string | null;
    actionTextKey: string | null;
    publishedAt: Date | null;
    createdAt: Date;
    title: string | null;
    excerpt: string | null;
}

export default function Announcement({
    announcement,
    locale,
}: {
    announcement: Announcement;
    locale: string;
}) {
    const { isBlurEnabled } = useSnapshot(preferencesState)
    const t = useTranslations('Announcements');
    return (
        <Card classNames={{
            base: "bg-background/10",
        }} key={announcement.id} className="border border-border rounded-sm p-2 w-full" isBlurred={isBlurEnabled}>
            <CardHeader className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">{announcement.title}</h2>
                <span className="text-sm text-gray-500">
                    {formatDate(announcement.publishedAt, locale)}
                </span>
            </CardHeader>

            <CardBody>
                {announcement.imageUrl && (
                    <div className="mb-4 relative w-full h-48">
                        <Image
                            src={announcement.imageUrl}
                            alt={announcement.title || ""}
                            fill
                            className="object-cover rounded-md"
                        />
                    </div>
                )}

                <p className="text-gray-400 mb-4">{announcement.excerpt}</p>

                <div className="flex justify-end">
                    <Link href={{ pathname: "/announcements/[slug]", params: { slug: encodeURIComponent(announcement.slug) } }}>
                        <Button color="primary">
                            {t("readMore")}
                        </Button>
                    </Link>
                </div>
            </CardBody>
        </Card>
    )
}
