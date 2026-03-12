"use client";

import React, { useState } from "react";
import {
  Button,
  CardBody,
  Chip,
  Input,
  Select,
  SelectItem,
} from "@heroui/react";
import {
  ArrowRight,
  Blocks,
  CornerDownLeft,
  Languages,
  Orbit,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import CustomCard from "./heroui/custom-card";
import {
  TurkishMorphologyEngine,
  type DiffSegment,
  type MorphologicalState,
  type PartOfSpeech,
  type RootLexeme,
  type SuffixDefinition,
} from "@/src/lib/morphology";

type MutationMode = "auto" | "always" | "never";

const engine = new TurkishMorphologyEngine();

const ROOT_SAMPLES: Array<{
  surface: string;
  pos: PartOfSpeech;
  origin: "native" | "foreign";
  mutationMode: MutationMode;
}> = [
    { surface: "kitap", pos: "Noun", origin: "native", mutationMode: "auto" },
    { surface: "aile", pos: "Noun", origin: "native", mutationMode: "auto" },
    { surface: "yurt", pos: "Noun", origin: "native", mutationMode: "auto" },
    { surface: "yaz", pos: "Verb", origin: "native", mutationMode: "auto" },
    { surface: "gör", pos: "Verb", origin: "native", mutationMode: "auto" },
    { surface: "link", pos: "Noun", origin: "foreign", mutationMode: "auto" },
  ];

function createRootLexeme(
  surface: string,
  pos: PartOfSpeech,
  origin: "native" | "foreign",
  mutationMode: MutationMode,
): RootLexeme {
  const normalizedSurface = surface.trim().toLocaleLowerCase("tr");

  return {
    surface: normalizedSurface,
    pos,
    origin,
    forceConsonantMutation: mutationMode === "always",
    allowConsonantMutation: mutationMode === "never" ? false : undefined,
  };
}

function renderDiff(segments: DiffSegment[], mode: "before" | "after") {
  return segments.map((segment, index) => {
    const content = mode === "before" ? segment.before : segment.after;

    if (!content) {
      return null;
    }

    return (
      <span
        key={`${mode}-${index}-${content}`}
        className={segment.changed ? "rounded-md bg-primary/15 px-1.5 py-0.5 text-primary" : undefined}
      >
        {content}
      </span>
    );
  });
}

function getGroupedSuffixes(suffixes: SuffixDefinition[]) {
  const grouped = new Map<string, SuffixDefinition[]>();

  suffixes.forEach((suffix) => {
    const currentGroup = grouped.get(suffix.group) ?? [];
    currentGroup.push(suffix);
    grouped.set(suffix.group, currentGroup);
  });

  return Array.from(grouped.entries());
}

function getLocalizedPos(t: ReturnType<typeof useTranslations>, pos: PartOfSpeech) {
  return pos === "Noun" ? t("posNoun") : t("posVerb");
}

function getLocalizedPhase(
  t: ReturnType<typeof useTranslations>,
  phase: MorphologicalState["phase"],
) {
  return phase === "inflection" ? t("phaseInflection") : t("phaseDerivation");
}

export default function WordBuilder() {
  const t = useTranslations("WordBuilder");
  const initialSample = ROOT_SAMPLES[0];

  const [draftSurface, setDraftSurface] = useState(initialSample.surface);
  const [draftPos, setDraftPos] = useState<PartOfSpeech>(initialSample.pos);
  const [draftOrigin, setDraftOrigin] = useState<"native" | "foreign">(
    initialSample.origin,
  );
  const [draftMutationMode, setDraftMutationMode] =
    useState<MutationMode>(initialSample.mutationMode);
  const [activeRoot, setActiveRoot] = useState<RootLexeme>(
    createRootLexeme(
      initialSample.surface,
      initialSample.pos,
      initialSample.origin,
      initialSample.mutationMode,
    ),
  );
  const [selectedSuffixIds, setSelectedSuffixIds] = useState<string[]>([]);

  const canStart = draftSurface.trim().length > 0;

  const buildResult = engine.buildWord(activeRoot, selectedSuffixIds);
  const groupedSuffixes = getGroupedSuffixes(buildResult.availableSuffixes);

  const startBuilder = () => {
    if (!canStart) {
      return;
    }

    setActiveRoot(
      createRootLexeme(
        draftSurface,
        draftPos,
        draftOrigin,
        draftMutationMode,
      ),
    );
    setSelectedSuffixIds([]);
  };

  const applySample = (sample: (typeof ROOT_SAMPLES)[number]) => {
    setDraftSurface(sample.surface);
    setDraftPos(sample.pos);
    setDraftOrigin(sample.origin);
    setDraftMutationMode(sample.mutationMode);
    setActiveRoot(
      createRootLexeme(
        sample.surface,
        sample.pos,
        sample.origin,
        sample.mutationMode,
      ),
    );
    setSelectedSuffixIds([]);
  };

  const undoLastStep = () => {
    setSelectedSuffixIds((current) => current.slice(0, -1));
  };

  const resetSteps = () => {
    setSelectedSuffixIds([]);
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 lg:py-10">
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <CustomCard className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-background/70 to-background/90 shadow-[0_18px_60px_-26px_rgba(194,65,12,0.65)]">
          <CardBody className="gap-6 p-6 sm:p-8">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="rounded-full border-primary/25 bg-primary/12 px-3 py-1 text-primary" variant="outline">
                  {t("titleBadge")}
                </Badge>
                <Badge className="rounded-full border-border/60 bg-background/60 px-3 py-1" variant="outline">
                  {t("phaseAware")}
                </Badge>
              </div>
              <div className="max-w-3xl space-y-3">
                <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                  {t("title")}
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-foreground/75 sm:text-base">
                  {t("description")}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-primary/15 bg-background/70 p-4">
                <div className="mb-2 flex items-center gap-2 text-primary">
                  <Languages className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-[0.18em]">
                    {t("featureHarmonyTitle")}
                  </span>
                </div>
                <p className="text-sm text-foreground/75">{t("featureHarmonyBody")}</p>
              </div>
              <div className="rounded-2xl border border-primary/15 bg-background/70 p-4">
                <div className="mb-2 flex items-center gap-2 text-primary">
                  <Orbit className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-[0.18em]">
                    {t("featurePhonologyTitle")}
                  </span>
                </div>
                <p className="text-sm text-foreground/75">{t("featurePhonologyBody")}</p>
              </div>
              <div className="rounded-2xl border border-primary/15 bg-background/70 p-4">
                <div className="mb-2 flex items-center gap-2 text-primary">
                  <Blocks className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-[0.18em]">
                    {t("featurePosTitle")}
                  </span>
                </div>
                <p className="text-sm text-foreground/75">{t("featurePosBody")}</p>
              </div>
              <div className="rounded-2xl border border-primary/15 bg-background/70 p-4">
                <div className="mb-2 flex items-center gap-2 text-primary">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-[0.18em]">
                    {t("featureLogTitle")}
                  </span>
                </div>
                <p className="text-sm text-foreground/75">{t("featureLogBody")}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge className="rounded-full bg-background/70 px-3 py-1" variant="outline">
                  {t("samples")}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {ROOT_SAMPLES.map((sample) => (
                  <button
                    key={`${sample.surface}-${sample.pos}`}
                    type="button"
                    onClick={() => applySample(sample)}
                    className="rounded-full border border-border/70 bg-background/75 px-4 py-2 text-sm font-medium text-foreground/80 transition-colors hover:border-primary/40 hover:text-primary"
                  >
                    {sample.surface}
                    <span className="ml-2 text-xs text-foreground/50">
                      {getLocalizedPos(t, sample.pos)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </CardBody>
        </CustomCard>

        <CustomCard className="border-border/70 bg-background/85 shadow-[0_18px_45px_-34px_rgba(15,23,42,0.55)]">
          <CardBody className="gap-5 p-6">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">{t("rootSetup")}</h2>
              <p className="text-sm text-foreground/65">{t("rootSetupHint")}</p>
            </div>

            <Input
              label={t("rootLabel")}
              placeholder={t("rootPlaceholder")}
              value={draftSurface}
              onValueChange={setDraftSurface}
              variant="bordered"
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label={t("posLabel")}
                selectedKeys={[draftPos]}
                onSelectionChange={(keys) => {
                  const value = Array.from(keys)[0] as PartOfSpeech | undefined;
                  if (value) {
                    setDraftPos(value);
                  }
                }}
              >
                <SelectItem key="Noun">{t("posNoun")}</SelectItem>
                <SelectItem key="Verb">{t("posVerb")}</SelectItem>
              </Select>

              <Select
                label={t("originLabel")}
                selectedKeys={[draftOrigin]}
                onSelectionChange={(keys) => {
                  const value = Array.from(keys)[0] as "native" | "foreign" | undefined;
                  if (value) {
                    setDraftOrigin(value);
                  }
                }}
              >
                <SelectItem key="native">{t("originNative")}</SelectItem>
                <SelectItem key="foreign">{t("originForeign")}</SelectItem>
              </Select>
            </div>

            <Select
              label={t("mutationLabel")}
              selectedKeys={[draftMutationMode]}
              onSelectionChange={(keys) => {
                const value = Array.from(keys)[0] as MutationMode | undefined;
                if (value) {
                  setDraftMutationMode(value);
                }
              }}
            >
              <SelectItem key="auto">{t("mutationAuto")}</SelectItem>
              <SelectItem key="always">{t("mutationAlways")}</SelectItem>
              <SelectItem key="never">{t("mutationNever")}</SelectItem>
            </Select>

            <p className="rounded-2xl border border-border/60 bg-background/60 px-4 py-3 text-sm leading-6 text-foreground/65">
              {t("mutationHint")}
            </p>

            <Button
              color="primary"
              className="w-full"
              isDisabled={!canStart}
              onPress={startBuilder}
            >
              {t("startBuilder")}
            </Button>
          </CardBody>
        </CustomCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <CustomCard className="border-border/70">
            <CardBody className="gap-5 p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">{t("stateTitle")}</h2>
                  <p className="text-sm text-foreground/65">{t("stateHint")}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="flat"
                    size="sm"
                    onPress={undoLastStep}
                    isDisabled={selectedSuffixIds.length === 0}
                    startContent={<CornerDownLeft className="h-4 w-4" />}
                  >
                    {t("undoLast")}
                  </Button>
                  <Button
                    variant="flat"
                    size="sm"
                    onPress={resetSteps}
                    isDisabled={selectedSuffixIds.length === 0}
                    startContent={<RotateCcw className="h-4 w-4" />}
                  >
                    {t("resetSteps")}
                  </Button>
                </div>
              </div>

              <div className="rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/10 via-background/80 to-background p-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">
                  {t("currentWord")}
                </p>
                <div className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  {buildResult.finalSurface}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Chip color="primary" variant="flat">
                  {t("currentPos")}: {getLocalizedPos(t, buildResult.finalPos)}
                </Chip>
                <Chip variant="flat">
                  {t("currentPhase")}: {getLocalizedPhase(t, buildResult.finalState.phase)}
                </Chip>
                <Chip variant="flat">
                  {t("stepCount")}: {buildResult.steps.length}
                </Chip>
              </div>

              {buildResult.finalState.phase === "inflection" ? (
                <div className="rounded-2xl border border-primary/20 bg-primary/8 px-4 py-3 text-sm text-foreground/80">
                  {t("lockedInflection")}
                </div>
              ) : null}

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold">{t("selectedChain")}</h3>
                  <span className="text-xs uppercase tracking-[0.16em] text-foreground/45">
                    {buildResult.availableSuffixes.length} {t("availableNow")}
                  </span>
                </div>
                <div className="flex min-h-16 flex-wrap gap-2 rounded-2xl border border-dashed border-border/70 bg-background/55 p-3">
                  {buildResult.steps.length > 0 ? (
                    buildResult.steps.map((step) => (
                      <Badge
                        key={step.step}
                        variant="outline"
                        className="rounded-full border-primary/20 bg-primary/8 px-3 py-1 text-sm text-primary"
                      >
                        {step.suffix.label ?? step.suffix.archiphoneme}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-foreground/55">{t("chainEmpty")}</p>
                  )}
                </div>
              </div>
            </CardBody>
          </CustomCard>

          <CustomCard className="border-border/70">
            <CardBody className="gap-5 p-6">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold">{t("availableSuffixes")}</h2>
                <p className="text-sm text-foreground/65">{t("availableSuffixesHint")}</p>
              </div>

              <div className="space-y-4">
                {groupedSuffixes.length > 0 ? (
                  groupedSuffixes.map(([group, suffixes]) => (
                    <div key={group} className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="rounded-full px-3 py-1">
                          {t(`groups.${group}`)}
                        </Badge>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {suffixes.map((suffix) => (
                          <button
                            key={suffix.id}
                            type="button"
                            onClick={() =>
                              setSelectedSuffixIds((current) => [...current, suffix.id])
                            }
                            className="group rounded-2xl border border-border/70 bg-background/60 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:bg-primary/6"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-base font-semibold text-foreground">
                                  {suffix.label ?? suffix.archiphoneme}
                                </div>
                                <div className="mt-1 font-mono text-xs text-foreground/50">
                                  {suffix.archiphoneme}
                                </div>
                              </div>
                              <ArrowRight className="mt-1 h-4 w-4 text-foreground/35 transition-colors group-hover:text-primary" />
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2 text-xs text-foreground/60">
                              <span className="rounded-full border border-border/70 px-2.5 py-1">
                                {getLocalizedPos(t, suffix.sourcePos)}
                              </span>
                              <span className="rounded-full border border-border/70 px-2.5 py-1">
                                {getLocalizedPos(t, suffix.targetPos)}
                              </span>
                              <span className="rounded-full border border-border/70 px-2.5 py-1">
                                {suffix.kind === "inflectional"
                                  ? t("phaseInflection")
                                  : t("phaseDerivation")}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-border/70 bg-background/55 px-4 py-5 text-sm text-foreground/55">
                    {t("noAvailableSuffixes")}
                  </div>
                )}
              </div>
            </CardBody>
          </CustomCard>
        </div>

        <CustomCard className="border-border/70">
          <CardBody className="gap-5 p-6">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">{t("logsTitle")}</h2>
              <p className="text-sm text-foreground/65">{t("logsHint")}</p>
            </div>

            <div className="space-y-4">
              {buildResult.steps.length > 0 ? (
                buildResult.steps.map((step) => (
                  <div
                    key={step.step}
                    className="rounded-3xl border border-border/70 bg-background/60 p-6 shadow-[0_10px_35px_-28px_rgba(15,23,42,0.9)]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">
                          {t("stepLabel", { step: step.step })}
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-lg font-semibold">
                          <span>{step.beforeState.surface}</span>
                          <ArrowRight className="h-4 w-4 text-foreground/45" />
                          <span>{step.afterState.surface}</span>
                        </div>
                      </div>
                      <Badge className="rounded-full border-primary/20 bg-primary/8 px-3 py-1 text-primary" variant="outline">
                        {step.suffix.label ?? step.suffix.archiphoneme}
                      </Badge>
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-foreground/45">
                          {t("before")}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 font-mono text-base">
                          {renderDiff(step.log.diff.segments, "before")}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-primary/20 bg-primary/8 p-4">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary/75">
                          {t("after")}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 font-mono text-base">
                          {renderDiff(step.log.diff.segments, "after")}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <Chip variant="flat">
                        {getLocalizedPos(t, step.beforeState.pos)} <ArrowRight className="mx-1 inline h-3.5 w-3.5" /> {getLocalizedPos(t, step.afterState.pos)}
                      </Chip>
                      <Chip variant="flat">
                        {t("surfaceSuffix")}: {step.surfaceSuffix}
                      </Chip>
                      <Chip variant="flat">
                        {t("archiphoneme")}: {step.suffix.archiphoneme}
                      </Chip>
                    </div>

                    <div className="mt-5 space-y-3">
                      <div className="text-sm font-semibold text-foreground/85">
                        {t("appliedRules")}
                      </div>
                      <ul className="space-y-2">
                        {step.log.explanationArray.map((message, index) => (
                          <li
                            key={`${step.step}-${index}`}
                            className={cn(
                              "rounded-2xl border border-border/65 px-4 py-3 text-sm leading-6 text-foreground/75",
                              index === step.log.explanationArray.length - 1 &&
                                message.includes("Kelime türü")
                                ? "border-primary/20 bg-primary/8 text-foreground"
                                : "bg-background/55",
                            )}
                          >
                            {message}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-border/70 bg-background/55 px-5 py-10 text-center text-sm text-foreground/55">
                  {t("noSteps")}
                </div>
              )}
            </div>
          </CardBody>
        </CustomCard>
      </div>
    </div>
  );
}
