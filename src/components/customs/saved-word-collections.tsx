"use client";

import { Button } from "@heroui/react";
import { FolderPlus, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { api, type RouterOutputs } from "@/src/trpc/react";
import { cn } from "@/src/lib/utils";
import { CustomInput } from "./heroui/custom-input";

export type LibraryCollection = RouterOutputs["user"]["getSavedWordCollections"][number];
interface SavedWordCollectionsProps {
  collections: LibraryCollection[];
  selectedId?: string;
  totalCount?: number;
  loading: boolean;
  error: boolean;
  disabled: boolean;
  onSelect: (id?: string) => void;
  onChanged: () => Promise<void>;
  onRetry: () => void;
}

export default function SavedWordCollections({ collections, selectedId, totalCount, loading, error, disabled, onSelect, onChanged, onRetry }: SavedWordCollectionsProps) {
  const t = useTranslations("SavedWords.Library");
  const [editing, setEditing] = useState<"new" | string | null>(null);
  const [draft, setDraft] = useState("");
  const [formError, setFormError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [processing, setProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const create = api.user.createSavedWordCollection.useMutation();
  const rename = api.user.renameSavedWordCollection.useMutation();
  const remove = api.user.deleteSavedWordCollection.useMutation();
  const selected = collections.find((collection) => collection.id === selectedId);
  const busy = disabled || processing || create.isPending || rename.isPending || remove.isPending;

  useEffect(() => {
    setEditing(null);
    setDraft("");
    setFormError("");
    setDeleting(false);
  }, [selectedId]);

  const edit = (id: string) => {
    setEditing(id);
    setDraft(id === "new" ? "" : selected?.name ?? "");
    setFormError("");
    setDeleting(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft.trim() || !editing || busy) return;
    setFormError("");
    setProcessing(true);
    try {
      const collection = editing === "new" ? await create.mutateAsync({ name: draft.trim() }) : await rename.mutateAsync({ collectionId: editing, name: draft.trim() });
      await onChanged();
      toast.success(t(editing === "new" ? "collectionCreated" : "collectionRenamed"));
      setEditing(null);
      onSelect(collection.id);
    } catch (error) {
      const code = (error as { data?: { code?: string } })?.data?.code;
      setFormError(t(code === "CONFLICT" ? "nameConflict" : "requestFailed"));
    } finally { setProcessing(false); }
  };
  const deleteCollection = async () => {
    if (!selected || busy) return;
    setProcessing(true);
    try {
      await remove.mutateAsync({ collectionId: selected.id });
      await onChanged();
      setDeleting(false);
      onSelect(undefined);
      toast.success(t("collectionDeleted"));
    } catch { toast.error(t("requestFailed")); }
    finally { setProcessing(false); }
  };

  return <section className="min-w-0 space-y-3" aria-label={t("collections")}>
    <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1">
      <h2 className="text-sm font-medium">{t("collections")}</h2>
      <Button size="sm" variant="light" className="min-h-11 px-2 text-primary" startContent={<FolderPlus size={17} aria-hidden />}
        onPress={() => edit("new")} isDisabled={busy}>{t("newCollection")}</Button>
    </div>
    {error ? <div role="alert" className="flex flex-wrap items-center gap-2 text-sm">
      <p>{t("loadFailed")}</p><Button size="sm" variant="light" className="min-h-11 text-primary" onPress={onRetry}>{t("retry")}</Button>
    </div> : <div className="flex max-h-44 min-w-0 flex-wrap gap-2 overflow-y-auto p-0.5" aria-busy={loading}>
      <Button aria-label={t("allWords")} aria-pressed={selectedId === undefined} onPress={() => { setDeleting(false); onSelect(undefined); }} isDisabled={busy}
        className={cn("h-auto min-h-11 max-w-full whitespace-normal rounded-md border px-3 py-2 text-sm", selectedId === undefined ? "border-primary bg-primary/10 text-primary" : "border-border bg-background/40 text-foreground")}>
        {t("allWords")}{totalCount !== undefined && <span aria-hidden className="ml-1 tabular-nums text-muted-foreground">{totalCount}</span>}
      </Button>
      {collections.map((collection) => <Button key={collection.id} aria-label={collection.name} aria-pressed={selectedId === collection.id}
        onPress={() => { setDeleting(false); onSelect(collection.id); }} isDisabled={busy}
        className={cn("h-auto min-h-11 max-w-full whitespace-normal rounded-md border px-3 py-2 text-sm", selectedId === collection.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-background/40 text-foreground")}>
        <span className="min-w-0 [overflow-wrap:anywhere]">{collection.name}</span><span aria-hidden className="ml-1 shrink-0 tabular-nums text-muted-foreground">{collection.wordCount}</span>
      </Button>)}
      {loading && <span className="h-11 w-28 rounded-md bg-foreground/5 motion-safe:animate-pulse" aria-hidden />}
    </div>}
    {selected && !editing && !deleting && <div className="flex flex-wrap gap-1">
      <Button variant="light" size="sm" className="min-h-11 px-2 text-muted-foreground" startContent={<Pencil size={15} aria-hidden />} onPress={() => edit(selected.id)} isDisabled={busy}>{t("renameCollection")}</Button>
      <Button variant="light" size="sm" className="min-h-11 px-2 text-muted-foreground" startContent={<Trash2 size={15} aria-hidden />} onPress={() => setDeleting(true)} isDisabled={busy}>{t("deleteCollection")}</Button>
    </div>}
    {editing && <form onSubmit={submit} className="flex min-w-0 flex-wrap items-end gap-3 rounded-lg border border-border bg-background/40 p-4">
      <CustomInput ref={inputRef} label={t("collectionName")} labelPlacement="outside" placeholder={t("collectionNamePlaceholder")}
        value={draft} onValueChange={(value) => { setDraft(value); setFormError(""); }} maxLength={80} isRequired isDisabled={busy}
        className="min-w-0 flex-1 basis-60" isInvalid={Boolean(formError)} errorMessage={formError}
        classNames={{ inputWrapper: "h-12 min-h-12 border border-border shadow-none" }} />
      <Button type="submit" color="primary" className="h-12 min-h-12" isDisabled={busy || !draft.trim()} isLoading={processing}>{t("saveCollection")}</Button>
      <Button variant="light" className="h-12 min-h-12" onPress={() => { setEditing(null); setFormError(""); }} isDisabled={busy}>{t("cancel")}</Button>
    </form>}
    {deleting && selected && <div className="rounded-lg border border-border bg-background/40 p-4" role="alert">
      <p className="font-medium [overflow-wrap:anywhere]">{t("deleteCollectionPrompt", { name: selected.name })}</p>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t("deleteCollectionHint")}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button color="danger" className="min-h-11" isDisabled={busy} isLoading={processing} onPress={() => void deleteCollection()}>{t("confirmDelete")}</Button>
        <Button variant="light" className="min-h-11" isDisabled={busy} onPress={() => setDeleting(false)}>{t("cancel")}</Button>
      </div>
    </div>}
  </section>;
}
