"use client";

import { type ReactNode, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useDebounce } from "@uidotdev/usehooks";
import {
    Badge,
    Button,
    Card,
    CardBody,
    CardHeader,
    Chip,
    Input,
} from "@heroui/react";
import {
    ArrowRight,
    CircleSlash,
    Clock3,
    MessageCircleQuestion,
    RotateCcw,
    Sparkles,
    Target,
    Users,
    WandSparkles,
} from "lucide-react";
import {
    buildVerbConjugation,
    getPersonEndingType,
    normalizeVerbRoot,
    type ConjugationErrorCode,
} from "@/src/lib/morphology/engine";
import {
    DEFAULT_SELECTION,
    NEGATION_SUFFIXES,
    PERSON_SUFFIXES,
    QUESTION_SUFFIXES,
    TENSE_SUFFIXES,
    type BuilderSelection,
    type PersonId,
    type TenseId,
} from "@/src/lib/morphology/suffixes";
import { api } from "@/src/trpc/react";

const DEFAULT_ROOT = "Gel";
const TR_LOCALE = "tr-TR";

export default function VerbBuilder() {
    const t = useTranslations("VerbBuilder");
    const [root, setRoot] = useState(DEFAULT_ROOT);
    const [selection, setSelection] = useState<BuilderSelection>(DEFAULT_SELECTION);
    const resultSectionRef = useRef<HTMLDivElement>(null);

    const result = buildVerbConjugation(root, selection);
    const normalizedRoot = result.normalizedRoot;
    const hasRootError = Boolean(result.error && result.error.code !== "EMPTY_ROOT");
    const validationMessage = hasRootError && result.error
        ? getValidationMessage(result.error.code, t)
        : null;
    const debouncedRoot = useDebounce(normalizedRoot, 250);
    const activeTense = selection.tense
        ? TENSE_SUFFIXES.find((item) => item.id === selection.tense) ?? null
        : null;
    const personEndingType = getPersonEndingType(selection.tense);

    const { data: verbSuggestions = [], isFetching: isVerbSuggestionsLoading } =
        api.search.searchVerbRoots.useQuery(
            { query: debouncedRoot, limit: 8 },
            { enabled: debouncedRoot.length >= 2 && !hasRootError },
        );

    const optionLabels = {
        negation: t("options.negation"),
        future: t("options.future"),
        pastSeen: t("options.pastSeen"),
        pastHeard: t("options.pastHeard"),
        presentContinuous: t("options.presentContinuous"),
        aorist: t("options.aorist"),
        imperative: t("options.imperative"),
        ben: t("options.ben"),
        sen: t("options.sen"),
        o: t("options.o"),
        biz: t("options.biz"),
        siz: t("options.siz"),
        onlar: t("options.onlar"),
        question: t("options.question"),
    };

    const categoryLabels = {
        root: t("categories.root"),
        negation: t("categories.negation"),
        tense: t("categories.tense"),
        person: t("categories.person"),
        question: t("categories.question"),
    };

    const nextStepLabel = getNextStepLabel(selection, t);
    const exactDictionaryMatch = verbSuggestions.find(
        (item) =>
            normalizeVerbRoot(item.root).toLocaleLowerCase(TR_LOCALE) ===
            normalizedRoot.toLocaleLowerCase(TR_LOCALE),
    );

    const updateSelection = (patch: Partial<BuilderSelection>) => {
        setSelection((current) => ({ ...current, ...patch }));
    };

    const resetBuilder = () => {
        setRoot(DEFAULT_ROOT);
        setSelection(DEFAULT_SELECTION);
    };

    const toggleNegation = () => {
        updateSelection({
            negation: selection.negation ? null : "negation",
        });
    };

    const toggleTense = (tenseId: TenseId) => {
        if (selection.tense === tenseId) {
            updateSelection({
                tense: null,
                person: null,
                question: false,
            });
            return;
        }

        updateSelection({
            tense: tenseId,
            person: tenseId === "imperative" && selection.person === "ben" ? null : selection.person,
        });
    };

    const togglePerson = (personId: PersonId) => {
        updateSelection({
            person: selection.person === personId ? null : personId,
        });
    };

    const toggleQuestion = () => {
        updateSelection({
            question: !selection.question,
        });
    };

    const scrollToResult = () => {
        const element = resultSectionRef.current;
        if (!element) {
            return;
        }

        const navbarHeightVar = getComputedStyle(document.documentElement)
            .getPropertyValue("--navbar-height")
            .trim();
        const navbarOffset = Number.parseFloat(navbarHeightVar || "0");
        const absoluteTop = window.scrollY + element.getBoundingClientRect().top;

        window.scrollTo({
            top: Math.max(absoluteTop - navbarOffset - 16, 0),
            behavior: "smooth",
        });
    };

    const getPreview = (patch: Partial<BuilderSelection>) => {
        const preview = buildVerbConjugation(root, { ...selection, ...patch });

        return {
            word: preview.word || normalizeVerbRoot(root),
        };
    };

    return (
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
            <Card
                ref={resultSectionRef}
                className="overflow-hidden border border-primary/15 bg-background/80  shadow-lg scroll-mt-24"
            >
                <CardBody className="gap-6 p-6 sm:p-8">
                    <div className="flex flex-col items-center gap-4 text-center">
                        <Badge color="primary" content={t("badgeLive")} placement="top-right" showOutline={false}>
                            <div className="rounded-full border border-primary/20 bg-primary/10 p-4 text-primary">
                                <WandSparkles className="h-6 w-6" />
                            </div>
                        </Badge>

                        <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary/80">
                                {t("title")}
                            </p>
                            <h2 className="font-serif text-2xl font-semibold text-foreground sm:text-3xl">
                                {t("subtitle")}
                            </h2>
                            <p className="mx-auto max-w-2xl text-sm text-foreground/70 sm:text-base">
                                {t("autoRules")}
                            </p>
                        </div>
                    </div>

                    <div
                        id="verb-builder-result"
                        className="rounded-3xl border border-primary/10 bg-background/80 px-4 py-6 shadow-inner"
                    >
                        <p className="text-center text-xs font-semibold uppercase tracking-[0.35em] text-foreground/50">
                            {t("currentForm")}
                        </p>
                        <div className="mt-3 text-center text-4xl font-serif font-semibold text-primary break-all sm:text-5xl">
                            {result.word || t("emptyResult")}
                        </div>
                    </div>

                    <div className="flex flex-wrap justify-center gap-2">
                        {result.parts.length > 0 ? (
                            result.parts.map((part) => (
                                <Chip
                                    key={`${part.category}-${part.id}`}
                                    color={getChipColor(part.category)}
                                    variant={part.category === "root" ? "solid" : "flat"}
                                    className="max-w-full"
                                >
                                    {categoryLabels[part.category]}:{" "}
                                    {part.category === "person" && !part.surface
                                        ? t("common.noSuffix")
                                        : part.displaySurface}
                                </Chip>
                            ))
                        ) : (
                            <Chip color="default" variant="flat">
                                {t("emptyState")}
                            </Chip>
                        )}
                    </div>
                </CardBody>
            </Card>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                <Card className="border border-primary/10 bg-background/80 shadow-md">
                    <CardHeader className="flex items-center gap-3 px-6 pb-0 pt-6">
                        <Badge color="primary" content="1" shape="circle" showOutline={false}>
                            <div className="rounded-full bg-primary/10 p-3 text-primary">
                                <Sparkles className="h-5 w-5" />
                            </div>
                        </Badge>
                        <div>
                            <h3 className="text-lg font-semibold text-foreground">
                                {t("sections.rootChoicesTitle")}
                            </h3>
                            <p className="text-sm text-foreground/65">
                                {t("sections.rootChoicesSubtitle")}
                            </p>
                        </div>
                    </CardHeader>
                    <CardBody className="gap-5 px-6 py-6">
                        <Input
                            label={t("field.label")}
                            value={root}
                            onValueChange={setRoot}
                            placeholder={t("field.placeholder")}
                            variant="bordered"
                            description={validationMessage ? undefined : t("field.description")}
                            isInvalid={hasRootError}
                            errorMessage={validationMessage}
                            startContent={<ArrowRight className="h-4 w-4 text-foreground/40" />}
                        />

                        <div className="rounded-2xl border border-primary/10 bg-background/60 p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary/80">
                                        {t("dictionary.title")}
                                    </p>
                                    <p className="mt-1 text-sm leading-6 text-foreground/65">
                                        {t("dictionary.subtitle")}
                                    </p>
                                </div>
                                {exactDictionaryMatch ? (
                                    <Chip color="success" variant="flat">
                                        {t("dictionary.connected", { word: exactDictionaryMatch.name })}
                                    </Chip>
                                ) : null}
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                                {normalizedRoot.length < 2 ? (
                                    <Chip color="default" variant="flat">
                                        {t("dictionary.typeMore")}
                                    </Chip>
                                ) : hasRootError ? (
                                    <Chip color="danger" variant="flat">
                                        {validationMessage}
                                    </Chip>
                                ) : isVerbSuggestionsLoading ? (
                                    <Chip color="secondary" variant="flat">
                                        {t("dictionary.loading")}
                                    </Chip>
                                ) : verbSuggestions.length > 0 ? (
                                    verbSuggestions.map((item) => {
                                        const isSelected =
                                            normalizeVerbRoot(item.root).toLocaleLowerCase(TR_LOCALE) ===
                                            normalizedRoot.toLocaleLowerCase(TR_LOCALE);

                                        return (
                                            <Button
                                                key={`${item.id}-${item.root}`}
                                                size="sm"
                                                color={isSelected ? "primary" : "default"}
                                                variant={isSelected ? "solid" : "flat"}
                                                className="h-auto rounded-2xl px-3 py-2"
                                                onPress={() => setRoot(item.root)}
                                            >
                                                <div className="flex flex-col items-start gap-1 text-left">
                                                    <span className="font-semibold">{item.root}</span>
                                                    {item.name !== item.root ? (
                                                        <span className={isSelected ? "text-primary-foreground/75 text-xs" : "text-foreground/60 text-xs"}>
                                                            {t("dictionary.wordName", { word: item.name })}
                                                        </span>
                                                    ) : null}
                                                </div>
                                            </Button>
                                        );
                                    })
                                ) : (
                                    <Chip color="warning" variant="flat">
                                        {t("dictionary.empty")}
                                    </Chip>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {selection.negation && (
                                <Chip color="warning" variant="flat" onClose={() => updateSelection({ negation: null })}>
                                    {t("active.negation")}
                                </Chip>
                            )}
                            {activeTense && (
                                <Chip
                                    color="primary"
                                    variant="flat"
                                    onClose={() => updateSelection({ tense: null, person: null, question: false })}
                                >
                                    {optionLabels[activeTense.id]}
                                </Chip>
                            )}
                            {selection.person && (
                                <Chip color="success" variant="flat" onClose={() => updateSelection({ person: null })}>
                                    {optionLabels[selection.person]}
                                </Chip>
                            )}
                            {selection.question && (
                                <Chip color="secondary" variant="flat" onClose={() => updateSelection({ question: false })}>
                                    {t("active.question")}
                                </Chip>
                            )}
                            {!selection.negation && !selection.tense && !selection.person && !selection.question && (
                                <Chip color="default" variant="flat">
                                    {t("active.none")}
                                </Chip>
                            )}
                        </div>

                        <div className="rounded-2xl border border-dashed border-primary/15 bg-primary/5 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary/80">
                                {t("nextStepTitle")}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-foreground/80">
                                {hasRootError ? t("nextSteps.invalidRoot") : nextStepLabel}
                            </p>
                            {activeTense && (
                                <Chip className="mt-3" color="primary" variant="flat">
                                    {t("personEndings.label", {
                                        set:
                                            personEndingType === "type2"
                                                ? t("personEndings.type2")
                                                : personEndingType === "imperative"
                                                  ? t("personEndings.imperative")
                                                : t("personEndings.type1"),
                                    })}
                                </Chip>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Chip color="danger" variant="flat">{t("phonology.softening")}</Chip>
                            <Chip color="warning" variant="flat">{t("phonology.hardening")}</Chip>
                            <Chip color="success" variant="flat">{t("phonology.twoWay")}</Chip>
                            <Chip color="secondary" variant="flat">{t("phonology.fourWay")}</Chip>
                            <Chip color="default" variant="flat">{t("phonology.buffer")}</Chip>
                        </div>

                        <Button
                            color="danger"
                            variant="flat"
                            startContent={<RotateCcw className="h-4 w-4" />}
                            onPress={resetBuilder}
                        >
                            {t("reset")}
                        </Button>
                    </CardBody>
                </Card>

                <Card className="border border-primary/10 bg-background/80 shadow-md">
                    <CardHeader className="flex items-center gap-3 px-6 pb-0 pt-6">
                        <Badge color="secondary" content="2" shape="circle" showOutline={false}>
                            <div className="rounded-full bg-secondary/10 p-3 text-secondary">
                                <Clock3 className="h-5 w-5" />
                            </div>
                        </Badge>
                        <div>
                            <h3 className="text-lg font-semibold text-foreground">
                                {t("sections.wizardTitle")}
                            </h3>
                            <p className="text-sm text-foreground/65">
                                {t("sections.wizardSubtitle")}
                            </p>
                        </div>
                    </CardHeader>
                    <CardBody className="gap-5 px-6 py-6">
                        {!normalizedRoot && (
                            <div className="rounded-2xl border border-dashed border-foreground/15 p-6 text-center text-sm text-foreground/65">
                                {t("enterRootPrompt")}
                            </div>
                        )}

                        {hasRootError && normalizedRoot && (
                            <div className="rounded-2xl border border-danger/20 bg-danger/5 p-6 text-center text-sm text-danger">
                                {validationMessage}
                            </div>
                        )}

                        {!hasRootError && normalizedRoot && !selection.tense && (
                            <BuilderSection
                                icon={<CircleSlash className="h-4 w-4" />}
                                title={t("sections.negationTitle")}
                                subtitle={t("sections.negationSubtitle")}
                            >
                                {NEGATION_SUFFIXES.map((option) => {
                                    const preview = getPreview({
                                        negation: selection.negation ? null : option.id,
                                    });

                                    return (
                                        <OptionButton
                                            key={option.id}
                                            title={optionLabels[option.id]}
                                            detail={option.abstractDisplay}
                                            preview={preview.word}
                                            selected={selection.negation === option.id}
                                            onPress={toggleNegation}
                                        />
                                    );
                                })}
                            </BuilderSection>
                        )}

                        {!hasRootError && normalizedRoot && (
                            <BuilderSection
                                icon={<Clock3 className="h-4 w-4" />}
                                title={t("sections.tenseTitle")}
                                subtitle={t("sections.tenseSubtitle")}
                            >
                                {TENSE_SUFFIXES.map((option) => {
                                    const preview = getPreview({ tense: option.id });
                                    const isDisabled = selection.negation === "negation" && option.supportsNegation === false;

                                    return (
                                        <OptionButton
                                            key={option.id}
                                            title={optionLabels[option.id]}
                                            detail={option.abstractDisplay}
                                            preview={isDisabled ? t("common.unavailableAfterNegation") : preview.word}
                                            selected={selection.tense === option.id}
                                            disabled={isDisabled}
                                            onPress={() => toggleTense(option.id)}
                                        />
                                    );
                                })}
                            </BuilderSection>
                        )}

                        {!hasRootError && normalizedRoot && selection.tense && (
                            <BuilderSection
                                icon={<Users className="h-4 w-4" />}
                                title={t("sections.personTitle")}
                                subtitle={t("sections.personSubtitle")}
                            >
                                {PERSON_SUFFIXES.map((option) => {
                                    const preview = getPreview({ person: option.id });
                                    const isDisabled =
                                        activeTense?.id === "imperative" && option.id === "ben";

                                    return (
                                        <OptionButton
                                            key={option.id}
                                            title={optionLabels[option.id]}
                                            detail={option.abstractDisplay}
                                            preview={isDisabled ? t("common.unavailableInImperative") : preview.word}
                                            selected={selection.person === option.id}
                                            disabled={isDisabled}
                                            onPress={() => togglePerson(option.id)}
                                        />
                                    );
                                })}
                            </BuilderSection>
                        )}

                        {!hasRootError && normalizedRoot && selection.tense && (
                            <BuilderSection
                                icon={<MessageCircleQuestion className="h-4 w-4" />}
                                title={t("sections.questionTitle")}
                                subtitle={t("sections.questionSubtitle")}
                            >
                                {QUESTION_SUFFIXES.map((option) => {
                                    const preview = getPreview({ question: !selection.question });

                                    return (
                                        <OptionButton
                                            key={option.id}
                                            title={optionLabels[option.id]}
                                            detail={option.abstractDisplay}
                                            preview={selection.question ? result.word : preview.word}
                                            selected={selection.question}
                                            onPress={toggleQuestion}
                                        />
                                    );
                                })}
                            </BuilderSection>
                        )}

                        {!hasRootError && normalizedRoot && (
                            <Button
                                color="primary"
                                variant="shadow"
                                startContent={<Target className="h-4 w-4" />}
                                onPress={scrollToResult}
                            >
                                {t("finish")}
                            </Button>
                        )}
                    </CardBody>
                </Card>
            </div>
        </div>
    );
}

function BuilderSection({
    icon,
    title,
    subtitle,
    children,
}: {
    icon: ReactNode;
    title: string;
    subtitle: string;
    children: ReactNode;
}) {
    return (
        <div className="rounded-2xl border border-primary/10 bg-gradient-to-br from-background to-primary/5 p-4">
            <div className="mb-4 flex items-start gap-3">
                <div className="rounded-xl bg-primary/10 p-2 text-primary">{icon}</div>
                <div>
                    <h4 className="text-sm font-semibold uppercase tracking-[0.25em] text-foreground/80">
                        {title}
                    </h4>
                    <p className="mt-1 text-sm leading-6 text-foreground/65">{subtitle}</p>
                </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">{children}</div>
        </div>
    );
}

function OptionButton({
    title,
    detail,
    preview,
    selected,
    disabled,
    onPress,
}: {
    title: string;
    detail: string;
    preview: string;
    selected?: boolean;
    disabled?: boolean;
    onPress: () => void;
}) {
    return (
        <Button
            className="h-auto justify-start rounded-2xl border border-transparent px-4 py-4 text-left"
            color={selected ? "primary" : "default"}
            variant={selected ? "solid" : "flat"}
            isDisabled={disabled}
            onPress={onPress}
        >
            <div className="flex w-full flex-col items-start gap-2">
                <div className="flex w-full items-center justify-between gap-3">
                    <span className="font-semibold">{title}</span>
                    <Chip size="sm" variant={selected ? "solid" : "flat"}>
                        {detail}
                    </Chip>
                </div>
                <span className={selected ? "text-primary-foreground/80 text-xs leading-5" : "text-foreground/70 text-xs leading-5"}>
                    {preview}
                </span>
            </div>
        </Button>
    );
}

function getNextStepLabel(
    selection: BuilderSelection,
    t: ReturnType<typeof useTranslations>,
): string {
    if (!selection.tense && !selection.negation) {
        return t("nextSteps.start");
    }

    if (!selection.tense && selection.negation) {
        return t("nextSteps.afterNegation");
    }

    if (selection.tense && !selection.person && !selection.question) {
        return t("nextSteps.afterTense");
    }

    if (selection.tense && selection.person && !selection.question) {
        return t("nextSteps.afterPerson");
    }

    if (selection.tense && !selection.person && selection.question) {
        return t("nextSteps.afterQuestion");
    }

    return t("nextSteps.complete");
}

function getValidationMessage(
    code: ConjugationErrorCode,
    t: ReturnType<typeof useTranslations>,
): string {
    switch (code) {
        case "INVALID_CHARACTERS":
            return t("validation.invalidCharacters");
        case "EMPTY_ROOT":
            return t("validation.emptyRoot");
        default:
            return t("validation.invalidCharacters");
    }
}

function getChipColor(category: "root" | "negation" | "tense" | "person" | "question") {
    switch (category) {
        case "root":
            return "primary";
        case "negation":
            return "warning";
        case "tense":
            return "secondary";
        case "person":
            return "success";
        case "question":
            return "danger";
        default:
            return "default";
    }
}
