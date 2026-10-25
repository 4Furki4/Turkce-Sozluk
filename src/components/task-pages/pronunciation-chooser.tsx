"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { AutocompleteItem } from "@heroui/react";
import { api } from "@/src/trpc/react";
import { CustomAutocomplete } from "@/src/components/customs/heroui/custom-autocomplete";
import { TaskPage, TaskCancel } from "./task-page";
import { TaskButton } from "./task-link";
export function PronunciationChooser() {
  const t = useTranslations("TaskPage");
  return (
    <TaskPage
      title={t("pronunciation")}
      parent="/pronunciation-voting"
      parentLabel={t("pronunciation")}
    >
      <Chooser />
    </TaskPage>
  );
}
function Chooser() {
  const t = useTranslations("TaskPage");
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("word") ?? "");
  const [id, setId] = useState<number | null>(null);
  const query = api.word.getRecommendations.useQuery(
    { query: search, limit: 20 },
    { enabled: search.length > 1 },
  );
  return (
    <div className="space-y-4">
      <CustomAutocomplete
        label={t("word")}
        inputValue={search}
        onInputChange={(value) => {
          setSearch(value);
          if (value !== query.data?.find(item => item.word_id === id)?.name) setId(null);
        }}
        selectedKey={id ? String(id) : null}
        onSelectionChange={(key) => {
          setId(key ? Number(key) : null);
          const item = query.data?.find(item => String(item.word_id) === String(key));
          if (item) setSearch(item.name);
        }}
        isLoading={query.isFetching}
      >
        {(query.data ?? []).map((item) => (
          <AutocompleteItem key={item.word_id} textValue={item.name}>
            {item.name}
          </AutocompleteItem>
        ))}
      </CustomAutocomplete>
      <div className="flex flex-wrap gap-3">
        <TaskCancel />
        {id && (
          <TaskButton
            color="primary"
            href={{
              pathname: "/contribute-word/[wordId]/pronunciations/new",
              params: { wordId: id },
            }}
          >
            {t("pronunciation")}
          </TaskButton>
        )}
      </div>
    </div>
  );
}
