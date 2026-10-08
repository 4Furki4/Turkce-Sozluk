"use client";

import { useEffect, useId, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Button, CardBody, Chip, Slider, Spinner } from "@heroui/react";
import { ArrowLeftRight, ChevronDown, ChevronRight, RotateCcw, Search, X } from "lucide-react";
import { toast } from "sonner";
import CustomCard from "@/src/components/customs/heroui/custom-card";
import { CustomInput } from "@/src/components/customs/heroui/custom-input";
import { CustomSelect } from "@/src/components/customs/heroui/custom-select";
import { useProgressRouter } from "@/src/hooks/use-progress-router";
import { api } from "@/src/trpc/react";
import type { RouterOutputs } from "@/src/trpc/react";
import { SUGGESTION_SORT_ORDERS, SUGGESTION_STATUSES, SYMMETRIC_RELATION_TYPES, type SymmetricRelationType } from "@/src/lib/word-relation-suggestions";

type Suggestion = RouterOutputs["admin"]["wordRelations"]["getSuggestions"]["items"][number];
type Cursor = { score: number; confidence: number; id: number };
const selectControlClasses = { trigger: "h-12 min-h-12 cursor-pointer rounded-md border-2 border-primary/40 px-3", value: "text-sm" };

function readRange(params: { get: (key: string) => string | null }, minKey: string, maxKey: string, max: number, defaultMin: number): [number, number] {
  const read = (key: string, fallback: number) => {
    const raw = params.get(key);
    const value = raw?.trim() ? Number(raw) : fallback;
    return Number.isFinite(value) && value >= 0 && value <= max ? value : fallback;
  };
  const minValue = read(minKey, defaultMin);
  const maxValue = read(maxKey, max);
  return minValue <= maxValue ? [minValue, maxValue] : [defaultMin, max];
}

function SuggestionRange({ label, value, max, percent = false, onCommit }: {
  label: string; value: [number, number]; max: number; percent?: boolean; onCommit: (value: number[]) => void;
}) {
  const [range, setRange] = useState<number[]>(value);
  const [minValue, maxValue] = value;
  useEffect(() => setRange([minValue, maxValue]), [minValue, maxValue]);
  return <Slider label={label} value={range} minValue={0} maxValue={max} step={0.01} color="primary" size="md"
    formatOptions={percent ? { style: "percent", maximumFractionDigits: 0 } : { maximumFractionDigits: 2 }}
    getValue={(values) => Array.isArray(values) ? `${values.map((n) => percent ? `${Math.round(n * 100)}%` : `${Number(n.toFixed(2))}`).join(" – ")}${percent ? "" : " / 3"}` : String(values)}
    classNames={{ base: "min-w-0 gap-4", label: "text-sm font-medium", value: "text-sm tabular-nums text-default-600", trackWrapper: "px-3 py-2", thumb: "h-5 w-5" }}
    onChange={(values) => { if (Array.isArray(values)) setRange(values); }}
    onChangeEnd={(values) => { if (Array.isArray(values)) onCommit(values); }} />;
}

function parseCursor(value: string | null): Cursor | null {
  try {
    const cursor = JSON.parse(value ?? "null") as Cursor | null;
    return cursor && Number.isInteger(cursor.id) && cursor.id > 0 && Number.isFinite(cursor.score) && cursor.score >= 0 && cursor.score <= 3
      && Number.isFinite(cursor.confidence) && cursor.confidence >= 0 && cursor.confidence <= 1 ? cursor : null;
  } catch { return null; }
}

function MeaningDetails({ row }: { row: Suggestion }) {
  const t = useTranslations("Dashboard.WordRelations.Suggestions");
  const locale = useLocale();
  const details = api.admin.wordRelations.getSuggestionDetails.useQuery({ id: row.id });
  if (details.isPending) return <Spinner size="sm" aria-label={t("loading")} />;
  if (details.isError) return <div role="alert">{t("error")} <Button size="sm" variant="light" onPress={() => void details.refetch()}>{t("retry")}</Button></div>;
  return (
    <div className="space-y-4 border-t border-divider pt-4 text-sm">
      <p className="text-default-500">{t("scoredAt", { date: new Date(details.data.scoredAt).toLocaleDateString(locale), model: details.data.model })}</p>
      <div className="grid gap-4 md:grid-cols-2">
        {[{ id: row.wordId, name: row.word }, { id: row.relatedWordId, name: row.relatedWord }].map((word) => (
          <div key={word.id} className="min-w-0">
            <h4 className="font-semibold break-words">{word.name} · {t("currentMeanings")}</h4>
            <ul className="mt-2 list-disc space-y-1 pl-5 break-words">
              {details.data.currentMeanings.filter((meaning) => meaning.wordId === word.id).map((meaning, index) => <li key={index}>{meaning.meaning}</li>)}
            </ul>
          </div>
        ))}
      </div>
      <h4 className="font-semibold">{t("scoredMeanings")}</h4>
      {details.data.evidence.map((evidence) => (
        <div key={evidence.sourceWordId} className="space-y-2 rounded-lg border border-divider p-3">
          <p className="font-medium break-words">{evidence.sourceWord} → {evidence.candidateWord}: {evidence.score.toFixed(2)}/3</p>
          <div className="grid gap-3 md:grid-cols-2">
            {[{ name: evidence.sourceWord, values: evidence.sourceMeanings }, { name: evidence.candidateWord, values: evidence.candidateMeanings }].map((word) => (
              <div key={word.name} className="min-w-0"><p className="font-medium break-words">{word.name}</p><ul className="list-disc space-y-1 pl-5 break-words">{word.values.map((meaning, index) => <li key={index}>{meaning}</li>)}</ul></div>
            ))}
          </div>
          {(evidence.sourceMeaningsTruncated || evidence.candidateMeaningsTruncated) && <p>{t("truncated")}</p>}
        </div>
      ))}
    </div>
  );
}

function SuggestionRow({ row }: { row: Suggestion }) {
  const t = useTranslations("Dashboard.WordRelations.Suggestions");
  const relations = useTranslations("Dashboard.WordRelations.relationTypes");
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useProgressRouter();
  const utils = api.useUtils();
  const [relationType, setRelationType] = useState<SymmetricRelationType | "">("");
  const [expanded, setExpanded] = useState(false);
  const relationLabel = (type: string) => relations(type === "see_also" ? "seeAlso" : type === "turkish_equivalent" ? "turkishEquivalent" : type);
  const selectedConflict = [row.forwardType, row.reverseType].some((type) => type !== null && (
    !SYMMETRIC_RELATION_TYPES.includes(type as SymmetricRelationType) || (relationType !== "" && type !== relationType)
  ));
  const refresh = async () => {
    await Promise.all([
      utils.admin.wordRelations.getSuggestions.invalidate(), utils.admin.wordRelations.getSuggestionDetails.invalidate({ id: row.id }),
      utils.admin.wordRelations.getRelatedWords.invalidate(), utils.wordGraph.invalidate(), utils.word.invalidate(),
    ]);
  };
  const onError = (error: { data?: { code?: string } | null }) => {
    toast.error(error.data?.code === "CONFLICT" ? t("conflict") : t("error"));
    void refresh();
  };
  const accept = api.admin.wordRelations.acceptSuggestion.useMutation({ onSuccess: async () => { toast.success(t("acceptedToast")); await refresh(); }, onError });
  const dismiss = api.admin.wordRelations.dismissSuggestion.useMutation({ onSuccess: async () => { toast.success(t("dismissedToast")); await refresh(); }, onError });
  const restore = api.admin.wordRelations.restoreSuggestion.useMutation({ onSuccess: async () => { toast.success(t("restoredToast")); await refresh(); }, onError });
  const busy = accept.isPending || dismiss.isPending || restore.isPending;
  const openManual = (wordId: number) => {
    const next = new URLSearchParams(params.toString());
    next.set("view", "manual"); next.set("wordId", String(wordId));
    router.push(`${pathname}?${next}`, { scroll: false });
  };
  return (
    <CustomCard>
      <CardBody className="gap-4 overflow-visible">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold break-words">{row.word} <span aria-hidden="true">↔</span> {row.relatedWord}</h3>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-default-500">
              <span>{t("score", { score: row.score.toFixed(2) })}</span>
              <span>{t("confidence", { confidence: Math.round(row.confidence * 100) })}</span>
            </div>
          </div>
          <Chip size="sm" variant="flat" color={row.status === "accepted" ? "success" : row.status === "dismissed" ? "default" : "warning"}>{t(`statuses.${row.status}`)}</Chip>
        </div>
        <div className="space-y-1 text-sm break-words">
          {row.directionalScores.map((score) => <p key={score.sourceWordId}>{score.sourceWordId === row.wordId ? row.word : row.relatedWord} → {score.candidateWordId === row.relatedWordId ? row.relatedWord : row.word}: {score.score.toFixed(2)}/3</p>)}
          {(row.forwardType || row.reverseType) && <div className="text-default-500">
            <p>{t("existingLink", { from: row.word, to: row.relatedWord, type: row.forwardType ? relationLabel(row.forwardType) : t("notLinked") })}</p>
            <p>{t("existingLink", { from: row.relatedWord, to: row.word, type: row.reverseType ? relationLabel(row.reverseType) : t("notLinked") })}</p>
          </div>}
        </div>
        {row.status === "pending" && <div className="grid items-end gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto]">
          <div className="min-w-0 space-y-2">
            <span id={`suggestion-type-${row.id}`} className="block text-sm font-medium">{t("relationType")}</span>
            <CustomSelect aria-labelledby={`suggestion-type-${row.id}`} size="md" radius="md" classNames={selectControlClasses}
              placeholder={t("chooseType")} selectedKeys={relationType ? [relationType] : []} isDisabled={busy}
              options={Object.fromEntries(SYMMETRIC_RELATION_TYPES.map((type) => [type, relationLabel(type)]))}
              onSelectionChange={(keys) => setRelationType((Array.from(keys)[0]?.toString() ?? "") as SymmetricRelationType | "")} />
          </div>
          <Button className="h-12 rounded-md" color="primary" startContent={<ArrowLeftRight size={16} />} isLoading={accept.isPending} isDisabled={!relationType || selectedConflict || busy}
            onPress={() => relationType && accept.mutate({ id: row.id, relationType })}>{t("relateBothWays")}</Button>
          <Button className="h-12 rounded-md" variant="bordered" startContent={<X size={16} />} isLoading={dismiss.isPending} isDisabled={busy} onPress={() => dismiss.mutate({ id: row.id })}>{t("dismiss")}</Button>
        </div>}
        {row.status === "pending" && selectedConflict && <div role="alert" className="space-y-2 text-sm text-warning">
          <p>{t("conflict")}</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="bordered" onPress={() => openManual(row.wordId)}>{t("editWord", { word: row.word })}</Button>
            <Button size="sm" variant="bordered" onPress={() => openManual(row.relatedWordId)}>{t("editWord", { word: row.relatedWord })}</Button>
          </div>
        </div>}
        {row.status === "dismissed" && <Button className="self-start" variant="bordered" startContent={<RotateCcw size={16} />} isLoading={restore.isPending} isDisabled={busy} onPress={() => restore.mutate({ id: row.id })}>{t("restore")}</Button>}
        <Button className="self-start" size="sm" variant="light" aria-expanded={expanded} aria-controls={`suggestion-evidence-${row.id}`} startContent={expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />} onPress={() => setExpanded(!expanded)}>{t("details")}</Button>
        {expanded && <div id={`suggestion-evidence-${row.id}`}><MeaningDetails row={row} /></div>}
      </CardBody>
    </CustomCard>
  );
}

export default function WordRelationSuggestions() {
  const t = useTranslations("Dashboard.WordRelations.Suggestions");
  const filterId = useId();
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useProgressRouter();
  const query = (params.get("q") ?? "").slice(0, 100);
  const [search, setSearch] = useState(query);
  useEffect(() => setSearch(query), [query]);
  const [minScore, maxScore] = readRange(params, "minScore", "maxScore", 3, 2);
  const [minConfidence, maxConfidence] = readRange(params, "minConfidence", "maxConfidence", 1, 0);
  const rawSort = params.get("sort") ?? "score_desc";
  const sort = SUGGESTION_SORT_ORDERS.includes(rawSort as (typeof SUGGESTION_SORT_ORDERS)[number]) ? rawSort as (typeof SUGGESTION_SORT_ORDERS)[number] : "score_desc";
  const rawStatus = params.get("status") ?? "pending";
  const status = [...SUGGESTION_STATUSES, "all"].includes(rawStatus) ? rawStatus as (typeof SUGGESTION_STATUSES)[number] | "all" : "pending";
  const cursor = parseCursor(params.get("cursor"));
  const result = api.admin.wordRelations.getSuggestions.useQuery({ query, minScore, maxScore, minConfidence, maxConfidence, sort, status, cursor, limit: 50 });
  const changeFilters = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    next.delete("cursor");
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") next.delete(key); else next.set(key, value);
    }
    router.push(`${pathname}?${next}`, { scroll: false });
  };
  return (
    <div className="space-y-5">
      <CustomCard>
        <CardBody className="gap-4">
          <div><h2 className="text-xl font-semibold">{t("title")}</h2><p className="mt-1 text-sm text-default-500">{t("description")}</p></div>
          <form className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]" onSubmit={(event) => { event.preventDefault(); changeFilters({ q: search.trim() }); }}>
            <div className="min-w-0 space-y-2 sm:col-span-2 lg:col-span-1">
              <label htmlFor={`${filterId}-word`} className="block text-sm font-medium">{t("searchWord")}</label>
              <div className="flex items-center gap-3">
                <CustomInput id={`${filterId}-word`} aria-label={t("searchWord")} size="md" classNames={{ base: "min-w-0", inputWrapper: "h-12 min-h-12 rounded-md border-primary/40 px-3", input: "text-sm" }}
                  value={search} onValueChange={setSearch} maxLength={100} placeholder={t("searchPlaceholder")} isClearable onClear={() => { setSearch(""); changeFilters({ q: null }); }} />
                <Button aria-label={t("search")} className="h-12 min-w-12 shrink-0 rounded-md border-primary/40 px-3 sm:px-4" color="primary" type="submit" variant="bordered" startContent={<Search size={16} />}><span className="hidden sm:inline">{t("search")}</span></Button>
              </div>
            </div>
            <div className="min-w-0 space-y-2">
              <span id={`${filterId}-sort`} className="block text-sm font-medium">{t("orderBy")}</span>
              <CustomSelect aria-labelledby={`${filterId}-sort`} size="md" radius="md" classNames={selectControlClasses} selectedKeys={[sort]}
                options={Object.fromEntries(SUGGESTION_SORT_ORDERS.map((value) => [value, t(`sortOrders.${value}`)]))} disallowEmptySelection onSelectionChange={(keys) => changeFilters({ sort: Array.from(keys)[0]?.toString() ?? "score_desc" })} />
            </div>
            <div className="min-w-0 space-y-2">
              <span id={`${filterId}-status`} className="block text-sm font-medium">{t("status")}</span>
              <CustomSelect aria-labelledby={`${filterId}-status`} size="md" radius="md" classNames={selectControlClasses} selectedKeys={[status]}
                options={Object.fromEntries([...SUGGESTION_STATUSES, "all"].map((value) => [value, t(`statuses.${value}`)]))} disallowEmptySelection onSelectionChange={(keys) => changeFilters({ status: Array.from(keys)[0]?.toString() ?? "pending" })} />
            </div>
          </form>
          <div className="grid gap-5 border-t border-divider pt-4 sm:grid-cols-2">
            <SuggestionRange label={t("scoreRange")} value={[minScore, maxScore]} max={3}
              onCommit={([min, max]) => changeFilters({ minScore: String(min), maxScore: String(max) })} />
            <SuggestionRange label={t("confidenceRange")} value={[minConfidence, maxConfidence]} max={1} percent
              onCommit={([min, max]) => changeFilters({ minConfidence: String(min), maxConfidence: String(max) })} />
          </div>
          <Button size="sm" variant="light" className="self-start" onPress={() => changeFilters({ minScore: "0", maxScore: "3", minConfidence: "0", maxConfidence: "1" })}>{t("fullRanges")}</Button>
          <p className="text-xs text-default-500">{t("rankingNote")}</p>
        </CardBody>
      </CustomCard>
      {result.isPending && <div className="flex justify-center py-8"><Spinner label={t("loading")} /></div>}
      {result.isError && <CustomCard><CardBody><p role="alert">{t("error")}</p><Button className="mt-3 self-start" onPress={() => void result.refetch()}>{t("retry")}</Button></CardBody></CustomCard>}
      {result.data?.items.length === 0 && <CustomCard><CardBody className="py-8 text-center">{t("empty")}</CardBody></CustomCard>}
      {result.data?.items.map((row) => <SuggestionRow key={row.id} row={row} />)}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="bordered" isDisabled={!cursor || result.isFetching} onPress={() => changeFilters({})}>{t("firstPage")}</Button>
        <span className="text-sm text-default-500" aria-live="polite">{t("pageSize", { count: result.data?.items.length ?? 0 })}</span>
        <Button variant="bordered" isDisabled={!result.data?.nextCursor || result.isFetching} onPress={() => {
          if (result.data?.nextCursor) changeFilters({ cursor: JSON.stringify(result.data.nextCursor) });
        }}>{t("nextPage")}</Button>
      </div>
    </div>
  );
}
