import CustomCard from '@/src/components/customs/heroui/custom-card';
import { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import React from 'react'




export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    setRequestLocale(locale);
    const t = await getTranslations("VerifyRequest");
    return {
        title: t("title"),
        description: t("description"),
        robots: {
            index: false,
            googleBot: {
                index: false,
            },
        },
    }
}



export default async function VerifyRequest({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    const t = await getTranslations("VerifyRequest");
    return (
        <div className="flex items-center justify-center mx-auto p-4">
            <CustomCard className='border-2 border-border max-w-4xl h-max p-2 sm:p-8 flex items-center justify-center'>
                <div className="pb-3">
                    <h1>{t("title")}</h1>
                </div>
                <div>
                    <p>{t("description")}</p>
                </div>
            </CustomCard>
        </div>
    )
}
