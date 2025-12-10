import React, { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Autocomplete, AutocompleteItem, Textarea, Select, SelectItem } from '@heroui/react';
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

interface RelatedWordCreateRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  wordId: number;
  session: Session | null;
}

// TODO: Fetch these from a central place or define comprehensively
const relationTypes = [
  { id: 'synonym', name: 'Synonym' }, // These names should be translation keys
  { id: 'antonym', name: 'Antonym' },
  { id: 'relatedWord', name: 'Related Word' },
  { id: 'seeAlso', name: 'See Also' },
  { id: 'compoundWord', name: 'Compound Word' },
  { id: 'turkishEquivalent', name: 'Turkish Equivalent' },
  // Add other relevant types
];

const createRelatedWordSchema = z.object({
  relatedWordId: z.number({ required_error: 'Related word is required.' }), // Will be string then parsed, or directly number if select returns number
  relationType: z.string().min(1, 'Relation type is required.'),
  reason: z.string(),
});

const getCreateRelatedWordSchemaIntl = (relatedWordRequired: string, relationTypeRequired: string, reasonRequired: string, reasonMinLength: string) => z.object({
  relatedWordId: z.number({ required_error: relatedWordRequired }),
  relationType: z.string().min(1, relationTypeRequired),
  reason: z.string().min(1, reasonRequired).min(15, reasonMinLength),
});

type CreateRelatedWordFormValues = z.infer<typeof createRelatedWordSchema>;


const DEBOUNCE_DELAY = 300; // ms

const RelatedWordCreateRequestModal: React.FC<RelatedWordCreateRequestModalProps> = ({
  isOpen,
  onClose,
  wordId, // Changed from currentWordId
  session,
}) => {
  const { isBlurEnabled } = useSnapshot(preferencesState);
  const t = useTranslations('Requests');
  const tErrors = useTranslations("Errors")
  const tActions = useTranslations('Actions');
  const tRelationTypes = useTranslations('RelationTypes');
  const tForm = useTranslations('Form'); // For common form labels/errors
  const { executeRecaptcha } = useGoogleReCaptcha();

  const [inputValue, setInputValue] = useState('');
  const [debouncedInputValue, setDebouncedInputValue] = useState('');

  // Debounce input value
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedInputValue(inputValue);
    }, DEBOUNCE_DELAY);

    return () => {
      clearTimeout(handler);
    };
  }, [inputValue]);

  const { data: wordOptions, isLoading: isLoadingWords } = api.word.getRecommendations.useQuery(
    { query: debouncedInputValue, limit: 10 },
    {
      enabled: debouncedInputValue.trim().length > 1, // Only fetch if debounced input is long enough
    }
  );

  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CreateRelatedWordFormValues>({
    resolver: zodResolver(getCreateRelatedWordSchemaIntl(t("Forms.RelatedWord.Required"), t("Forms.RelationType.Required"), t("Forms.Reason.Required"), t("Forms.Reason.MinLength15"))),
    defaultValues: {
      relatedWordId: undefined,
      relationType: '',
      reason: '',
    },
    // Reset input value when form resets
    resetOptions: {
      keepDefaultValues: true,
    },
  });

  const createRequestMutation = api.request.requestCreateRelatedWord.useMutation({
    onSuccess: () => {
      toast.success(t('EditRequestSubmittedSuccessfully'));
      reset();
      setInputValue('');
      onClose();
    },
    onError: (error) => {
      toast.error(t('RequestSubmissionFailed', { error: error.message }));
    },
  });

  const onSubmit = async (data: CreateRelatedWordFormValues) => {
    if (!executeRecaptcha) {
      toast.error(tErrors('captchaError'));
      return;
    }
    try {
      const token = await executeRecaptcha('related_word_create_request');
      createRequestMutation.mutate({
        ...data,
        wordId: wordId,
        captchaToken: token,
      });
    } catch (error) {
      console.error('reCAPTCHA execution failed:', error);
      toast.error(tErrors('captchaError'));
    }
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
    }} isOpen={isOpen} onClose={() => { reset(); setInputValue(''); setDebouncedInputValue(''); onClose(); }} scrollBehavior="inside" backdrop="opaque">
      <ModalContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <ModalHeader>{t('CreateRelatedWordRequestTitle')}</ModalHeader>
          <ModalBody className="space-y-4">
            <Controller
              name="relatedWordId"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  label={tForm('relatedWordLabel')}
                  placeholder={tForm('searchWordPlaceholder')}
                  defaultItems={wordOptions || []}
                  inputValue={inputValue}
                  onInputChange={setInputValue}
                  selectedKey={field.value !== undefined ? field.value.toString() : null}
                  onSelectionChange={(key) => {
                    field.onChange(key ? parseInt(String(key), 10) : undefined);
                  }}
                  isInvalid={!!errors.relatedWordId}
                  errorMessage={errors.relatedWordId?.message}
                  isLoading={isLoadingWords}
                  allowsCustomValue={false} // User must select from the list
                  listboxProps={{
                    emptyContent: tForm('noWordsFound'),
                  }}
                  isRequired
                  onBlur={field.onBlur} // Important for RHF validation trigger
                  name={field.name} // Important for RHF
                // TODO: Consider if `inputProps={{ ref: field.ref }}` is needed or if RHF handles ref correctly with Autocomplete
                >
                  {(item) => (
                    <AutocompleteItem key={item.word_id} textValue={item.name}>
                      {item.name}
                    </AutocompleteItem>
                  )}
                </Autocomplete>
              )}
            />

            <Controller
              name="relationType"
              control={control}
              render={({ field }) => (
                <Select
                  label={tForm('relationTypeLabel')}
                  placeholder={tForm('selectRelationTypePlaceholder')}
                  isInvalid={!!errors.relationType}
                  errorMessage={errors.relationType?.message}
                  selectedKeys={field.value ? [field.value] : []}
                  onSelectionChange={(keys) => field.onChange(Array.from(keys)[0] as string)}
                  name={field.name}
                  ref={field.ref}
                  onBlur={field.onBlur}
                  isRequired
                >
                  {relationTypes.map((type) => (
                    <SelectItem key={type.id} textValue={tRelationTypes(type.id as any) || type.name}>
                      {tRelationTypes(type.id as any) || type.name}
                    </SelectItem>
                  ))}
                </Select>
              )}
            />

            <Controller
              name="reason"
              control={control}
              render={({ field }) => (
                <Textarea
                  {...field}
                  isRequired
                  label={t('Reason')}
                  placeholder={t('EnterReason')}
                  isInvalid={!!errors.reason}
                  errorMessage={errors.reason?.message}
                />
              )}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => { reset(); onClose(); }}>
              {tActions('Cancel')}
            </Button>
            <Button type="submit" color="primary" isLoading={createRequestMutation.isPending}>{t('submitRequest')}</Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
};

export default RelatedWordCreateRequestModal;

// Helper to get translation key for relation type, assuming they match IDs
// This might be better placed in a shared utils or constants file
// For now, it's here for simplicity.
const getRelationTypeTranslationKey = (relationTypeId: string) => {
  // This is a naive implementation. Ideally, you'd have a robust mapping
  // or ensure your translation keys in RelationTypes namespace match these IDs.
  return relationTypeId; // e.g., 'synonym', 'antonym'
};
