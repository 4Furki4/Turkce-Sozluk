"use client";
import { MeaningInputs, WordForm, WordFormSubmit } from "@/types";
import {
  Button,
  Progress,
} from "@heroui/react";
import React, { useCallback } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useTranslations } from 'next-intl';
import WordNameInput from "./create-word-form/inputs/word/name-input";
import WordPhoneticInput from "./create-word-form/inputs/word/phonetic-input";
import WordRootLanguageInput from "./create-word-form/inputs/word/root-language-input";
import WordRootOriginInput from "./create-word-form/inputs/word/root-origin-input";
import WordPrefixInput from "./create-word-form/inputs/word/prefix-input";
import WordSuffixInput from "./create-word-form/inputs/word/suffix-input";
import MeaningFieldArrayButtons from "./create-word-form/meaning-field-array-buttons";
import { toast } from "sonner";
import { api } from "@/src/trpc/react";
import WordAttributesInput from "./create-word-form/inputs/word/word-attributes";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import MeaningFieldArray from "./meaning-field-array";
import { uploadFiles } from "@/src/utils/uploadthing";


const meaningDefaultValues: MeaningInputs = {
  attributes: [],
  partOfSpeechId: undefined,
  meaning: undefined,
  image: undefined,
  example: {
    author: undefined,
    sentence: undefined,
  },
};
export default function CreateWord({ locale }: {
  locale: string;
}) {
  const t = useTranslations();
  const {
    handleSubmit,
    control,
    formState,
    clearErrors,
    watch,
    setError,
    getFieldState,
    setValue,
    getValues,
  } = useForm<WordForm>({
    defaultValues: {
      name: '',
      language: '',
      phonetic: '',
      root: '',
      prefix: '',
      suffix: '',
      attributes: [],
      meanings: [meaningDefaultValues],
    },
  });
  const { fields, append, prepend, remove } = useFieldArray({
    name: "meanings",
    control,
    rules: {
      required: {
        value: true,
        message: t('Dashboard.MustHaveAMeaning'),
      },
      minLength: {
        value: 1,
        message: t('Dashboard.MustHaveAMeaning'),
      },
    },
  });
  const [imagePreviewUrls, setImagePreviewUrls] = React.useState<string[]>([]);
  const wordMutation = api.admin.addWord.useMutation({
    onSuccess: () => {
      toast.success(t('Dashboard.WordCreated'))
    }
  });
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState<number | null>(null);

  const onSubmit = useCallback(async (data: WordForm) => {
    let { meanings } = data;
    const meaningsFormatted = meanings.map((meaning) => {
      return {
        ...meaning,
        partOfSpeechId: meaning.partOfSpeechId,
        example: meaning.example?.sentence && meaning.example?.sentence ? {
          sentence: meaning.example.sentence,
          author: meaning.example.author ? parseInt(meaning.example.author) : null,
        } : undefined,
        attributes: meaning.attributes?.map(attribute => parseInt(attribute))
      }
    })
    const uploadedPictures = meaningsFormatted.map(async (meaning) => {
      if (meaning.image?.[0]) {
        const files = [meaning.image[0]];
        const response = await uploadFiles(
          "imageUploader",
          {
            files,
            onUploadProgress({ file, progress }) {
              setUploadProgress(progress);
              toast.info(t('Dashboard.UploadingImages', { progress }));
              console.log(`Uploaded ${progress}% of ${file}`);
            },
            onUploadBegin({ file }) {
              toast.info(t('Dashboard.StartedUploading', { file }));
              console.log(`Started uploading ${file}`);
              setIsUploading(true);
            },
          }
        );
        return response[0].ufsUrl;

      }
      return undefined;
    });
    const hasImages = meaningsFormatted.some((meaning) => meaning.image?.[0]);
    const loadingToaster = hasImages ? toast.loading(t('Dashboard.UploadingImages')) : undefined;
    const uploadedPicturesUrls = await Promise.all(uploadedPictures);
    console.log('uploadedPicturesUrls', uploadedPicturesUrls);
    if (hasImages && loadingToaster) {
      setIsUploading(false);
      toast.dismiss(loadingToaster);
      toast.success(t('Dashboard.ImagesUploaded'));
    }
    const meaningsWithImages = meaningsFormatted.map((meaning, index) => ({
      ...meaning,
      image: uploadedPicturesUrls[index],
    }));
    const word = {
      ...data,
      attributes: data.attributes?.map((val) => parseInt(val)),
      meanings: meaningsWithImages,
    }
    wordMutation.mutate(word as WordFormSubmit)
    // reset();
  }, [wordMutation, setIsUploading, setImagePreviewUrls, t]);

  return (
    <section className="max-w-7xl w-full mx-auto">
      <h1 className="text-center text-fs-2">{t('Dashboard.CreateWord')}</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
        <div className="flex flex-col max-w-full sm:grid sm:grid-cols-2 gap-2">
          <WordNameInput control={control} />
          <WordPhoneticInput control={control} />
          <WordRootLanguageInput control={control} watch={watch} setError={setError} clearErrors={clearErrors} getFieldState={getFieldState} locale={locale} />
          <WordRootOriginInput control={control} watch={watch} setError={setError} clearErrors={clearErrors} getFieldState={getFieldState} />
          <WordPrefixInput control={control} />
          <WordSuffixInput control={control} />
          <WordAttributesInput setValue={setValue} control={control} />
        </div>
        {fields.length > 0 ? (
          <MeaningFieldArray
            fields={fields}
            control={control}
            clearErrors={clearErrors}
            watch={watch}
            setValue={setValue}
            remove={remove}
            formState={formState}
            setImagePreviewUrls={setImagePreviewUrls}
            imagePreviewUrls={imagePreviewUrls}
          />
        ) : (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t('Dashboard.Error')}</AlertTitle>
            <AlertDescription>
              {t('Dashboard.MustAddMeaning')}
            </AlertDescription>
          </Alert>
        )}
        <div className="flex flex-col gap-2">
          <MeaningFieldArrayButtons append={append} prepend={prepend} meaningDefaultValues={meaningDefaultValues} />
          <Button
            isLoading={wordMutation.isPending || isUploading}
            type="submit"
            variant="faded"
            color="primary"
            className="w-full"
            radius="md"
          >
            {t('Dashboard.CreateWord')}
          </Button>
          {isUploading && (
            <div className="flex justify-center">
              <Progress className="w-full" value={uploadProgress ?? undefined} />
            </div>
          )}
        </div>
      </form>
    </section>
  )
}
