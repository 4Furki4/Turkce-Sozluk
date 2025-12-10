import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { Session } from '@/src/lib/auth-client';
import { toast } from 'sonner';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { useDebounce } from '@uidotdev/usehooks';
import type { AppRouter } from '@/src/server/api/root';
import type { TRPCClientErrorLike } from '@trpc/client';

import { api } from '@/src/trpc/react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Autocomplete, AutocompleteItem, Textarea } from '@heroui/react';

export interface RelatedPhraseItem {
  related_phrase_id: number;
  related_phrase: string;
  description: string | null;
}

interface RelatedPhraseEditRequestModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  wordId: number;
  relatedPhrase: RelatedPhraseItem;
  session: Session | null;
}

const RelatedPhraseEditRequestModal: React.FC<RelatedPhraseEditRequestModalProps> = ({ isOpen, onOpenChange, wordId, relatedPhrase, session }) => {
  const t = useTranslations('EditRelatedPhraseModal');
  const t_general = useTranslations();
  const { executeRecaptcha } = useGoogleReCaptcha();

  const FormSchema = z.object({
    newPhraseId: z.number({ required_error: t('validation.newPhraseRequired') }),
    reason: z.string().optional(),
  });

  type FormValues = z.infer<typeof FormSchema>;

  const { control, handleSubmit, formState: { errors }, setValue } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
  });

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);
  const [items, setItems] = useState<{ id: number; name: string }[]>([]);

  const { data: wordOptions, isLoading: isSearchLoading } = api.word.getRecommendations.useQuery(
    { query: debouncedSearch, limit: 10 },
    { enabled: debouncedSearch.trim().length > 1 }
  );

  useEffect(() => {
    if (wordOptions) {
      setItems(wordOptions.map((word) => ({ id: word.word_id, name: word.name })));
    }
  }, [wordOptions]);

  const { mutate: requestReplacement, isPending } = api.request.requestEditRelatedPhrase.useMutation({
    onSuccess: () => {
      toast.success(t_general('SuccessMessages.UpdateRequestSent'));
      onOpenChange(false);
    },
    onError: (error: TRPCClientErrorLike<AppRouter>) => {
      toast.error(t_general('ErrorMessages.FailedToSendRequest', { error: error.message }));
    },
  });

  const onSubmit = async (data: FormValues) => {
    if (!executeRecaptcha) {
      toast.error(t_general('Errors.captchaError'));
      return;
    }
    try {
      const token = await executeRecaptcha('related_phrase_edit_request');
      requestReplacement({
        wordId: wordId,
        oldRelatedPhraseId: relatedPhrase.related_phrase_id,
        newRelatedPhraseId: data.newPhraseId,
        reason: data.reason,
        captchaToken: token,
      });
    } catch (error) {
      console.error('reCAPTCHA execution failed:', error);
      toast.error(t_general('Errors.captchaError'));
    }
  };

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
    }} isOpen={isOpen} onOpenChange={onOpenChange}>
      <ModalContent>
        {(onClose) => (
          <form onSubmit={handleSubmit(onSubmit)}>
            <ModalHeader>{t('modalTitle')}</ModalHeader>
            <ModalBody className="space-y-4">
              <p>
                {t('replacingPhraseLabel')}: <span className="font-semibold">{relatedPhrase.related_phrase}</span>
              </p>
              <Controller
                name="newPhraseId"
                control={control}
                render={({ field }) => (
                  <Autocomplete
                    label={t('newPhraseLabel')}
                    placeholder={t('newPhrasePlaceholder')}
                    items={items}
                    onSelectionChange={(id) => setValue('newPhraseId', Number(id), { shouldValidate: true })}
                    onInputChange={setSearch}
                    isLoading={isSearchLoading}
                    isInvalid={!!errors.newPhraseId}
                    errorMessage={errors.newPhraseId?.message}
                  >
                    {(item) => <AutocompleteItem key={item.id}>{item.name}</AutocompleteItem>}
                  </Autocomplete>
                )}
              />
              <Controller
                name="reason"
                control={control}
                render={({ field }) => (
                  <Textarea
                    {...field}
                    label={t('reasonLabel')}
                    placeholder={t('reasonPlaceholder')}
                    isInvalid={!!errors.reason}
                    errorMessage={errors.reason?.message}
                  />
                )}
              />
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" color="danger" onPress={onClose}>
                {t_general('Requests.buttons.cancel')}
              </Button>
              <Button color="primary" type="submit" isLoading={isPending}>
                {t_general('Requests.submitRequest')}
              </Button>
            </ModalFooter>
          </form>
        )}
      </ModalContent>
    </Modal>
  );
};


export default RelatedPhraseEditRequestModal;
