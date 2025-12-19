"use client";

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Avatar, Button, CardBody } from '@heroui/react';
import Image from 'next/image';


import EditProfileForm from './edit-profile-form';
import { type ProfileDataUser as ProfileData } from './user-profile-page-client';
import { useSnapshot } from 'valtio';
import { preferencesState } from '@/src/store/preferences';
import { User } from '@/src/lib/auth';
import CustomCard from '@/src/components/customs/heroui/custom-card';

interface UserProfileHeaderProps {
  profileData: ProfileData;
  locale: string;
  isOwnProfile: boolean;
  user: User | null;
  className?: string;
}

export function UserProfileHeader({ profileData, locale, isOwnProfile, user, className }: UserProfileHeaderProps) {
  const t = useTranslations('ProfilePage');
  const tCommon = useTranslations('Common');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { isBlurEnabled } = useSnapshot(preferencesState);

  const displayName = profileData.name || profileData.username || tCommon('anonymousUser');

  const joinDate = profileData.createdAt
    ? new Date(profileData.createdAt).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })
    : t('unknownDate');

  return (
    <>
      <CustomCard isBlurred={isBlurEnabled} className={` ${className}`}>
        <CardBody className="flex flex-col items-center gap-6 sm:flex-row">
          <Avatar
            src={profileData.image || undefined}
            alt={`${displayName}'s profile picture`}
            isBordered
            size="lg"
            className="w-24 h-24 flex-shrink-0"
            fallback={<Image src="/images/default-avatar.png" alt="Default Avatar" width={96} height={96} />}
          />
          <div className="flex-grow text-center sm:text-left">
            <h1 className="text-3xl font-bold">{displayName}</h1>
            {profileData.username && <p className="text-lg text-muted-foreground">@{profileData.username}</p>}

            <div className="mt-4 space-y-1 text-sm text-muted-foreground">
              <p>
                {t('memberSinceLabel')}: {joinDate}
              </p>
              <p>
                {t('totalContributionsLabel')}: {profileData.contributionStats.totalApproved}
              </p>
              {isOwnProfile && (
                <p><span className="font-medium">{t('emailLabel')}:</span> {profileData.email}</p>
              )}
            </div>

            {isOwnProfile && (
              <div className="mt-4">
                <Button color="primary" variant="solid" onPress={() => setIsModalOpen(true)}>
                  {t('editProfileButton')}
                </Button>
              </div>
            )}
          </div>
        </CardBody>
      </CustomCard>

      {isOwnProfile && user && <EditProfileForm isOpen={isModalOpen} onOpenChange={setIsModalOpen} user={user} />}
    </>
  );
}

