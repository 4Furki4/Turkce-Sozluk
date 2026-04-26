"use client";

import { useState } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations, useLocale } from "next-intl";
import { api } from "@/src/trpc/react";
import { toast } from "sonner";
import {
    Button,
    Modal,
    ModalBody,
    ModalContent,
    ModalHeader,
    Input,
    Textarea,
    Autocomplete,
    AutocompleteItem,
    Popover,
    PopoverTrigger,
    PopoverContent,
    Checkbox,
} from "@heroui/react";
import { type Session } from "@/src/lib/auth";
import { cn } from "@/lib/utils";
import { useSnapshot } from "valtio";
import { preferencesState } from "@/src/store/preferences";
import { useRouter } from "@/src/i18n/routing";
import { startNavigationProgress } from "@/src/lib/navigation-progress";

// Zod schema for form validation
const suggestionSchema = z.object({
    foreignTerm: z.string().min(1, "Error.foreignTermRequired"),
    languageId: z.string().min(1, "Error.languageRequired"),
    foreignMeaning: z.string().min(1, "Error.meaningRequired"),
    suggestedTurkishWord: z.string().min(1, "Error.turkishWordRequired"),
    isNewWord: z.boolean().default(true),
    reason: z.string().optional(),
});

type SuggestionFormValues = z.infer<typeof suggestionSchema>;

export function ForeignTermSuggestionModal({
    children,
    session,
    variant = "button",
    className,
}: {
    children: React.ReactNode;
    session: Session | null;
    variant?: "button" | "link";
    className?: string;
}) {
    const { isBlurEnabled } = useSnapshot(preferencesState);
    const [isOpen, setIsOpen] = useState(false);
    const t = useTranslations("ForeignTermSuggestions.form");
    const tError = useTranslations("Errors");
    const tGlobal = useTranslations("Navbar");
    const utils = api.useUtils();
    const router = useRouter();
    const locale = useLocale();

    const {
        register,
        handleSubmit,
        control,
        reset,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<SuggestionFormValues>({
        resolver: zodResolver(suggestionSchema),
        defaultValues: { isNewWord: true },
    });

    // Watch isNewWord to conditionally render input
    const isNewWord = useWatch({ control, name: "isNewWord" });

    // Word search state for existing words
    const [wordSearchTerm, setWordSearchTerm] = useState("");
    const { data: wordSearchResults, isLoading: wordSearchLoading } =
        api.word.searchWordsSimple.useQuery(
            { query: wordSearchTerm, limit: 20 },
            { enabled: wordSearchTerm.length > 1 && !isNewWord }
        );

    // Fetch languages for dropdown
    const { data: languages, isLoading: languagesLoading } = api.foreignTermSuggestion.getLanguages.useQuery();

    const createSuggestion = api.foreignTermSuggestion.create.useMutation({
        onSuccess: () => {
            toast.success(t("submitSuccess"));
            utils.foreignTermSuggestion.list.invalidate();
            setIsOpen(false);
            reset();
        },
        onError: (error) => {
            toast.error(tError(error.message as any));
        },
    });

    const onSubmit = async (data: SuggestionFormValues) => {
        createSuggestion.mutate({
            ...data,
            languageId: parseInt(data.languageId, 10),
        });
    };

    // If user is not logged in, render the trigger inside a Popover
    if (!session) {
        const PopoverTriggerElement =
            variant === "link" ? (
                <Button
                    color="primary"
                    disableRipple
                    disableAnimation
                    variant="light"
                    className={cn(
                        "p-0 m-0 h-max text-base text-text-foreground/60 data-[hover]:dark:bg-transparent data-[hover]:bg-transparent opacity-70 cursor-not-allowed",
                        className
                    )}
                >
                    {children}
                </Button>
            ) : (
                <Button
                    color="primary"
                    variant="light"
                    className={cn(
                        "p-0 m-0 h-max text-base text-text-foreground/60 data-[hover]:dark:bg-transparent data-[hover]:bg-transparent opacity-70 cursor-not-allowed",
                        className
                    )}
                >
                    {children}
                </Button>
            );

        return (
            <Popover showArrow placement="top">
                <PopoverTrigger className="self-start">{PopoverTriggerElement}</PopoverTrigger>
                <PopoverContent>
                    <div className="px-2 py-2">
                        <div className="text-small font-bold">{t("authRequiredTitle")}</div>
                        <div className="text-tiny">
                            {t("authRequiredDescription")}{" "}
                            <Button
                                color="primary"
                                variant="light"
                                onPress={() => {
                                    startNavigationProgress();
                                    router.push({
                                        pathname: "/signin",
                                        query: {
                                            backTo: window.location.pathname,
                                        },
                                    });
                                }}
                                className="p-0 m-0 h-max text-base font-semibold data-[hover]:dark:bg-transparent data-[hover]:bg-transparent data-[hover]:text-primary data-[hover]:underline data-[hover]:underline-offset-2 text-primary underline underline-offset-2"
                                disableAnimation
                                disableRipple
                            >
                                {tGlobal("Sign In")}
                            </Button>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        );
    }

    // If user is logged in, render the fully functional modal
    const Trigger =
        variant === "link" ? (
            <Button
                variant="light"
                onPress={() => setIsOpen(true)}
                disableAnimation
                disableRipple
                className={cn(
                    "p-0 m-0 h-max text-base data-[hover]:dark:bg-transparent data-[hover]:bg-transparent",
                    className
                )}
            >
                {children}
            </Button>
        ) : (
            <Button color="primary" onPress={() => setIsOpen(true)} className={className}>
                {children}
            </Button>
        );

    return (
        <>
            {Trigger}
            <Modal
                motionProps={{
                    variants: {
                        enter: {
                            opacity: 1,
                            transition: {
                                duration: 0.1,
                                ease: "easeInOut",
                            },
                        },
                        exit: {
                            opacity: 0,
                            transition: {
                                duration: 0.1,
                                ease: "easeInOut",
                            },
                        },
                    },
                }}
                classNames={{
                    base: cn("bg-background border-2 border-border rounded-md p-2 w-full", {
                        "bg-background/60 shadow-medium backdrop-blur-md backdrop-saturate-150 transition-transform-background motion-reduce:transition-none":
                            isBlurEnabled,
                    }),
                }}
                size="2xl"
                scrollBehavior="inside"
                backdrop="opaque"
                isOpen={isOpen}
                onOpenChange={setIsOpen}
            >
                <ModalContent>
                    {(close) => (
                        <>
                            <ModalHeader>{t("title")}</ModalHeader>
                            <ModalBody>
                                <p className="text-muted-foreground pb-4">{t("description")}</p>
                                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                                    {/* Foreign Term */}
                                    <div>
                                        <label htmlFor="foreignTerm" className="font-semibold">
                                            {t("foreignTerm")}
                                        </label>
                                        <Input
                                            id="foreignTerm"
                                            {...register("foreignTerm")}
                                            placeholder={t("foreignTermPlaceholder")}
                                            className="mt-2"
                                        />
                                        {errors.foreignTerm && (
                                            <p className="text-red-500 text-sm mt-1">
                                                {t(errors.foreignTerm.message as any)}
                                            </p>
                                        )}
                                    </div>

                                    {/* Language */}
                                    <div>
                                        <Controller
                                            name="languageId"
                                            control={control}
                                            render={({ field, fieldState: { error } }) => (
                                                <Autocomplete
                                                    radius="md"
                                                    label={t("language")}
                                                    placeholder={t("selectLanguage")}
                                                    labelPlacement="outside"
                                                    isLoading={languagesLoading}
                                                    defaultItems={languages || []}
                                                    selectedKey={field.value}
                                                    onSelectionChange={(key) => {
                                                        field.onChange(key?.toString() || "");
                                                    }}
                                                    classNames={{
                                                        listboxWrapper: "rounded-md",
                                                        popoverContent: "rounded-md",
                                                        base: "rounded-md mt-2",
                                                    }}
                                                    errorMessage={error?.message ? t(error.message as any) : ""}
                                                    isInvalid={error !== undefined}
                                                >
                                                    {(item) => (
                                                        <AutocompleteItem key={item.id.toString()}>
                                                            {locale === "en" ? item.language_en : item.language_tr}
                                                        </AutocompleteItem>
                                                    )}
                                                </Autocomplete>
                                            )}
                                        />
                                    </div>

                                    {/* Meaning */}
                                    <div>
                                        <label htmlFor="foreignMeaning" className="font-semibold">
                                            {t("meaning")}
                                        </label>
                                        <Textarea
                                            id="foreignMeaning"
                                            {...register("foreignMeaning")}
                                            placeholder={t("meaningPlaceholder")}
                                            rows={3}
                                            className="mt-2"
                                        />
                                        {errors.foreignMeaning && (
                                            <p className="text-red-500 text-sm mt-1">
                                                {t(errors.foreignMeaning.message as any)}
                                            </p>
                                        )}
                                    </div>

                                    {/* Is New Word Checkbox - moved before Turkish word input */}
                                    <div>
                                        <Controller
                                            name="isNewWord"
                                            control={control}
                                            render={({ field }) => (
                                                <Checkbox
                                                    isSelected={field.value}
                                                    onValueChange={(checked) => {
                                                        field.onChange(checked);
                                                        // Clear the word field when switching
                                                        setValue("suggestedTurkishWord", "");
                                                        setWordSearchTerm("");
                                                    }}
                                                >
                                                    {t("isNewWord")}
                                                </Checkbox>
                                            )}
                                        />
                                        <p className="text-muted-foreground text-sm mt-1">
                                            {t("isNewWordDescription")}
                                        </p>
                                    </div>

                                    {/* Turkish Word - conditional based on isNewWord */}
                                    <div>
                                        {isNewWord ? (
                                            // New word: show regular input
                                            <>
                                                <label htmlFor="suggestedTurkishWord" className="font-semibold">
                                                    {t("turkishWord")}
                                                </label>
                                                <Input
                                                    id="suggestedTurkishWord"
                                                    {...register("suggestedTurkishWord")}
                                                    placeholder={t("turkishWordPlaceholder")}
                                                    className="mt-2"
                                                />
                                            </>
                                        ) : (
                                            // Existing word: show autocomplete
                                            <Controller
                                                name="suggestedTurkishWord"
                                                control={control}
                                                render={({ field, fieldState: { error } }) => (
                                                    <Autocomplete
                                                        radius="md"
                                                        label={t("turkishWord")}
                                                        placeholder={t("existingWordPlaceholder")}
                                                        labelPlacement="outside"
                                                        isLoading={wordSearchLoading}
                                                        inputValue={wordSearchTerm}
                                                        onInputChange={setWordSearchTerm}
                                                        onSelectionChange={(key) => {
                                                            const selectedWord = wordSearchResults?.words?.find(
                                                                (w: any) => String(w.id) === String(key)
                                                            );
                                                            if (selectedWord) {
                                                                field.onChange(selectedWord.word);
                                                            }
                                                        }}
                                                        classNames={{
                                                            listboxWrapper: "rounded-md",
                                                            popoverContent: "rounded-md",
                                                            base: "rounded-md mt-2",
                                                        }}
                                                        errorMessage={error?.message ? t(error.message as any) : ""}
                                                        isInvalid={error !== undefined}
                                                    >
                                                        {(wordSearchResults?.words || []).map((item: any) => (
                                                            <AutocompleteItem key={item.id} textValue={String(item.word)}>
                                                                {item.word}
                                                            </AutocompleteItem>
                                                        ))}
                                                    </Autocomplete>
                                                )}
                                            />
                                        )}
                                        {errors.suggestedTurkishWord && (
                                            <p className="text-red-500 text-sm mt-1">
                                                {t(errors.suggestedTurkishWord.message as any)}
                                            </p>
                                        )}
                                    </div>

                                    {/* Reason */}
                                    <div>
                                        <label htmlFor="reason" className="font-semibold">
                                            {t("reason")}
                                        </label>
                                        <Textarea
                                            id="reason"
                                            {...register("reason")}
                                            placeholder={t("reasonPlaceholder")}
                                            rows={2}
                                            className="mt-2"
                                        />
                                    </div>

                                    <div className="flex justify-end gap-2 pt-4">
                                        <Button type="button" variant="ghost" onPress={close}>
                                            {t("cancel")}
                                        </Button>
                                        <Button
                                            type="submit"
                                            color="primary"
                                            isLoading={isSubmitting || createSuggestion.isPending}
                                        >
                                            {t("submit")}
                                        </Button>
                                    </div>
                                </form>
                            </ModalBody>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </>
    );
}
