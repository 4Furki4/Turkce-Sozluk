"use client";
import { useTranslations } from "next-intl";
import { api } from "@/src/trpc/react";
import { TaskPage, TaskState, useTaskActions } from "./task-page";
import DailyWordsManagement from "@/src/_pages/dashboard/daily-words/daily-words-management";
import MisspellingsManagement from "@/src/_pages/dashboard/misspellings/misspellings-management";
import GalatiMeshurManagement from "@/src/_pages/dashboard/galatimeshur/galatimeshur-management";

type Family = "daily-words" | "misspellings" | "galatimeshur";
export function DictionaryManagementTask({
  family,
  id,
  initialTerm,
}: {
  family: Family;
  id?: string;
  initialTerm?: string;
}) {
  const t = useTranslations("TaskPage");
  const labels = useTranslations("Dashboard");
  const titleKey =
    family === "daily-words"
      ? id
        ? "editDailyWord"
        : "newDailyWord"
      : family === "misspellings"
        ? id
          ? "editMisspelling"
          : "newMisspelling"
        : id
          ? "editGalati"
          : "newGalati";
  const parentLabel =
    family === "daily-words"
      ? labels("DailyWords.title")
      : family === "misspellings"
        ? labels("Misspellings.pageTitle")
        : labels("GalatiMeshur.pageTitle");
  return (
    <TaskPage
      title={t(titleKey)}
      parent={`/dashboard/${family}`}
      parentLabel={parentLabel}
      capability="admin"
    >
      <Editor family={family} id={id} initialTerm={initialTerm} />
    </TaskPage>
  );
}
function Editor({ family, id, initialTerm }: { family: Family; id?: string; initialTerm?: string }) {
  const { complete, cancel } = useTaskActions();
  const input = { id: Number(id) };
  const enabled = Boolean(id && Number.isSafeInteger(input.id) && input.id > 0);
  const daily = api.admin.dailyWords.getById.useQuery(input, {
    enabled: family === "daily-words" && enabled,
  });
  const misspelling = api.admin.misspellings.getById.useQuery(input, {
    enabled: family === "misspellings" && enabled,
  });
  const galati = api.admin.galatiMeshur.getById.useQuery(input, {
    enabled: family === "galatimeshur" && enabled,
  });
  const query =
    family === "daily-words"
      ? daily
      : family === "misspellings"
        ? misspelling
        : galati;
  if (id && (!enabled || query.isLoading || query.error || !query.data))
    return (
      <TaskState
        loading={enabled && query.isLoading}
        missing={!enabled || query.error?.data?.code === "NOT_FOUND"}
        error={query.error}
        retry={() => void query.refetch()}
      />
    );
  if (family === "daily-words")
    return (
      <DailyWordsManagement
        onClose={cancel}
        onSuccess={complete}
        initialData={daily.data}
      />
    );
  if (family === "misspellings")
    return (
      <MisspellingsManagement
        onClose={cancel}
        onSuccess={complete}
        initialData={misspelling.data ?? (initialTerm ? { incorrectSpelling: initialTerm, correctWordId: 0 } : undefined)}
      />
    );
  return (
    <GalatiMeshurManagement
      onClose={cancel}
      onSuccess={complete}
      initialData={
        galati.data
          ? { ...galati.data, correctUsage: galati.data.correctUsage ?? "" }
          : undefined
      }
    />
  );
}
