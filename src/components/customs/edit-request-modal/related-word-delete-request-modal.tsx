"use client";
import React from 'react';

import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/react";
import { Textarea } from "@heroui/input";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/src/trpc/react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Session } from '@/src/lib/auth-client';
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import { cn } from '@/lib/utils';
import { useSnapshot } from 'valtio';
import { preferencesState } from '@/src/store/preferences';

interface RelatedWordItemType {
  related_word_id: number;
  related_word_name: string;
  relation_type?: string;
}

const deleteRequestSchema = z.object({
  reason: z.string(),
});

const getDeleteRequestSchemaIntl = (reasonRequired: string, reasonMinLength: string) => z.object({
  reason: z.string().min(1, reasonRequired).min(15, reasonMinLength),
});

type DeleteRequestForm = z.infer<typeof deleteRequestSchema>;

interface RelatedWordDeleteRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  wordId: number; // ID of the main word
  relatedWord: RelatedWordItemType;
  session: Session | null; // To ensure user is logged in, though WordCard handles visibility
}

export default function RelatedWordDeleteRequestModal({
  isOpen,
  onClose,
  wordId,
  relatedWord,
  session,
}: RelatedWordDeleteRequestModalProps) {
  const { isBlurEnabled } = useSnapshot(preferencesState);
  const t = useTranslations(); // Using generic t for now, can scope to 'WordCard' or a new 'Requests' scope
  const commonT = useTranslations("Common");
  const { executeRecaptcha } = useGoogleReCaptcha();

  const { mutate, isPending } = api.request.requestDeleteRelatedWord.useMutation({
    onSuccess: () => {
      toast.success(t("Requests.DeleteRequestSubmittedSuccessfully"));
      onClose();
    },
    onError: (error) => {
      toast.error(error.message || t("Requests.ErrorSubmittingRequest"));
    },
  });

  const { control, handleSubmit, reset } = useForm<DeleteRequestForm>({
    resolver: zodResolver(getDeleteRequestSchemaIntl(t("Requests.Forms.Reason.Required"), t("Requests.Forms.Reason.MinLength15"))),
    defaultValues: {
      reason: "",
    },
  });

  const onSubmit = async (data: DeleteRequestForm) => {
    if (!session?.user) {
      toast.error(t("Errors.MustBeLoggedIn"));
      return;
    }
    if (!executeRecaptcha) {
      toast.error(t("Errors.captchaError"));
      return;
    }
    try {
      const token = await executeRecaptcha("related_word_delete_request");
      mutate({
        wordId: wordId,
        relatedWordId: relatedWord.related_word_id,
        reason: data.reason,
        captchaToken: token,
      });
    } catch (error) {
      console.error("reCAPTCHA execution failed:", error);
      toast.error(t("Errors.captchaError"));
    }
  };

  // Reset form when modal is closed or relatedWord changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  // biome-ignore lint/correctness/useEffectHookFormReset: <explanation>
  React.useEffect(() => {
    if (isOpen) {
      reset({ reason: "" });
    }
  }, [isOpen, reset]);

  if (!relatedWord) return null;

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
      base: cn(
        "bg-background border-2 border-border rounded-sm p-2 w-full",
        { "bg-background/60 shadow-medium backdrop-blur-md backdrop-saturate-150 transition-transform-background motion-reduce:transition-none": isBlurEnabled }
      )
    }} isOpen={isOpen} onOpenChange={onClose} size="xl">
      <ModalContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <ModalHeader>
            {t("WordCard.SuggestDeletionForRelatedWordHeader", { relatedWordName: relatedWord.related_word_name })}
          </ModalHeader>
          <ModalBody>
            <p>
              {t("Requests.ConfirmDeleteRelatedWord", {
                relatedWordName: relatedWord.related_word_name,
                relationType: t(`RelationTypes.${relatedWord.relation_type}`) || commonT("unknownRelation")
              })}
            </p>
            <Controller
              name="reason"
              control={control}
              render={({ field, fieldState: { error } }) => (
                <Textarea
                  {...field}
                  label={t("Requests.Reason")}
                  placeholder={t("Requests.ReasonPlaceholderDeleteRelated")}
                  minRows={3}
                  isInvalid={!!error}
                  errorMessage={error?.message}
                />
              )}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onClose} type="button">
              {t("Dashboard.Announcements.cancel")}
            </Button>
            <Button color="danger" type="submit" isLoading={isPending}>
              {t("WordCard.RequestDeletion")}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
