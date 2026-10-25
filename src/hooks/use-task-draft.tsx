"use client";

import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import {
  useWatch,
  useFormState,
  type Control,
  type FieldValues,
  type UseFormReset,
} from "react-hook-form";
import { Button } from "@heroui/react";
import { useTranslations } from "next-intl";
import { authClient } from "@/src/lib/auth-client";
import {
  readTaskDraft,
  TASK_DRAFT_VERSION,
  textDraftValues,
} from "@/src/lib/task-navigation";
import { useTaskActions } from "@/src/components/task-pages/task-page";

/** Only serializable form values belong here. File/Blob values stay in active-page memory. */
export function useTaskDraft<T>(
  identity: string,
  values: T,
  restore: (values: T) => void,
  baseline: T,
  changed?: boolean,
) {
  const session = authClient.useSession();
  const account = session.data?.user.id;
  const { registerClear, setDirty } = useTaskActions();
  const key = account ? `task-draft:v1:${account}:${identity}` : null;
  const revision = JSON.stringify(textDraftValues(baseline));
  const currentRevision = useEffectEvent(() => revision);
  const [recovery, setRecovery] = useState<{
    values: T;
    stale: boolean;
  } | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const ready = useRef(false);
  const clean = useRef(false);
  const serializable = textDraftValues(values);
  const serialized = JSON.stringify(serializable);
  const clear = useCallback(() => {
    clean.current = true;
    setRecovery(null);
    try {
      if (key) sessionStorage.removeItem(key);
    } catch {}
  }, [key]);
  useEffect(() => registerClear(clear), [registerClear, clear]);
  useEffect(() => {
    ready.current = false;
    clean.current = false;
    setRecovery(null);
    if (session.isPending) return;
    if (!key) {
      try {
        const previous = sessionStorage.getItem("task-draft:account");
        if (previous)
          for (const item of Object.keys(sessionStorage))
            if (item.startsWith(`task-draft:v1:${previous}:`))
              sessionStorage.removeItem(item);
        sessionStorage.removeItem("task-draft:account");
      } catch {}
      return;
    }
    try {
      // A different account must never inherit an earlier account's drafts.
      const previous = sessionStorage.getItem("task-draft:account");
      if (previous && previous !== account)
        for (const item of Object.keys(sessionStorage))
          if (item.startsWith(`task-draft:v1:${previous}:`))
            sessionStorage.removeItem(item);
      sessionStorage.setItem("task-draft:account", account!);
      const draft = readTaskDraft<T>(sessionStorage.getItem(key));
      if (draft)
        setRecovery({
          values: draft.values,
          stale: draft.revision !== currentRevision(),
        });
    } catch {
      setUnavailable(true);
    }
    ready.current = true;
  }, [key, account, session.isPending]); // baseline is the freshly loaded record for this mounted form
  useEffect(() => {
    if (
      !ready.current ||
      !key ||
      clean.current ||
      !(changed ?? serialized !== revision)
    )
      return;
    setDirty(true);
    try {
      sessionStorage.setItem(
        key,
        JSON.stringify({
          version: TASK_DRAFT_VERSION,
          savedAt: Date.now(),
          revision,
          values: JSON.parse(serialized),
        }),
      );
    } catch {
      setUnavailable(true);
    }
  }, [key, serialized, revision, recovery, setDirty, changed]);
  const t = useTranslations("TaskPage");
  const notice = (
    <>
      {unavailable && <p role="status">{t("storageUnavailable")}</p>}
      {recovery && (
        <div
          role="status"
          className="border border-warning rounded-md p-3 space-y-2"
        >
          <p>{t(recovery.stale ? "staleDraft" : "draftFound")}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              onPress={() => {
                restore(recovery.values);
                setRecovery(null);
                setDirty(true);
              }}
            >
              {t("restoreDraft")}
            </Button>
            <Button
              variant="light"
              onPress={() => {
                clear();
                clean.current = false;
              }}
            >
              {t("discardDraft")}
            </Button>
          </div>
        </div>
      )}
    </>
  );
  return { notice, clear: () => clear() };
}

export function FormDraft<T extends FieldValues>({
  identity,
  control,
  reset,
  baseline,
  recover,
}: {
  identity: string;
  control: Control<T>;
  reset: UseFormReset<T>;
  baseline: T;
  recover?: (value: T) => T;
}) {
  const values = useWatch({ control }) as T;
  const { isDirty } = useFormState({ control });
  const draft = useTaskDraft(
    identity,
    values,
    (value) =>
      reset(recover ? recover(value) : value, { keepDefaultValues: true }),
    baseline,
    isDirty,
  );
  return draft.notice;
}
