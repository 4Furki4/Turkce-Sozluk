"use client"
import { Button } from "@heroui/button"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { api } from "@/src/trpc/react"
import { toast } from "sonner"
import { CustomInput } from "@/src/components/customs/heroui/custom-input"
import { CustomAutocomplete } from "@/src/components/customs/heroui/custom-autocomplete"
import { AutocompleteItem } from "@heroui/react"
import { CustomTextarea } from "@/src/components/customs/heroui/custom-textarea"
import { WordSearchResult } from "@/types"
import WordAttributesRequestInput from "./word/word-attributes-request-input"
import { useTranslations, useLocale } from "next-intl";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import { AudioRecorder } from "@/src/components/customs/audio-recorder";
import { CustomTabs } from "@/src/components/customs/heroui/custom-tabs"
import { Tab } from "@heroui/react"
import CustomCard from "@/src/components/customs/heroui/custom-card"
import { CardBody } from "@heroui/react"

const wordEditRequestSchema = z.object({
  language: z.string().optional(),
  name: z.string().min(1, "Word name is required"),
  phonetic: z.string().optional(),
  prefix: z.string().optional(),
  root: z.string().optional(),
  suffix: z.string().optional(),
  attributes: z.array(z.string()).optional(),
  reason: z.string().min(1, 'ReasonRequired').min(15, 'ReasonMinLength15')
})

const getWordEditRequestIntlSchema = (wordNameRequired: string, reasonRequired: string, reasonMinLength: string) => z.object({
  language: z.string().optional(),
  name: z.string().min(1, wordNameRequired),
  phonetic: z.string().optional(),
  prefix: z.string().optional(),
  root: z.string().optional(),
  suffix: z.string().optional(),
  attributes: z.array(z.string()).optional(),
  reason: z.string().min(1, reasonRequired).min(15, reasonMinLength)
})

export type WordEditRequestForm = z.infer<typeof wordEditRequestSchema>

export default function WordEditRequest({
  data: { word_data },
  onClose,
}: {
  data: WordSearchResult
  onClose: () => void
}) {
  const locale = useLocale();
  const t = useTranslations();
  const tRequests = useTranslations("Requests");
  const { executeRecaptcha } = useGoogleReCaptcha();
  const { data: languages, isLoading: languagesIsLoading } = api.params.getLanguages.useQuery()
  const { data: wordAttributesWithRequested, isLoading: wordAttributesWithRequestedIsLoading } = api.request.getWordAttributesWithRequested.useQuery()

  const {
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, dirtyFields },

  } = useForm<WordEditRequestForm>({
    resolver: zodResolver(getWordEditRequestIntlSchema(t("Forms.Word.Required"), t("Requests.Forms.Reason.Required"), t("Requests.Forms.Reason.MinLength15"))),
    defaultValues: {
      name: word_data.word_name,
      phonetic: word_data.phonetic ?? "",
      prefix: word_data.prefix ?? "",
      suffix: word_data.suffix ?? "",
      root: word_data.root.root ?? "",
      attributes: word_data.attributes?.map((at) => at.attribute_id.toString()) ?? [],
      language: word_data.root.language_code ?? "",
      reason: "",
    },
  })
  const { mutate, isPending } = api.request.requestEditWord.useMutation({
    onSuccess: () => {
      toast.success(t("Requests.EditRequestSubmittedSuccessfully"))

      onClose()
    },
    onError: (error) => {
      toast.error(error.message)
    }
  })
  const onSubmit = async (data: WordEditRequestForm) => {
    if (!executeRecaptcha) {
      toast.error(t("Errors.captchaError"));
      return;
    }
    try {
      const token = await executeRecaptcha("word_edit_request");
      const preparedData = {
        word_id: word_data.word_id,
        reason: data.reason,
        ...Object.keys(dirtyFields).reduce<Record<string, unknown>>((acc, key) => {
          if (dirtyFields[key as keyof typeof dirtyFields] && key !== 'reason') {
            acc[key] = data[key as keyof typeof data];
          }
          return acc;
        }, {}),
        captchaToken: token
      }
      if (Object.keys(dirtyFields).filter((key) => key !== 'reason').length === 0) {
        toast.error(tRequests("NoChanges"))
        return
      }
      mutate(preparedData)

    } catch (error) {
      console.error("reCAPTCHA execution failed:", error);
      toast.error(t("Errors.captchaError"));
    }
  }

  return (
    <div className="flex w-full flex-col">
      <CustomTabs disableAnimation aria-label="Word Edit Options">
        <Tab key="edit" title={t("Requests.EditWord")}>
          <CustomCard>
            <CardBody>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                <Controller
                  name="name"
                  control={control}
                  render={({ field, fieldState: { error } }) => (
                    <CustomInput
                      {...field}
                      label={t("WordName")}
                      labelPlacement="outside"
                      placeholder={t("EnterWordName")}
                      isInvalid={!!error}
                      errorMessage={error?.message}
                    />
                  )}
                />



                <div className="grid grid-cols-2 gap-4">
                  <Controller
                    name="prefix"
                    control={control}
                    render={({ field, fieldState: { error } }) => (
                      <CustomInput
                        {...field}
                        label={t("Prefix")}
                        labelPlacement="outside"
                        placeholder={t("EnterPrefix")}
                        isInvalid={!!error}
                        errorMessage={error?.message}
                      />
                    )}
                  />
                  <Controller
                    name="suffix"
                    control={control}
                    render={({ field, fieldState: { error } }) => (
                      <CustomInput
                        {...field}
                        label={t("Suffix")}
                        labelPlacement="outside"
                        placeholder={t("EnterSuffix")}
                        isInvalid={!!error}
                        errorMessage={error?.message}
                      />
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">

                  <Controller
                    name="language"
                    control={control}
                    render={({ field, fieldState: { error } }) => (
                      <CustomAutocomplete
                        radius='sm'
                        {...field}
                        label={t("Language")}
                        isLoading={languagesIsLoading}
                        labelPlacement='outside'
                        defaultItems={languages || []}
                        placeholder={t("EnterLanguage")}
                        defaultSelectedKey={word_data.root.language_code}
                        onSelectionChange={(item) => {
                          field.onChange(item);
                          setValue("language", item as string)
                        }}
                        isInvalid={error !== undefined}
                        errorMessage={error?.message}
                      >
                        {(language) => (
                          <AutocompleteItem key={language.language_code} >
                            {locale === "en" ? language.language_en : language.language_tr}
                          </AutocompleteItem>
                        )}
                      </CustomAutocomplete>
                    )}
                  />

                  <Controller
                    name="root"
                    control={control}
                    render={({ field, fieldState: { error } }) => (
                      <CustomInput
                        {...field}
                        label={t("Root")}
                        labelPlacement="outside"
                        placeholder={t("EnterRoot")}
                        isInvalid={!!error}
                        errorMessage={error?.message}
                      />
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <WordAttributesRequestInput
                    wordAttributes={wordAttributesWithRequested}
                    wordAttributesIsLoading={wordAttributesWithRequestedIsLoading}
                    control={control}
                  />
                  <Controller
                    name="phonetic"
                    control={control}
                    render={({ field, fieldState: { error } }) => (
                      <CustomInput
                        {...field}
                        label={t("Phonetic")}
                        labelPlacement="outside"
                        placeholder={t("EnterPhonetic")}
                        isInvalid={!!error}
                        errorMessage={error?.message}
                      />
                    )}
                  />
                </div>

                <Controller
                  name="reason"
                  control={control}
                  render={({ field, fieldState: { error } }) => (
                    <CustomTextarea
                      {...field}
                      label={tRequests("Reason")}
                      placeholder={tRequests("EnterReason")}
                      labelPlacement="outside"
                      isInvalid={!!error}
                      errorMessage={error?.message}
                      className="w-full"
                    />
                  )}
                />

                <div className="flex justify-end space-x-2">
                  <Button color="secondary" variant="flat" type="submit" isLoading={isPending}>
                    {t("Requests.submitRequest")}
                  </Button>
                </div>
              </form>
            </CardBody>
          </CustomCard>
        </Tab>
        <Tab key="pronunciation" title={t("Pronunciation.title")}>
          <CustomCard>
            <CardBody>
              <AudioRecorder wordId={word_data.word_id} onUploadComplete={onClose} />
            </CardBody>
          </CustomCard>
        </Tab>
      </CustomTabs>
    </div>
  )
}
