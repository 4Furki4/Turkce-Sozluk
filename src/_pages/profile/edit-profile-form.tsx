"use client";

import React, { useState, useRef, type ChangeEvent, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input, Avatar } from '@heroui/react';
import Image from 'next/image';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { api } from '@/src/trpc/react';

import { uploadFiles } from '@/src/utils/uploadthing';
import { User } from '@/src/lib/auth';


// Zod Schema for name and username
const profileFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long.'),
  username: z.string().min(3, 'Username must be at least 3 characters long.').regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores.'),
});

type ProfileFormData = z.infer<typeof profileFormSchema>;

interface EditProfileFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  user: User
}

const MAX_FILE_SIZE_MB = 1;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export default function EditProfileForm({ isOpen, onOpenChange, user }: EditProfileFormProps) {
  const t = useTranslations('ProfilePage.editProfileModal');
  const utils = api.useUtils();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(user.image || null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const { control, handleSubmit, formState: { errors }, reset } = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: user.name || '',
      username: user.username || '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        name: user.name || '',
        username: user.username || '',
      });
      setSelectedFile(null);
      setPreviewUrl(user.image || null); // Reset preview to current user image or null
      setFileError(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } else {
      // Clear states when modal is closed, especially if not submitted
      setSelectedFile(null);
      setPreviewUrl(null);
      setFileError(null);
    }
  }, [isOpen, user, reset]);

  const updateProfileMutation = api.profile.updateProfile.useMutation({
    onSuccess: async () => {
      toast.success(t('updateSuccess'));
      await utils.user.getPublicProfileData.invalidate({ userId: user.id! });
      // Session update will be handled by NextAuth's session management if image URL in session changes
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || t('updateError'));
    },
  });

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setFileError(t('fileTooLarge', { size: MAX_FILE_SIZE_MB }));
        setSelectedFile(null);
        setPreviewUrl(user.image || null); // Revert to original image on error
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        setFileError(t('invalidFileType'));
        setSelectedFile(null);
        setPreviewUrl(user.image || null); // Revert to original image on error
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
      setFileError(null);
    }
  };

  const handleRemovePreview = () => {
    setSelectedFile(null);
    setPreviewUrl(user.image || null); // Revert to original user image
    setFileError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    let imageUrl = user.image; // Keep current image by default

    if (selectedFile && previewUrl !== user.image) { // Only upload if a new file is selected and it's different
      setIsUploadingImage(true);
      try {
        const uploadResult = await uploadFiles("imageUploader", { files: [selectedFile] });
        if (uploadResult && uploadResult[0]?.url) {
          imageUrl = uploadResult[0].url;
        } else {
          toast.error(t('uploadErrorGeneric'));
          setIsUploadingImage(false);
          return; // Don't proceed if upload failed
        }
      } catch (error) {
        toast.error(t('uploadErrorGeneric') + (error instanceof Error ? `: ${error.message}` : ''));
        setIsUploadingImage(false);
        return; // Don't proceed if upload failed
      }
      setIsUploadingImage(false);
    }

    updateProfileMutation.mutate({
      ...data,
      image: imageUrl === null ? undefined : imageUrl,
    });
  };

  const currentAvatarSrc = previewUrl || '/images/default-avatar.png';

  return (
    <Modal motionProps={{
      variants: {
        enter: {
          opacity: 1,
          transition: {
            duration: 0.1,
            ease: 'easeInOut',
          }
        },
        exit: {
          opacity: 0,
          transition: {
            duration: 0.1,
            ease: 'easeInOut',
          }
        },
      }
    }} classNames={{
      base: "shadow-medium bg-background/40 backdrop-blur-md backdrop-saturate-150 transition-transform-background motion-reduce:transition-none border-2 border-border rounded-sm p-2 w-full",
    }} isOpen={isOpen} onOpenChange={onOpenChange} scrollBehavior="inside">
      <ModalContent>
        {(onClose) => (
          <form onSubmit={handleSubmit(onSubmit)}>
            <ModalHeader>{t('title')}</ModalHeader>
            <ModalBody className="space-y-6">
              <div className="flex flex-col items-center space-y-4">
                <Avatar
                  src={currentAvatarSrc}
                  alt={t('profilePictureAlt')}
                  size="lg"
                  className="w-32 h-32"
                  isBordered
                  fallback={<Image src="/images/default-avatar.png" alt="Default Avatar" width={128} height={128} />}
                />
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept={ACCEPTED_IMAGE_TYPES.join(',')}
                  className="hidden"
                />
                <div className="flex space-x-2">
                  <Button type="button" variant="bordered" onPress={() => fileInputRef.current?.click()}>
                    {t('changePictureButton')}
                  </Button>
                  {(previewUrl && previewUrl !== user.image) && (
                    <Button type="button" color="danger" variant="light" onPress={handleRemovePreview}>
                      {t('removePreviewButton')}
                    </Button>
                  )}
                </div>
                {fileError && <p className="text-sm text-danger">{fileError}</p>}
              </div>

              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    label={t('nameLabel')}
                    placeholder={t('namePlaceholder')}
                    isInvalid={!!errors.name}
                    errorMessage={errors.name?.message}
                    className="mb-4"
                  />
                )}
              />
              <Controller
                name="username"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    label={t('usernameLabel')}
                    placeholder={t('usernamePlaceholder')}
                    isInvalid={!!errors.username}
                    errorMessage={errors.username?.message}
                  />
                )}
              />
            </ModalBody>
            <ModalFooter>
              <Button color="danger" variant="light" onPress={() => {
                handleRemovePreview(); // Also clear any pending changes on explicit cancel
                onClose();
              }}>
                {t('cancel')}
              </Button>
              <Button
                color="primary"
                type="submit"
                isLoading={updateProfileMutation.isPending || isUploadingImage}
              >
                {isUploadingImage ? t('uploadingButton') : t('saveChanges')}
              </Button>
            </ModalFooter>
          </form>
        )}
      </ModalContent>
    </Modal>
  );
}
