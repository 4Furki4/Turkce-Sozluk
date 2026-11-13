"use client";
import { FormDraft, useTaskDraft } from "@/src/hooks/use-task-draft";
import { TaskCancel, useTaskActions } from "@/src/components/task-pages/task-page";

import React, { useState, useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CreateWordRequestSchema, MeaningSchema as ApiMeaningSchema, RelatedWordSchema as ApiRelatedWordSchema, RelatedPhraseSchema as ApiRelatedPhraseSchema } from "@/src/server/api/schemas/requests";
import { Button } from "@heroui/react";
import { ChevronRight, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import { uploadFiles } from "@/src/utils/uploadthing";
import type { Session } from "@/src/lib/auth";

import { api } from "@/src/trpc/react";
import WordBasicInfoSection from "./word-basic-info-section";
import WordLanguageAndAttributesSection, { type Language, type WordAttribute } from "./word-language-and-attributes-section";
import MeaningFormSection from "./meaning-form-section";
import RelatedItemsSection from "./related-items-section";
import NewWordAttributeRequestModal from "@/src/components/customs/edit-request-modal/word/new-word-attribute-request-inline";
import NewMeaningAttributeRequestModal from "@/src/components/customs/edit-request-modal/meanings/new-meaning-attribute-request-inline";
import NewAuthorRequestModal from "@/src/components/customs/edit-request-modal/meanings/new-author-request-inline";

interface RelatedItem {
    id: number;
    name: string;
    relationType: string;
}

// Client-side Zod schemas for form validation
const ClientMeaningSchema = ApiMeaningSchema.extend({
    partOfSpeechId: z.string().optional(), // Form uses string for ID
    attributes: z.array(z.string()).optional(), // Form uses string for ID
    example: z.object({
        sentence: z.string().optional(),
        author: z.string().optional(), // Form uses string for ID
    }).optional(),
    image: z.array(z.instanceof(File)).optional(), // Form handles File objects
});

const ClientRelatedWordSchema = ApiRelatedWordSchema.extend({
    id: z.number(), // This is the word ID from the autocomplete
    name: z.string(), // This is the word name from the autocomplete
});

const ClientRelatedPhraseSchema = ApiRelatedPhraseSchema.extend({
    id: z.number(), // This is the phrase ID from the autocomplete
    name: z.string(), // This is the phrase name from the autocomplete
});

const ClientCreateWordRequestSchema = CreateWordRequestSchema.extend({
    languageCode: z.string().optional(), // Form uses languageCode
    attributes: z.array(z.string()).optional(), // Form uses string for ID
    meanings: z.array(ClientMeaningSchema).min(1, "At least one meaning is required"),
    relatedWords: z.array(ClientRelatedWordSchema).optional(),
    relatedPhrases: z.array(ClientRelatedPhraseSchema).optional(),
    captchaToken: z.string().optional(), // Captcha token is handled separately
});

interface RelatedItem {
    id: number;
    name: string;
    relationType: string;
}

export interface PartOfSpeech {
    id: number;
    name: string;
}

export interface MeaningAttribute {
    id: number;
    attribute: string;
}

export interface Author {
    id: number;
    name: string;
}

export interface DetailedContributionFormProps {
    session: Session | null;
    locale: "en" | "tr";
    prefillWord?: string;
    isSubmitting: boolean;
    setIsSubmitting: (submitting: boolean) => void;
}

export default function DetailedContributionForm({
    session,
    locale,
    prefillWord,
    isSubmitting,
    setIsSubmitting,
}: DetailedContributionFormProps) {
    const { complete } = useTaskActions();
    const t = useTranslations("ContributeWord");
    const tRequests = useTranslations("Requests");
    const tForms = useTranslations("Forms");
    const { executeRecaptcha } = useGoogleReCaptcha();

    const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
    const [isAttributeModalOpen, setIsAttributeModalOpen] = useState(false);
    const [isMeaningAttributeModalOpen, setIsMeaningAttributeModalOpen] = useState(false);
    const [isAuthorModalOpen, setIsAuthorModalOpen] = useState(false);
    const [requestedAttributes, setRequestedAttributes] = useState<string[]>([]);
    const [requestedMeaningAttributes, setRequestedMeaningAttributes] = useState<string[]>([]);
    const [requestedAuthors, setRequestedAuthors] = useState<string[]>([]);

    // Related items state
    const [relatedWords, setRelatedWords] = useState<RelatedItem[]>([]);
    const [relatedPhrases, setRelatedPhrases] = useState<RelatedItem[]>([]);

    const relatedDraft = useTaskDraft("word-detailed:related:" + (prefillWord ?? ""), { relatedWords, relatedPhrases, requestedAttributes, requestedMeaningAttributes, requestedAuthors }, value => { setRelatedWords(value.relatedWords); setRelatedPhrases(value.relatedPhrases); setRequestedAttributes(value.requestedAttributes); setRequestedMeaningAttributes(value.requestedMeaningAttributes); setRequestedAuthors(value.requestedAuthors); }, { relatedWords: [], relatedPhrases: [], requestedAttributes: [], requestedMeaningAttributes: [], requestedAuthors: [] });

    // API queries for existing data
    const { data: languages, isLoading: languagesIsLoading } = api.params.getLanguages.useQuery();
    const { data: partsOfSpeech, isLoading: partsOfSpeechIsLoading } = api.params.getPartOfSpeeches.useQuery();
    const { data: wordAttributesWithRequested, isLoading: wordAttributesWithRequestedIsLoading } = api.request.getWordAttributesWithRequested.useQuery();
    const { data: meaningAttributesWithRequested, isLoading: meaningAttributesWithRequestedIsLoading } = api.request.getMeaningAttributesWithRequested.useQuery();
    const { data: authorsWithRequested, isLoading: authorsWithRequestedIsLoading } = api.request.getAuthorsWithRequested.useQuery();

    // API mutations
    const createFullWordRequest = api.request.createFullWordRequest.useMutation();

    // Define client-side Zod schemas within the component to access tForms
    const ClientMeaningSchema = ApiMeaningSchema.extend({
        meaning: z.string().trim().min(1, tForms("Meanings.Required")),
        partOfSpeechId: z.string().optional(), // Form uses string for ID
        attributes: z.array(z.string()).optional(), // Form uses string for ID
        example: z.object({
            sentence: z.string().optional(),
            author: z.string().optional(), // Form uses string for ID
        }).optional(),
        image: z.array(z.instanceof(File)).optional(), // Form handles File objects
    });

    const ClientRelatedWordSchema = ApiRelatedWordSchema.extend({
        id: z.number(), // This is the word ID from the autocomplete
        name: z.string(), // This is the word name from the autocomplete
    });

    const ClientRelatedPhraseSchema = ApiRelatedPhraseSchema.extend({
        id: z.number(), // This is the phrase ID from the autocomplete
        name: z.string(), // This is the phrase name from the autocomplete
    });

    const ClientCreateWordRequestSchema = CreateWordRequestSchema.extend({
        languageCode: z.string().optional(), // Form uses languageCode
        attributes: z.array(z.string()).optional(), // Form uses string for ID
        name: z.string().trim().min(1, tForms("Word.Required")).min(2, tForms("Word.MinLength2")),
        meanings: z.array(ClientMeaningSchema).min(1, tForms("Meanings.MinLength1")),
        relatedWords: z.array(ClientRelatedWordSchema).optional(),
        relatedPhrases: z.array(ClientRelatedPhraseSchema).optional(),
        captchaToken: z.string().optional(), // Captcha token is handled separately
    });

    type DetailedFormData = z.infer<typeof ClientCreateWordRequestSchema>;

    // Detailed form setup
    const detailedForm = useForm<DetailedFormData>({
        resolver: zodResolver(ClientCreateWordRequestSchema),
        defaultValues: {
            name: prefillWord || "",
            phonetic: "",
            prefix: "",
            root: "",
            suffix: "",
            languageCode: "",
            attributes: [],
            meanings: [{
                partOfSpeechId: "",
                meaning: "",
                attributes: [],
                example: { sentence: "", author: "" },
                image: undefined,
            }],
        },
    });

    const { fields: meaningFields, append: appendMeaning, remove: removeMeaning } = useFieldArray({
        control: detailedForm.control,
        name: "meanings",
    });

    // Handle image selection for preview
    const handleImageSelect = useCallback((file: File, meaningIndex: number) => {
        try {
            // Validate file size (4MB limit)
            const ONE_MB = 1 * 1024 * 1024;
            if (file.size > ONE_MB) {
                toast.error(t("imageTooLarge"));
                return;
            }

            // Update form data
            const currentMeanings = detailedForm.getValues("meanings");
            currentMeanings[meaningIndex] = {
                ...currentMeanings[meaningIndex],
                image: [file],
            };
            detailedForm.setValue("meanings", currentMeanings);

            // Create preview URL
            const previewUrl = URL.createObjectURL(file);
            setImagePreviewUrls(prev => {
                const newUrls = [...prev];
                newUrls[meaningIndex] = previewUrl;
                return newUrls;
            });
        } catch (error) {
            console.error("Error selecting image:", error);
            toast.error(t("imageSelectError"));
        }
    }, [detailedForm, t]);

    // Remove image
    const removeImage = useCallback((meaningIndex: number) => {
        const currentMeanings = detailedForm.getValues("meanings");
        currentMeanings[meaningIndex] = {
            ...currentMeanings[meaningIndex],
            image: undefined,
        };
        detailedForm.setValue("meanings", currentMeanings);

        setImagePreviewUrls(prev => {
            const newUrls = [...prev];
            if (newUrls[meaningIndex]) {
                URL.revokeObjectURL(newUrls[meaningIndex]);
                newUrls[meaningIndex] = "";
            }
            return newUrls;
        });
    }, [detailedForm]);

    function handleRemoveMeaning(meaningIndex: number) {
        const previewUrl = imagePreviewUrls[meaningIndex];
        if (previewUrl) URL.revokeObjectURL(previewUrl);

        setImagePreviewUrls((urls) =>
            urls.slice(0, meaningIndex).concat(urls.slice(meaningIndex + 1)),
        );
        removeMeaning(meaningIndex);
    }

    // Related items handlers
    const handleAddRelatedWord = useCallback((item: RelatedItem) => {
        setRelatedWords(prev => {
            // Check if item already exists
            if (prev.some(word => word.id === item.id && word.relationType === item.relationType)) {
                toast.error(t("itemAlreadyAdded"));
                return prev;
            }
            return [...prev, item];
        });
    }, [t]);

    const handleRemoveRelatedWord = useCallback((id: number) => {
        setRelatedWords(prev => prev.filter(word => word.id !== id));
    }, []);

    const handleAddRelatedPhrase = useCallback((item: RelatedItem) => {
        setRelatedPhrases(prev => {
            // Check if item already exists
            if (prev.some(phrase => phrase.id === item.id && phrase.relationType === item.relationType)) {
                toast.error(t("itemAlreadyAdded"));
                return prev;
            }
            return [...prev, item];
        });
    }, [t]);

    const handleRemoveRelatedPhrase = useCallback((id: number) => {
        setRelatedPhrases(prev => prev.filter(phrase => phrase.id !== id));
    }, []);

    // Submit detailed form
    const onSubmitDetailed = async (data: DetailedFormData) => {
        if (!executeRecaptcha) {
            toast.error(t("captchaFailed"));
            return;
        }

        setIsSubmitting(true);
        try {
            const captchaToken = await executeRecaptcha("submit_full_word_request");

            // Upload images first
            const uploadedImageUrls: string[] = [];
            let imageIndex = 0;

            for (const meaning of data.meanings) {
                if (meaning.image?.[0]) {
                    const uploadResult = await uploadFiles("imageUploader", {
                        files: [meaning.image[0]],
                    });

                    if (uploadResult && uploadResult.length > 0) {
                        uploadedImageUrls[imageIndex] = uploadResult[0]!.url;
                    }
                    imageIndex++;
                }
            }

            // Reset imageIndex for the actual submission
            imageIndex = 0;

            const formattedData: z.infer<typeof CreateWordRequestSchema> = {
                name: data.name.trim(),
                phonetic: data.phonetic?.trim() || undefined,
                prefix: data.prefix?.trim() || undefined,
                root: data.root?.trim() || undefined,
                suffix: data.suffix?.trim() || undefined,
                language: data.languageCode || undefined,
                attributes: data.attributes?.map(attr => parseInt(attr)).filter(Boolean) || [],
                meanings: data.meanings.map((meaning) => ({
                    partOfSpeechId: meaning.partOfSpeechId ? parseInt(meaning.partOfSpeechId) : undefined,
                    meaning: meaning.meaning.trim(),
                    attributes: meaning.attributes?.map(attr => parseInt(attr)).filter(Boolean) || [],
                    example: meaning.example?.sentence?.trim() ? {
                        sentence: meaning.example.sentence.trim(),
                        author: meaning.example.author?.trim() ? parseInt(meaning.example.author.trim()) : undefined,
                    } : undefined,
                    imageUrl: meaning.image?.[0] ? uploadedImageUrls[imageIndex++] : undefined,
                })),
                captchaToken,
                relatedWords: relatedWords.map(word => ({
                    relatedWordId: word.id,
                    relationType: word.relationType,
                })),
                relatedPhrases: relatedPhrases.map(phrase => ({
                    relatedWordId: phrase.id,
                    relationType: phrase.relationType,
                })),
            };

            await createFullWordRequest.mutateAsync(formattedData);
            toast.success(t("requestSubmitted"));
            detailedForm.reset();
            complete();
            imagePreviewUrls.forEach((url) => { if (url) URL.revokeObjectURL(url); });
            setImagePreviewUrls([]);
            setRelatedWords([]);
            setRelatedPhrases([]);
        } catch (error: any) {
            console.error("Submission error:", error);
            if (error.message?.includes("already requested")) {
                toast.error(t("wordAlreadyRequested"));
            } else if (error.message?.includes("reCAPTCHA")) {
                toast.error(t("captchaFailed"));
            } else {
                toast.error(t("requestFailed"));
            }
        } finally {
            setIsSubmitting(false);
        }
    };
    const hasOptionalWordErrors = ["phonetic", "prefix", "root", "suffix", "languageCode", "attributes"].some((key) => key in detailedForm.formState.errors);

    return (
        <>
            <form onSubmit={detailedForm.handleSubmit(onSubmitDetailed)} className="space-y-6">
                <FormDraft identity={"word-detailed:new:" + (prefillWord ?? "")} control={detailedForm.control} reset={detailedForm.reset} baseline={detailedForm.formState.defaultValues as z.infer<typeof ClientCreateWordRequestSchema>} />
                {relatedDraft.notice}
                {/* Word Basic Info */}
                <WordBasicInfoSection
                    section="name"
                    control={detailedForm.control}
                    errors={detailedForm.formState.errors}
                />

                {/* Meanings Section */}
                <section aria-labelledby="contribution-meanings" className="space-y-4">
                    <h3 id="contribution-meanings" className="text-lg font-semibold">{t("meanings")}</h3>
                    <div className="space-y-4 divide-y divide-divider [&>*:not(:last-child)]:pb-4">
                        {meaningFields.map((field, meaningIndex) => (
                            <MeaningFormSection
                                key={field.id}
                                meaningIndex={meaningIndex}
                                control={detailedForm.control}
                                errors={detailedForm.formState.errors}
                                partsOfSpeech={partsOfSpeech?.map(pos => ({
                                    id: pos.id,
                                    name: (pos as any).partOfSpeech || (pos as any).name
                                })) as PartOfSpeech[]}
                                partsOfSpeechIsLoading={partsOfSpeechIsLoading}
                                meaningAttributesWithRequested={meaningAttributesWithRequested as MeaningAttribute[]}
                                meaningAttributesWithRequestedIsLoading={meaningAttributesWithRequestedIsLoading}
                                authorsWithRequested={authorsWithRequested as Author[]}
                                authorsWithRequestedIsLoading={authorsWithRequestedIsLoading}
                                requestedAuthors={requestedAuthors}
                                imagePreviewUrl={imagePreviewUrls[meaningIndex]}
                                onOpenMeaningAttributeModal={() => setIsMeaningAttributeModalOpen(true)}
                                onOpenAuthorModal={() => setIsAuthorModalOpen(true)}
                                onImageSelect={handleImageSelect}
                                onRemoveImage={removeImage}
                                onRemoveMeaning={handleRemoveMeaning}
                            />
                        ))}
                    </div>
                    <Button
                        type="button"
                        variant="bordered"
                        className="min-h-11 max-w-full whitespace-normal"
                        startContent={<Plus className="h-4 w-4 shrink-0" aria-hidden />}
                        onPress={() => appendMeaning({
                            partOfSpeechId: "",
                            meaning: "",
                            attributes: [],
                            example: { sentence: "", author: "" },
                            image: undefined,
                        }, { focusName: `meanings.${meaningFields.length}.meaning` })}
                    >
                        {t("addMeaning")}
                    </Button>
                </section>
                <details className="group/word-details rounded-lg border border-divider bg-background/40 px-4" open={hasOptionalWordErrors || undefined}>
                    <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 rounded-sm py-3 font-medium focus-visible:outline-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
                        <ChevronRight className="h-4 w-4 shrink-0 group-open/word-details:rotate-90" aria-hidden />
                        {t("wordDetails")}
                    </summary>
                    <div className="space-y-6 border-t border-divider py-4">
                        <p className="max-w-prose text-sm text-muted-foreground">{t("wordDetailsHelp")}</p>
                        <WordBasicInfoSection section="metadata" control={detailedForm.control} errors={detailedForm.formState.errors} />
                        {/* Language and Attributes */}
                        <WordLanguageAndAttributesSection
                            control={detailedForm.control}
                            errors={detailedForm.formState.errors}
                            languages={languages as Language[]}
                            languagesIsLoading={languagesIsLoading}
                            wordAttributesWithRequested={wordAttributesWithRequested as WordAttribute[]}
                            wordAttributesWithRequestedIsLoading={wordAttributesWithRequestedIsLoading}
                            requestedAttributes={requestedAttributes}
                            locale={locale}
                            onOpenAttributeModal={() => setIsAttributeModalOpen(true)}
                        />

                        {/* Related Words and Phrases */}
                        <RelatedItemsSection
                            relatedWords={relatedWords}
                            relatedPhrases={relatedPhrases}
                            onAddRelatedWord={handleAddRelatedWord}
                            onRemoveRelatedWord={handleRemoveRelatedWord}
                            onAddRelatedPhrase={handleAddRelatedPhrase}
                            onRemoveRelatedPhrase={handleRemoveRelatedPhrase}
                        />
                    </div>
                </details>
                <div className="flex flex-wrap items-center justify-end gap-2">
                    <TaskCancel />
                    <Button
                        type="submit"
                        color="primary"
                        size="md"
                        className="h-auto min-h-11 min-w-fit max-w-full flex-1 whitespace-normal py-2 sm:min-w-32 sm:flex-none"
                        isLoading={isSubmitting}
                        isDisabled={isSubmitting}
                    >
                        {t("submitForReview")}
                    </Button>
                </div>
            </form>

            {/* Request Modals */}
            <NewWordAttributeRequestModal
                isOpen={isAttributeModalOpen}
                onClose={() => setIsAttributeModalOpen(false)}
                onOpenChange={() => setIsAttributeModalOpen(false)}
            />

            <NewMeaningAttributeRequestModal
                isOpen={isMeaningAttributeModalOpen}
                onClose={() => setIsMeaningAttributeModalOpen(false)}
                onOpenChange={() => setIsMeaningAttributeModalOpen(false)}
            />

            <NewAuthorRequestModal
                isOpen={isAuthorModalOpen}
                onClose={() => setIsAuthorModalOpen(false)}
                onOpenChange={() => setIsAuthorModalOpen(false)}
            />
        </>
    );
}
