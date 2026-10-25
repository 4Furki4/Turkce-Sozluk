"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@heroui/react";
import { toast } from "sonner";
import { api } from "@/src/trpc/react";
import { CustomInput } from "@/src/components/customs/heroui/custom-input";
import { useTaskDraft } from "@/src/hooks/use-task-draft";
import { TaskPage, TaskState, TaskCancel, useTaskActions } from "./task-page";
export type ParameterType =
  | "word-attributes"
  | "meaning-attributes"
  | "authors"
  | "part-of-speech"
  | "languages"
  | "roots";
export function ParameterTask({
  type,
  id,
}: {
  type: ParameterType;
  id?: string;
}) {
  const t = useTranslations("TaskPage");
  return (
    <TaskPage
      title={t(id ? "editParameter" : "newParameter")}
      parent={`/dashboard/dynamic-parameters/${type}`}
      parentLabel={t(`parameterTypes.${type}`)}
      capability="admin"
    >
      <ParameterLoader type={type} id={id} />
    </TaskPage>
  );
}
function ParameterLoader({ type, id }: { type: ParameterType; id?: string }) {
  const valid = Number.isSafeInteger(Number(id)) && Number(id) > 0;
  const query = api.task.parameter.useQuery(
    { type, id: Number(id) },
    { enabled: Boolean(id) && valid },
  );
  if (id && (!valid || query.isLoading || query.error || !query.data))
    return (
      <TaskState
        loading={valid && query.isLoading}
        missing={!valid || query.error?.data?.code === "NOT_FOUND"}
        error={query.error}
        retry={valid ? () => void query.refetch() : undefined}
      />
    );
  const raw = query.data as Record<string, unknown> | undefined;
  const initial: Record<string, string> = {};
  if (raw)
    for (const [key, value] of Object.entries(raw))
      if (
        value != null &&
        (typeof value === "string" || typeof value === "number")
      )
        initial[key] = String(value);
  if (type === "roots" && raw) initial.language_id = String(raw.languageId);
  return (
    <ParameterEditor
      type={type}
      id={id ? Number(id) : undefined}
      initial={initial}
    />
  );
}
function ParameterEditor({
  type,
  id,
  initial,
}: {
  type: ParameterType;
  id?: number;
  initial: Record<string, string>;
}) {
  const t = useTranslations("TaskPage");
  const { complete } = useTaskActions();
  const utils = api.useUtils();
  const [values, setValues] = useState(initial);
  const [pending, setPending] = useState(false);
  const fields = type.endsWith("attributes")
    ? ["attribute"]
    : type === "authors"
      ? ["name"]
      : type === "part-of-speech"
        ? ["partOfSpeech"]
        : type === "languages"
          ? ["language_code", "language_en", "language_tr"]
          : id
            ? ["root", "language_id"]
            : ["root", "language_id", "word_id"];
  const draft = useTaskDraft(
    `parameter:${type}:${id ?? "new"}`,
    values,
    setValues,
    initial,
  );
  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        if (pending) return;
        setPending(true);
        try {
          const client = utils.client.admin.dynamicParameters;
          switch (type) {
            case "word-attributes":
              if (id)
                await client.updateWordAttribute.mutate({
                  id,
                  attribute: values.attribute,
                });
              else
                await client.createWordAttribute.mutate({
                  attribute: values.attribute,
                });
              break;
            case "meaning-attributes":
              if (id)
                await client.updateMeaningAttribute.mutate({
                  id,
                  attribute: values.attribute,
                });
              else
                await client.createMeaningAttribute.mutate({
                  attribute: values.attribute,
                });
              break;
            case "authors":
              if (id)
                await client.updateAuthor.mutate({ id, name: values.name });
              else await client.createAuthor.mutate({ name: values.name });
              break;
            case "part-of-speech":
              if (id)
                await client.updatePartOfSpeech.mutate({
                  id,
                  partOfSpeech: values.partOfSpeech,
                });
              else
                await client.createPartOfSpeech.mutate({
                  partOfSpeech: values.partOfSpeech,
                });
              break;
            case "languages": {
              const payload = {
                language_code: values.language_code,
                language_en: values.language_en,
                language_tr: values.language_tr,
              };
              if (id) await client.updateLanguage.mutate({ id, ...payload });
              else await client.createLanguage.mutate(payload);
              break;
            }
            case "roots":
              if (id)
                await client.updateRoot.mutate({
                  id,
                  root: values.root,
                  language_id: Number(values.language_id),
                });
              else
                await client.createRoot.mutate({
                  root: values.root,
                  language_id: Number(values.language_id),
                  word_id: Number(values.word_id),
                });
              break;
          }
          toast.success(t("saved"));
          complete();
        } catch (error) {
          toast.error((error as Error).message);
        } finally {
          setPending(false);
        }
      }}
    >
      {draft.notice}
      {fields.map((key) => (
        <CustomInput
          key={key}
          label={t(`parameters.${key}`)}
          value={values[key] ?? ""}
          type={key.endsWith("_id") ? "number" : "text"}
          min={key.endsWith("_id") ? 1 : undefined}
          isRequired
          onValueChange={(value) => setValues({ ...values, [key]: value })}
        />
      ))}
      <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
        <TaskCancel />
        <Button color="primary" type="submit" isLoading={pending}>
          {t("save")}
        </Button>
      </div>
    </form>
  );
}
