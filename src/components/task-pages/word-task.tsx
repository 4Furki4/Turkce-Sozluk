"use client";
import { useTranslations } from "next-intl";
import { api } from "@/src/trpc/react";
import { ArrowRight, PencilLine, Mic, Plus } from "lucide-react";
import {
  TaskPage,
  TaskState,
  TaskCancel,
  useTaskActions,
  type TaskHref,
} from "./task-page";
import { TaskLink, TaskButton } from "./task-link";
import { CaptchaProvider } from "@/src/components/customs/captcha-provider";
import WordEditRequest from "@/src/components/customs/edit-request-modal/word-edit-request";
import { AudioRecorder } from "@/src/components/customs/audio-recorder";
import { MeaningTaskForm } from "./meaning-task-form";
import { RelationTaskForm } from "./relation-task-form";

export type WordTaskProps = {
  wordId: string;
  kind?:
    | "edit"
    | "meanings"
    | "related-words"
    | "related-phrases"
    | "pronunciations";
  childId?: string;
  operation?: "new" | "edit" | "remove";
};
export function WordTask(props: WordTaskProps) {
  const t = useTranslations("TaskPage");
  const input = {
    wordId: Number(props.wordId),
    meaningId: props.kind === "meanings" ? Number(props.childId) : undefined,
    relationId:
      props.kind?.startsWith("related-") && props.childId
        ? Number(props.childId)
        : undefined,
    relationKind:
      props.kind === "related-words" || props.kind === "related-phrases"
        ? props.kind
        : undefined,
  };
  const valid = Object.values(input).every(
    (value) =>
      typeof value !== "number" || (Number.isSafeInteger(value) && value > 0),
  );
  const query = api.word.getTaskWord.useQuery(input, { enabled: valid });
  const word = query.data?.word_data;
  const wordPage: TaskHref = word
    ? {
        pathname: "/search/[word]",
        params: { word: word.word_name },
        query: { entry: word.word_id },
      }
    : "/search";
  const title =
    props.kind === "edit"
      ? t("edit")
      : props.kind === "pronunciations"
        ? t("pronunciation")
        : props.kind === "meanings"
          ? t(props.operation === "remove" ? "remove" : "newMeaning")
          : props.kind
            ? t(
                props.kind === "related-words"
                  ? "relatedWords"
                  : "relatedPhrases",
              )
            : t("wordTasks", { word: word?.word_name ?? "…" });
  return (
    <TaskPage
      title={word && props.kind ? `${title}: ${word.word_name}` : title}
      parent={
        props.kind
          ? {
              pathname: "/contribute-word/[wordId]",
              params: { wordId: props.wordId },
            }
          : wordPage
      }
      parentLabel={
        props.kind ? t("contribute") : (word?.word_name ?? t("word"))
      }
      ancestors={
        props.kind
          ? [{ href: wordPage, label: word?.word_name ?? t("word") }]
          : undefined
      }
      breadcrumbLabel={props.kind ? title : t("contribute")}
      description={
        !props.kind
          ? t("chooseContribution")
          : props.kind === "edit"
            ? t("wordEditDescription")
            : undefined
      }
      media={props.kind === "pronunciations"}
    >
      {!valid || query.isLoading || query.error || !word ? (
        <TaskState
          loading={valid && query.isLoading}
          error={query.error}
          missing={!valid || query.error?.data?.code === "NOT_FOUND"}
          retry={() => void query.refetch()}
        />
      ) : (
        <CaptchaProvider>
          <WordTaskContent {...props} word={query.data!} />
        </CaptchaProvider>
      )}
    </TaskPage>
  );
}
function WordTaskContent({
  word,
  ...props
}: WordTaskProps & { word: import("@/types").WordSearchResult }) {
  const { complete } = useTaskActions();
  const t = useTranslations("TaskPage");
  const data = word.word_data;
  const params = { wordId: data.word_id };
  if (props.kind === "edit")
    return <WordEditRequest data={word} onClose={complete} />;
  if (props.kind === "pronunciations")
    return (
      <>
        <AudioRecorder
          wordId={data.word_id}
          onUploadComplete={complete}
          wrapperClassName="flex flex-wrap gap-4"
        />
        <TaskCancel />
      </>
    );
  if (props.kind === "meanings")
    return (
      <MeaningTaskForm
        meaning={
          data.meanings.find(
            (item) => item.meaning_id === Number(props.childId),
          )!
        }
        operation={props.operation!}
      />
    );
  if (props.kind)
    return (
      <RelationTaskForm
        word={data}
        kind={props.kind as "related-words" | "related-phrases"}
        operation={props.operation!}
        childId={Number(props.childId)}
      />
    );
  return (
    <div className="space-y-8 sm:space-y-10">
      <div className="divide-y divide-divider border-y border-divider">
        {(
          [
            {
              href: "/contribute-word/[wordId]/edit",
              title: t("edit"),
              hint: t("editWordHint"),
              Icon: PencilLine,
            },
            {
              href: "/contribute-word/[wordId]/pronunciations/new",
              title: t("pronunciation"),
              hint: t("pronunciationHint"),
              Icon: Mic,
            },
          ] as const
        ).map(({ href, title, hint, Icon }) => (
          <TaskLink
            key={href}
            href={{ pathname: href, params }}
            className="group flex min-h-20 items-center gap-4 rounded-sm py-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            <Icon
              aria-hidden
              className="h-5 w-5 shrink-0 text-foreground/60 group-hover:text-primary"
            />
            <span className="min-w-0 flex-1 space-y-1">
              <span className="block text-lg font-semibold text-foreground group-hover:text-primary">
                {title}
              </span>
              <span className="block text-sm leading-relaxed text-foreground/70">
                {hint}
              </span>
            </span>
            <ArrowRight
              aria-hidden
              className="h-5 w-5 shrink-0 text-foreground/50 group-hover:text-primary"
            />
          </TaskLink>
        ))}
      </div>
      <section className="space-y-3" aria-labelledby="contribution-meanings">
        <h2 id="contribution-meanings" className="text-lg font-semibold">
          {t("meaningList")}
        </h2>
        <ol className="divide-y divide-divider">
          {data.meanings.map((item, index) => (
            <li
              key={item.meaning_id}
              className="flex gap-3 py-4 first:pt-1 sm:gap-4"
            >
              <span
                aria-hidden
                className="w-5 shrink-0 pt-0.5 text-sm tabular-nums text-foreground/60"
              >
                {index + 1}.
              </span>
              <div className="min-w-0 flex-1 space-y-2">
                <p className="leading-relaxed [overflow-wrap:anywhere]">
                  {item.meaning}
                </p>
                <div className="flex flex-wrap gap-1">
                  {(["edit", "remove"] as const).map((op) => (
                    <TaskButton
                      key={op}
                      size="sm"
                      variant="light"
                      color={op === "edit" ? "primary" : "default"}
                      className="min-h-11 px-3"
                      aria-label={t(
                        op === "edit"
                          ? "editMeaningAction"
                          : "removeMeaningAction",
                        { number: index + 1 },
                      )}
                      href={{
                        pathname: `/contribute-word/[wordId]/meanings/[meaningId]/${op}`,
                        params: { ...params, meaningId: item.meaning_id },
                      }}
                    >
                      {t(op)}
                    </TaskButton>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <div className="grid gap-8 border-t border-divider pt-6 sm:pt-8 lg:grid-cols-2 lg:gap-10">
        {(["related-words", "related-phrases"] as const).map((kind) => {
          const related =
            kind === "related-words"
              ? data.relatedWords?.map((item) => ({
                  id: item.related_word_id,
                  name: item.related_word_name,
                }))
              : data.relatedPhrases?.map((item) => ({
                  id: item.related_phrase_id,
                  name: item.related_phrase,
                }));
          return (
            <section
              key={kind}
              className="min-w-0 space-y-3"
              aria-labelledby={`contribution-${kind}`}
            >
              <h2 id={`contribution-${kind}`} className="text-lg font-semibold">
                {t(
                  kind === "related-words" ? "relatedWords" : "relatedPhrases",
                )}
              </h2>
              <TaskButton
                size="sm"
                color="primary"
                variant="flat"
                className="min-h-11 max-w-full whitespace-normal"
                startContent={<Plus aria-hidden className="h-4 w-4 shrink-0" />}
                href={{
                  pathname: `/contribute-word/[wordId]/${kind}/new`,
                  params,
                }}
              >
                {t("newRelation")}
              </TaskButton>
              {!related?.length ? (
                <p className="text-sm leading-relaxed text-foreground/70">
                  {t(
                    kind === "related-words"
                      ? "noRelatedWords"
                      : "noRelatedPhrases",
                  )}
                </p>
              ) : (
                <ul className="divide-y divide-divider">
                  {related.map((item) => (
                    <li key={item.id} className="space-y-2 py-3">
                      <p className="font-medium [overflow-wrap:anywhere]">
                        {item.name}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {(["edit", "remove"] as const).map((op) => (
                          <TaskButton
                            key={op}
                            size="sm"
                            variant="light"
                            color={op === "edit" ? "primary" : "default"}
                            className="min-h-11 px-3"
                            href={{
                              pathname: `/contribute-word/[wordId]/${kind}/[relationId]/${op}`,
                              params: { ...params, relationId: item.id },
                            }}
                          >
                            {t(op)}
                          </TaskButton>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
