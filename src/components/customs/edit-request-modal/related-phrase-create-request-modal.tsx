import React, { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Textarea, Autocomplete, AutocompleteItem } from '@heroui/react';
import { useDebounce } from '@uidotdev/usehooks';
import { useTranslations } from 'next-intl';
import { Session } from '@/src/lib/auth-client';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '@/src/trpc/react';
import { toast } from 'sonner';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { cn } from '@/lib/utils';
import { useSnapshot } from 'valtio';
import { preferencesState } from '@/src/store/preferences';

interface SimpleWord {
  id: number;
  name: string;
}

interface RelatedPhraseCreateRequestModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  wordId: number;
  session: Session | null;
}

const createRelatedPhraseSchema = z.object({
  relatedPhraseId: z.number({ required_error: 'This field is required.' }),
  reason: z.string().min(1, 'ReasonRequired').min(15, 'ReasonMinLength15')
});

const getCreateRelatedPhraseSchemaIntl = (relatedPhraseIdRequired: string, reasonRequired: string, reasonMinLength: string) => z.object({
  relatedPhraseId: z.number({ required_error: relatedPhraseIdRequired }),
  reason: z.string().min(1, reasonRequired).min(15, reasonMinLength),
});

type CreateRelatedPhraseFormValues = z.infer<typeof createRelatedPhraseSchema>;

const RelatedPhraseCreateRequestModal: React.FC<RelatedPhraseCreateRequestModalProps> = ({
  isOpen,
  onOpenChange,
  wordId,
  session,
}) => {
  const { isBlurEnabled } = useSnapshot(preferencesState);
  const t = useTranslations('Requests');
  const tActions = useTranslations('Actions');
  const tForm = useTranslations('Form');
  const { executeRecaptcha } = useGoogleReCaptcha();

  const { control, handleSubmit, reset, formState: { errors } } = useForm<CreateRelatedPhraseFormValues>({
    resolver: zodResolver(getCreateRelatedPhraseSchemaIntl(t("Forms.RelatedWord.Required"), t("Forms.Reason.Required"), t("Forms.Reason.MinLength15"))),
    defaultValues: {
      reason: '',
    },
  });

  const createRequestMutation = api.request.requestCreateRelatedPhrase.useMutation({
    onSuccess: () => {
      toast.success(t('RequestSubmittedSuccessfully'));
      reset();
      onOpenChange(false);
    },
    onError: (error: { message: string }) => {
      toast.error(t('RequestSubmissionFailed', { error: error.message }));
    },
  });

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const { data: wordOptions, isLoading: isLoadingSearch } = api.word.getRecommendations.useQuery(
    { query: debouncedSearchQuery, limit: 10 },
    { enabled: debouncedSearchQuery.trim().length > 1 }
  );

  const [items, setItems] = useState<SimpleWord[]>([]);

  useEffect(() => {
    if (wordOptions) {
      setItems(wordOptions.map((word) => ({ id: word.word_id, name: word.name })));
    }
  }, [wordOptions]);

  const onSubmit = async (data: CreateRelatedPhraseFormValues) => {
    if (!executeRecaptcha) {
      toast.error(t("Errors.captchaError"));
      return;
    }
    const token = await executeRecaptcha("word_edit_request");
    createRequestMutation.mutate({
      wordId: wordId,
      phraseId: data.relatedPhraseId,
      reason: data.reason,
      captchaToken: token
    });
  };

  if (!session) return null;

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
    }} isOpen={isOpen} onOpenChange={onOpenChange} scrollBehavior="inside" backdrop="opaque">
      <ModalContent>
        {(onClose) => (
          <form onSubmit={handleSubmit(onSubmit)}>
            <ModalHeader>{t('CreateRelatedPhraseRequestTitle')}</ModalHeader>
            <ModalBody className="space-y-4">
              <Controller
                name="relatedPhraseId"
                control={control}
                render={({ field }) => (
                  <Autocomplete
                    label={tForm('relatedPhraseWordLabel')} // Placeholder for new translation key
                    placeholder={tForm('relatedPhraseWordPlaceholder')} // Placeholder for new translation key
                    items={items}
                    selectedKey={field.value ? String(field.value) : null}
                    onSelectionChange={(key) => field.onChange(key ? Number(key) : null)}
                    onInputChange={setSearchQuery}
                    isLoading={isLoadingSearch}
                    isInvalid={!!errors.relatedPhraseId}
                    errorMessage={errors.relatedPhraseId?.message}
                    allowsCustomValue={false}
                    isRequired
                    listboxProps={{
                      emptyContent: tForm('noWordsFound')
                    }}
                  >
                    {(item: SimpleWord) => (
                      <AutocompleteItem key={item.id} textValue={item.name}>
                        {item.name}
                      </AutocompleteItem>
                    )}
                  </Autocomplete>
                )}
              />
              <Controller
                name="reason"
                control={control}
                render={({ field, fieldState: { error } }) => (
                  <Textarea
                    {...field}
                    isRequired
                    label={t('Reason')}
                    placeholder={t('ReasonPlaceholderDeleteRelated')}
                    isInvalid={!!error}
                    errorMessage={error?.message}
                    minRows={3}
                  />
                )}
              />
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={onClose}>
                {tActions('Cancel')}
              </Button>
              <Button type="submit" color="primary" isLoading={createRequestMutation.isPending}>
                {t('SubmitRequest')}
              </Button>
            </ModalFooter>
          </form>
        )}
      </ModalContent>
    </Modal>
  );
};

export default RelatedPhraseCreateRequestModal;
