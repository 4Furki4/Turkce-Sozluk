import React, { useMemo } from 'react'
import { Control, FormState, UseFormClearErrors, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { WordForm } from '@/types';
import { Button, Card, CardBody } from '@heroui/react';
import WordMeaningInput from './create-word-form/inputs/meaning/word-meaning-input';
import MeaningPartOfSpeechInput from './create-word-form/inputs/meaning/part-of-speech-input';
import MeaningAttributesInput from './create-word-form/inputs/meaning/attributes-input';
import MeaningExampleSentenceInput from './create-word-form/inputs/meaning/example-sentence-input';
import MeaningExampleAuthorInput from './create-word-form/inputs/meaning/example-author-input';
import MeaningImageInput from './create-word-form/inputs/meaning/image-input';
import { api } from '@/src/trpc/react';
import { useTranslations } from 'next-intl';

export default function MeaningFieldArray({
    fields,
    control,
    clearErrors,
    watch,
    setValue,
    remove,
    formState,
    setImagePreviewUrls,
    imagePreviewUrls
}: {
    fields: {
        id: string;
        [key: string]: any;
    }[];
    control: Control<WordForm>;
    clearErrors: UseFormClearErrors<WordForm>;
    watch: UseFormWatch<WordForm>;
    setValue: UseFormSetValue<WordForm>;
    remove: (index: number) => void;
    formState: FormState<WordForm>;
    setImagePreviewUrls: React.Dispatch<React.SetStateAction<string[]>>;
    imagePreviewUrls: string[];
}) {
    const t = useTranslations();
    const [meaningAttributes] = api.params.getMeaningAttributes.useSuspenseQuery()
    const [authors] = api.params.getExampleSentenceAuthors.useSuspenseQuery()
    const [partOfSpeeches] = api.params.getPartOfSpeeches.useSuspenseQuery()

    const renderMeaningFields = useMemo(() => {
        return fields.map((field, index) => (
            <div key={field.id} className="w-full">
                <h2 className="text-center text-fs-1">{t('Meaning')}</h2>
                <Card className="mb-4 rounded-md">
                    <CardBody>
                        <WordMeaningInput index={index} control={control} />
                        <div className="sm:grid sm:grid-cols-2 gap-2">
                            <MeaningPartOfSpeechInput index={index} control={control} partOfSpeeches={partOfSpeeches} />
                            <MeaningAttributesInput index={index} control={control} meaningAttributes={meaningAttributes} setFieldValue={setValue} />
                            <MeaningExampleSentenceInput index={index} control={control} />
                            <MeaningExampleAuthorInput index={index} control={control} defaultExampleSentenceAuthors={authors} setFieldValue={setValue} clearErrors={clearErrors} watch={watch} />
                        </div>
                        <div className="grid gap-2">
                            <MeaningImageInput index={index} control={control} formState={formState} clearErrors={clearErrors} field={field} setImagePreviewUrls={setImagePreviewUrls} imagePreviewUrls={imagePreviewUrls} />
                        </div>
                        <Button className="rounded-md" onPress={() => remove(index)}>{t('RemoveMeaning')}</Button>
                    </CardBody>
                </Card>
            </div>
        ));
    }, [fields, control, partOfSpeeches, meaningAttributes, authors, clearErrors, watch, setValue, remove, formState, setImagePreviewUrls, imagePreviewUrls, t]);
    return (
        <div>
            {renderMeaningFields}
        </div>
    )
}
