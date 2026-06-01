export const AUTOCOMPLETE_SYNC_STATUS_EVENT = "turkish-dictionary:autocomplete-sync-status";

export type AutocompleteSyncStatus = "idle" | "downloading" | "ready" | "error";

export type AutocompleteSyncStatusDetail = {
  status: AutocompleteSyncStatus;
};

export const emitAutocompleteSyncStatus = (status: AutocompleteSyncStatus) => {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent<AutocompleteSyncStatusDetail>(AUTOCOMPLETE_SYNC_STATUS_EVENT, {
      detail: { status },
    }),
  );
};
