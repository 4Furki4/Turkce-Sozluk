import React from 'react'
import { getTranslations } from 'next-intl/server';

export default async function NotFound() {
    const t = await getTranslations('ProfilePage');
    return (
        <div className='w-full bg-transparent'>
            <div className='flex items-center justify-center py-8'>
                <h1 className='text-fs-2'>{t('notFound')}</h1>
            </div>
        </div>
    )
}
