"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { Button, ModalContent } from "@heroui/react";
import { BookOpen, Check, FolderPlus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Session } from "@/src/lib/auth";
import { Link } from "@/src/i18n/routing";
import { api } from "@/src/trpc/react";
import { getSavedWordsCountInput, getSavedWordsInput, readSavedWordsState, serializeSavedWordsState, type SavedWordsLibraryState } from "@/src/lib/saved-words-input";
import SavedWordsToolbar from "./saved-words-toolbar";
import SavedWordLibraryRow, { type LibraryWord } from "./saved-word-library-row";
import SavedWordPreview from "./saved-word-preview";
import SavedWordCollections from "./saved-word-collections";
import { CustomPagination } from "./heroui/custom-pagination";
import { CustomSelect } from "./heroui/custom-select";
import { CustomModal } from "./heroui/custom-modal";

interface SavedWordsPageProps {
  session: Session;
  locale: "en" | "tr";
  initialState?: SavedWordsLibraryState;
}

export default function SavedWordsPage({ locale, initialState }: SavedWordsPageProps) {
  const t = useTranslations("SavedWords.Library");
  const searchParams = useSearchParams();
  const serializedParams = searchParams.toString();
  const [state, setState] = useState(() => initialState ?? readSavedWordsState(searchParams));
  const latestState = useRef(state);
  const [selecting, setSelecting] = useState(false);
  const [selection, setSelection] = useState<Set<number>>(new Set());
  const [targetCollection, setTargetCollection] = useState(state.collectionId ?? "");
  const [activeWord, setActiveWord] = useState<LibraryWord | null>(null);
  const [desktop, setDesktop] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const previewTrigger = useRef<HTMLElement | null>(null);
  const utils = api.useUtils();

  const commit = useCallback((next: SavedWordsLibraryState) => {
    latestState.current = next;
    setState(next);
    const query = serializeSavedWordsState(next);
    const url = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
    // Next copies its internal state and updates useSearchParams for external
    // history calls. Passing its existing __NA state would bypass that update.
    window.history.replaceState(null, "", url);
  }, []);
  useEffect(() => {
    const next = readSavedWordsState(new URLSearchParams(serializedParams));
    latestState.current = next;
    setState(next);
  }, [serializedParams]);
  useEffect(() => {
    setSelection(new Set());
    setActiveWord(null);
  }, [state.search, state.sort, state.page, state.perPage, state.collectionId]);
  useEffect(() => { setTargetCollection(state.collectionId ?? ""); }, [state.collectionId]);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const update = () => setDesktop(query.matches);
    update();
    setHydrated(true);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const list = api.user.getSavedWords.useQuery(getSavedWordsInput(state), { placeholderData: keepPreviousData });
  const count = api.user.getSavedWordCount.useQuery(getSavedWordsCountInput(state));
  const allCount = api.user.getSavedWordCount.useQuery({ search: "" });
  const collections = api.user.getSavedWordCollections.useQuery();
  const details = api.word.getWord.useQuery({ name: activeWord?.word_name ?? "", wordId: activeWord?.word_id, skipLogging: true }, { enabled: Boolean(activeWord), staleTime: 15_000 });
  const collectionList = collections.data ?? [];
  const activeCollection = collectionList.find((collection) => collection.id === state.collectionId);
  const hasCollectionScope = state.collectionId !== undefined;
  const unavailableCollection = Boolean(hasCollectionScope && collections.isSuccess && !activeCollection);
  const totalPages = Math.max(1, Math.ceil((count.data ?? 0) / state.perPage));
  useEffect(() => {
    if (count.isSuccess && state.page > totalPages) commit({ ...state, page: totalPages });
  }, [count.isSuccess, state, totalPages, commit]);

  const refresh = useCallback(async (wordId?: number) => {
    await Promise.all([
      utils.user.getSavedWords.invalidate(), utils.user.getSavedWordCount.invalidate(), utils.user.getSavedWordCollections.invalidate(),
      utils.game.getFlashcardReviewSummary.invalidate(), utils.game.getDueFlashcardReviews.invalidate(),
      ...(wordId ? [utils.user.getWordSaveStatus.invalidate(wordId)] : []),
    ]);
  }, [utils]);
  const unsave = api.user.setWordSaved.useMutation({ onSuccess: (_, input) => refresh(input.wordId) });
  const restore = api.user.restoreSavedWord.useMutation({ onSuccess: (_, input) => refresh(input.wordId) });
  const membership = api.user.updateSavedWordCollection.useMutation({ onSuccess: () => refresh() });
  const busy = !hydrated || unsave.isPending || restore.isPending || membership.isPending;

  const removeWord = async (word: LibraryWord) => {
    try {
      const result = await unsave.mutateAsync({ wordId: word.word_id, saved: false });
      setActiveWord((current) => current?.word_id === word.word_id ? null : current);
      setSelection((current) => new Set([...current].filter((id) => id !== word.word_id)));
      const snapshot = result.snapshot;
      if (!snapshot) return;
      const undo = async () => {
        try { await restore.mutateAsync({ wordId: word.word_id, ...snapshot }); toast.success(t("restored")); }
        catch { toast.error(t("requestFailed"), { action: { label: t("undo"), onClick: () => void undo() } }); }
      };
      toast(t("unsaved", { word: word.word_name }), { duration: 10_000, action: { label: t("undo"), onClick: () => void undo() } });
    } catch { toast.error(t("requestFailed")); }
  };
  const words = list.data ?? [];
  const visibleIds = words.map((item) => item.word_data.word_id);
  const selectedIds = visibleIds.filter((id) => selection.has(id));
  const updateMembership = async (action: "add" | "remove") => {
    const collection = collectionList.find((item) => item.id === targetCollection);
    if (!collection || !selectedIds.length || busy) return;
    const wordIds = [...selectedIds];
    try {
      const result = await membership.mutateAsync({ collectionId: collection.id, wordIds, action });
      setSelection(new Set());
      const affected = result.wordIds;
      toast.success(t(action === "add" ? "membershipAdded" : "membershipRemoved", { count: affected.length, name: collection.name }), action === "remove" && affected.length ? {
        action: { label: t("undo"), onClick: () => membership.mutate({ collectionId: collection.id, wordIds: affected, action: "add" }, { onError: () => toast.error(t("requestFailed")) }) },
      } : undefined);
    } catch { toast.error(t("requestFailed")); }
  };
  const onSearch = useCallback((search: string) => {
    if (search === state.search) return;
    commit({ ...state, search, page: 1 });
  }, [state, commit]);
  const setCollection = useCallback((collectionId?: string) => {
    const current = latestState.current;
    if (collectionId !== current.collectionId) commit({ ...current, collectionId, page: 1 });
  }, [commit]);
  const closePreview = () => {
    setActiveWord(null);
    requestAnimationFrame(() => previewTrigger.current?.focus());
  };
  const preview = <SavedWordPreview word={activeWord} details={details.data?.[0]?.word_data} loading={details.isLoading} error={details.isError || Boolean(activeWord && details.isSuccess && !details.data?.length)} onRetry={() => void details.refetch()} />;
  const failed = list.isError || count.isError || allCount.isError;
  const loadedEmpty = !failed && !unavailableCollection && !list.isLoading && !list.isPlaceholderData && count.isSuccess && !words.length;
  const availablePracticeCount = hasCollectionScope ? activeCollection?.wordCount : allCount.data;
  const canPractice = Boolean(availablePracticeCount && !unavailableCollection && !collections.isError);

  return <section className="mx-auto w-full max-w-7xl space-y-4 px-4 pb-28 pt-6 sm:space-y-6 sm:px-6 lg:pb-10" aria-labelledby="saved-library-title" data-library-ready={hydrated}>
    <header className="flex min-w-0 items-start justify-between gap-3">
      <div className="min-w-0 max-w-2xl flex-1">
        <h1 id="saved-library-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("title")}</h1>
        <p className="mt-2 text-sm tabular-nums text-muted-foreground">{allCount.data !== undefined ? t("wordCount", { count: allCount.data }) : <span aria-hidden className="inline-block h-4 w-28 rounded bg-foreground/10" />}</p>
        <p className="mt-3 hidden max-w-[65ch] text-sm leading-relaxed text-muted-foreground sm:block">{t("description")}</p>
      </div>
      {canPractice ? <Link href={{ pathname: "/play/flashcards", query: { source: "saved", ...(hasCollectionScope ? { collectionId: state.collectionId } : {}) } }}
        className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
        <BookOpen size={18} aria-hidden />{t(hasCollectionScope ? "practiceCollection" : "practice")}
      </Link> : <span aria-disabled="true" className="inline-flex min-h-12 items-center gap-2 rounded-md bg-primary/10 px-5 py-3 text-sm text-muted-foreground"><BookOpen size={18} aria-hidden />{t(hasCollectionScope ? "practiceCollection" : "practice")}</span>}
    </header>

    <SavedWordsToolbar search={state.search} sort={state.sort} disabled={!hydrated} onSearch={onSearch} onSort={(sort) => { if (sort !== state.sort) commit({ ...state, sort, page: 1 }); }} />
    <SavedWordCollections collections={collectionList} selectedId={state.collectionId} totalCount={allCount.data} loading={collections.isLoading} error={collections.isError} disabled={busy} onSelect={setCollection} onChanged={() => refresh()} onRetry={() => void collections.refetch()} />

    {unavailableCollection ? <div role="alert" className="rounded-xl border border-border bg-background/40 p-6">
      <p className="max-w-[65ch] text-sm leading-relaxed">{t("collectionUnavailable")}</p>
      <Button variant="light" className="mt-3 min-h-11 text-primary" onPress={() => setCollection(undefined)}>{t("showAllWords")}</Button>
    </div> : <>
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <p role="status" aria-live="polite" className="text-sm tabular-nums text-muted-foreground">{list.isFetching && !list.isLoading ? t("updating") : count.data !== undefined ? t("resultsCount", { count: count.data }) : ""}</p>
        <Button size="sm" variant="light" className="min-h-11 px-2" isDisabled={busy || (!selecting && (!words.length || failed))} startContent={selecting ? <X aria-hidden size={17} /> : <Check aria-hidden size={17} />}
          onPress={() => { setSelecting(!selecting); setSelection(new Set()); }}>{t(selecting ? "finishSelection" : "selectWords")}</Button>
      </div>
      {selecting && <div className="flex min-w-0 flex-wrap items-end gap-3 rounded-xl border border-border bg-background/40 p-4">
        <label className="flex min-h-12 cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" className="h-5 w-5 accent-primary" aria-label={t("selectAll")} checked={Boolean(visibleIds.length && selectedIds.length === visibleIds.length)} disabled={busy || list.isPlaceholderData}
            onChange={(event) => setSelection(new Set(event.target.checked ? visibleIds : []))} />
          {t("selectedCount", { count: selectedIds.length })}
        </label>
        {collectionList.length ? <>
          <CustomSelect label={t("targetCollection")} labelPlacement="outside" size="lg" selectedKeys={targetCollection ? [targetCollection] : []}
            popoverProps={{ shouldCloseOnScroll: false }}
            onChange={(event) => setTargetCollection(event.target.value)} options={Object.fromEntries(collectionList.map((collection) => [collection.id, collection.name]))}
            className="min-w-0 flex-1 basis-52" isDisabled={busy} classNames={{ trigger: "h-12 min-h-12 border border-border px-3 shadow-none", value: "truncate text-base" }} />
          <Button color="primary" className="min-h-12" startContent={<FolderPlus aria-hidden size={17} />} isDisabled={busy || !selectedIds.length || !targetCollection || list.isPlaceholderData} onPress={() => void updateMembership("add")}>{t("addToCollection")}</Button>
          <Button variant="bordered" className="min-h-12" isDisabled={busy || !selectedIds.length || !targetCollection || list.isPlaceholderData} onPress={() => void updateMembership("remove")}>{t("removeFromCollection")}</Button>
        </> : <p className="min-w-0 flex-1 text-sm leading-relaxed text-muted-foreground">{t("noCollectionsHint")}</p>}
      </div>}
      <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="min-w-0 space-y-4">
          <div className="overflow-hidden rounded-xl border border-border bg-background/40" aria-busy={list.isFetching}>
            {failed ? <div role="alert" className="space-y-3 p-6"><p className="text-sm">{t("loadFailed")}</p><Button variant="bordered" className="min-h-11" onPress={() => { void list.refetch(); void count.refetch(); void allCount.refetch(); }}>{t("retry")}</Button></div>
              : list.isLoading ? <div role="status" aria-label={t("updating")} className="divide-y divide-border motion-safe:animate-pulse">{Array.from({ length: state.perPage }, (_, index) => <div key={index} className="space-y-3 p-5"><div className="h-5 w-24 rounded bg-foreground/10" /><div className="h-4 w-5/6 rounded bg-foreground/5" /><div className="h-3 w-32 rounded bg-foreground/5" /></div>)}</div>
                : loadedEmpty ? <div className="px-6 py-10">
                  <h2 className="text-xl font-semibold">{t(state.search ? "noResultsTitle" : state.collectionId ? "emptyCollectionTitle" : "emptyLibraryTitle")}</h2>
                  <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-muted-foreground">{t(state.search ? "noResultsBody" : state.collectionId ? "emptyCollectionBody" : "emptyLibraryBody")}</p>
                  {state.search ? <Button className="mt-4 min-h-11 text-primary" variant="light" onPress={() => onSearch("")}>{t("clearSearch")}</Button>
                    : state.collectionId ? <Button className="mt-4 min-h-11 text-primary" variant="light" onPress={() => setCollection(undefined)}>{t("showAllWords")}</Button>
                      : <Link href="/word-list" className="mt-4 inline-flex min-h-11 items-center rounded-md font-medium text-primary underline underline-offset-4">{t("discoverWords")}</Link>}
                </div> : <ul>{words.map(({ word_data: word }) => <SavedWordLibraryRow key={word.word_id} word={word} locale={locale} active={activeWord?.word_id === word.word_id} selecting={selecting} selected={selection.has(word.word_id)} disabled={busy || list.isPlaceholderData}
                  onSelect={() => setSelection((current) => { const next = new Set(current); if (next.has(word.word_id)) next.delete(word.word_id); else next.add(word.word_id); return next; })}
                  onPreview={() => { previewTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; setActiveWord(word); }} onUnsave={() => void removeWord(word)} />)}</ul>}
          </div>
          {!failed && !list.isLoading && (count.data ?? 0) > 0 && <div className="flex min-w-0 flex-wrap items-end justify-between gap-3">
            <div className="w-44 max-w-full space-y-2">
              <p id="saved-library-page-size" className="text-sm">{t("wordsPerPage")}</p>
              <CustomSelect aria-labelledby="saved-library-page-size" size="lg" disallowEmptySelection selectedKeys={[String(state.perPage)]}
                onChange={(event) => { const perPage = Number(event.target.value); if (perPage !== state.perPage) commit({ ...state, perPage, page: 1 }); }}
                options={{ "6": "6", "12": "12", "24": "24", "48": "48" }} classNames={{ trigger: "h-12 min-h-12 border border-border shadow-none" }} />
            </div>
            {totalPages > 1 && <CustomPagination total={totalPages} page={state.page} initialPage={state.page} onChange={(page) => commit({ ...state, page })} />}
          </div>}
        </div>
        <aside className="hidden min-w-0 overflow-y-auto rounded-xl border border-border bg-background/40 lg:sticky lg:top-24 lg:block lg:max-h-[calc(100dvh-8rem)]" aria-label={t("previewTitle")}>{desktop && preview}</aside>
      </div>
    </>}
    {!desktop && <CustomModal aria-label={t("previewTitle")} isOpen={Boolean(activeWord)} onOpenChange={(open) => { if (!open) closePreview(); }} size="full" scrollBehavior="inside" classNames={{ base: "h-dvh max-h-dvh rounded-none", body: "p-0", wrapper: "items-stretch" }}>
      <ModalContent><div className="min-w-0 overflow-y-auto pb-[max(2rem,env(safe-area-inset-bottom))] pt-12">{preview}</div></ModalContent>
    </CustomModal>}
  </section>;
}
