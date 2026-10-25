import type { inferRouterInputs } from "@trpc/server";
import type { AppRouter } from "@/src/server/api/root";

export const savedWordsInitialInput = {
  search: "",
  sortAlphabet: "az",
  sortDate: "dateDesc",
  sortBy: "date",
  take: 6,
  skip: 0,
} as const satisfies inferRouterInputs<AppRouter>["user"]["getSavedWords"];

export type SavedWordsSort = "dateDesc" | "dateAsc" | "az" | "za";
export interface SavedWordsLibraryState {
  search: string;
  sort: SavedWordsSort;
  page: number;
  perPage: number;
  collectionId?: string;
}
type SearchValues = Record<string, string | string[] | undefined> | Pick<URLSearchParams, "get">;

export function readSavedWordsState(values: SearchValues = {}): SavedWordsLibraryState {
  const get = (name: string) => {
    const value = "get" in values && typeof values.get === "function" ? values.get(name) : (values as Record<string, string | string[] | undefined>)[name];
    return Array.isArray(value) ? value[0] : value;
  };
  const sort = get("sort");
  const page = Number(get("page"));
  const perPage = Number(get("perPage"));
  // An invalid collection remains scoped so it cannot silently show all words.
  const collectionId = get("collectionId");
  return {
    search: (get("search") ?? "").slice(0, 255),
    sort: sort === "dateAsc" || sort === "az" || sort === "za" ? sort : "dateDesc",
    page: Number.isSafeInteger(page) && page > 0 && page <= 1_000_000 ? page : 1,
    perPage: [6, 12, 24, 48].includes(perPage) ? perPage : savedWordsInitialInput.take,
    ...(collectionId !== null && collectionId !== undefined ? { collectionId: collectionId.slice(0, 200) } : {}),
  };
}

export function getSavedWordsInput(state: SavedWordsLibraryState): inferRouterInputs<AppRouter>["user"]["getSavedWords"] {
  return {
    search: state.search,
    sortAlphabet: state.sort === "za" ? "za" : "az",
    sortDate: state.sort === "dateAsc" ? "dateAsc" : "dateDesc",
    sortBy: state.sort === "az" || state.sort === "za" ? "alphabet" : "date",
    take: state.perPage,
    skip: (state.page - 1) * state.perPage,
    ...(state.collectionId !== undefined ? { collectionId: state.collectionId } : {}),
  };
}

export function getSavedWordsCountInput(state: Pick<SavedWordsLibraryState, "search" | "collectionId">) {
  return { search: state.search, ...(state.collectionId !== undefined ? { collectionId: state.collectionId } : {}) };
}

export function serializeSavedWordsState(state: SavedWordsLibraryState): string {
  const values = new URLSearchParams();
  if (state.search) values.set("search", state.search);
  if (state.sort !== "dateDesc") values.set("sort", state.sort);
  if (state.page > 1) values.set("page", String(state.page));
  if (state.perPage !== savedWordsInitialInput.take) values.set("perPage", String(state.perPage));
  if (state.collectionId !== undefined) values.set("collectionId", state.collectionId);
  return values.toString();
}
