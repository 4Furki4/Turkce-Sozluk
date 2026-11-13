"use client";

import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { ArrowLeft, ArrowRight, ClipboardCheck } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Session } from "@/src/lib/auth";
import { TaskPage, useTaskActions } from "@/src/components/task-pages/task-page";
import DetailedContributionForm from "./components/detailed-contribution-form";
import SimpleContributionForm from "./components/simple-contribution-form";
import styles from "./user-contribute-word-page.module.css";

type EntryMode = "simple" | "detailed";
type ContributionStep = EntryMode | "choose";

const entries = {
  simple: { title: "simpleTitle", description: "simpleDescription" },
  detailed: { title: "detailedTitle", description: "detailedDescription" },
} as const;

export interface UserContributeWordPageProps {
  session: Session | null;
  locale: "en" | "tr";
  prefillWord?: string;
}

export default function UserContributeWordPage(props: UserContributeWordPageProps) {
  const mode = useSearchParams().get("mode");
  const step = mode === "simple" || mode === "detailed" ? mode : "choose";
  const previousStep = useRef<ContributionStep>(step);
  const t = useTranslations("ContributeWord");
  const tTask = useTranslations("TaskPage");
  const editing = step !== "choose";

  return (
    <TaskPage
      key={step}
      title={t("title")}
      hideTitle={editing}
      className={
        step === "simple" ? "max-w-2xl space-y-4 sm:space-y-5"
          : step === "detailed" ? "max-w-3xl space-y-4 sm:space-y-5"
          : undefined
      }
      parent="/search"
      parentLabel={tTask("search")}
      initialUser={props.session?.user}
    >
      <ContributionFlow {...props} step={step} previousStep={previousStep} />
    </TaskPage>
  );
}

function ContributionFlow({
  step,
  previousStep,
  ...formProps
}: UserContributeWordPageProps & {
  step: ContributionStep;
  previousStep: RefObject<ContributionStep>;
}) {
  const t = useTranslations("ContributeWord");
  const search = useSearchParams();
  const { replaceSearchParams } = useTaskActions();
  const heading = useRef<HTMLHeadingElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (previousStep.current !== step) {
      previousStep.current = step;
      heading.current?.focus();
    }
  }, [previousStep, step]);

  function changeStep(next: ContributionStep) {
    const query = new URLSearchParams(search);
    if (next === "choose") query.delete("mode");
    else query.set("mode", next);
    replaceSearchParams(query);
  }

  if (step === "choose") {
    return (
      <div className="space-y-5 sm:space-y-7">
        <div className={styles.intro}>
          <h2 ref={heading} tabIndex={-1} className="scroll-mt-24 text-2xl leading-tight font-semibold tracking-tight text-balance focus:outline-none sm:text-4xl">
            {t("chooseTitle")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-foreground/75 sm:text-base">
            {t("chooseDescription")}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 sm:gap-5">
          <EntryChoice mode="simple" onChoose={() => changeStep("simple")} />
          <EntryChoice mode="detailed" onChoose={() => changeStep("detailed")} />
        </div>

        <p className="flex items-start gap-2 border-t border-divider pt-4 text-sm leading-relaxed text-foreground/70">
          <ClipboardCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
          {t("reviewNote")}
        </p>
      </div>
    );
  }

  const entry = entries[step];
  const props = { ...formProps, isSubmitting, setIsSubmitting };

  return (
    <div>
      <div className="flex items-center">
        <button
          type="button"
          className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md text-left text-sm font-medium text-foreground/80 transition-colors enabled:hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary disabled:cursor-default disabled:opacity-50"
          disabled={isSubmitting}
          onClick={() => changeStep("choose")}
        >
          <ArrowLeft aria-hidden className="size-4 shrink-0" />
          {t("changeType")}
        </button>
      </div>
      <div className={`${styles.editorHeader} mt-1 pb-4 sm:pb-5`}>
        <h2 ref={heading} tabIndex={-1} className="scroll-mt-24 text-2xl leading-tight font-semibold tracking-tight focus:outline-none sm:text-3xl">
          {t(entry.title)}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-foreground/75">
          {t(step === "simple" ? "simpleDescription" : "detailedRequirements")}
        </p>
      </div>
      <div data-mode={step} className={`${styles.editorBody} pt-4 sm:pt-5`}>
        {step === "simple" ? (
          <SimpleContributionForm {...props} />
        ) : (
          <DetailedContributionForm {...props} />
        )}
      </div>
    </div>
  );
}

function EntryChoice({ mode, onChoose }: { mode: EntryMode; onChoose: () => void }) {
  const t = useTranslations("ContributeWord");
  const entry = entries[mode];
  const id = useId();

  return (
    <button
      type="button"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-description`}
      data-mode={mode}
      className={`${styles.choice} grid min-w-0 cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 rounded-xl border border-divider bg-background/40 p-3 text-left transition-colors hover:border-primary/60 hover:bg-background/75 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary sm:content-start sm:gap-x-4 sm:gap-y-3 sm:p-4`}
      onClick={onChoose}
    >
      <EntryProof mode={mode} />
      <span className="row-start-1 min-w-0 self-start sm:row-start-2">
        <span id={`${id}-title`} className="block text-lg leading-snug font-semibold sm:text-xl">
          {t(entry.title)}
        </span>
        <span id={`${id}-description`} className="mt-1 block text-sm leading-relaxed text-foreground/75">
          {t(entry.description)}
        </span>
      </span>
      <ArrowRight aria-hidden className={`${styles.arrow} col-start-2 row-start-2 size-5 self-center justify-self-end text-primary sm:mt-1 sm:self-start`} />
    </button>
  );
}

function EntryProof({ mode }: { mode: EntryMode }) {
  const t = useTranslations("ContributeWord");
  return (
    <span
      aria-hidden
      data-mode={mode}
      className={`${styles.proof} ${styles.choiceProof}`}
    >
      <span className={styles.imprint}>
        <span className={styles.headword}>{t("sampleWord")}</span>
        <span className={styles.rule} />
        {mode === "detailed" && (
          <span className={styles.definition}>
            <span />
            <span />
            <em>{t("sampleDefinition")}</em>
          </span>
        )}
      </span>
    </span>
  );
}
