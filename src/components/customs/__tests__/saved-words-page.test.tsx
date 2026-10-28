import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { dehydrate, HydrationBoundary, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";
import { observable } from "@trpc/server/observable";
import { toast } from "sonner";
import { api } from "@/src/trpc/react";
import { getSavedWordsCountInput, getSavedWordsInput, readSavedWordsState } from "@/src/lib/saved-words-input";
import SavedWordsPage from "../saved-words-page";

jest.mock("@/src/trpc/react", () => ({ api: require("@trpc/react-query").createTRPCReact() }));
jest.mock("next-intl", () => ({ useTranslations: () => (key: string, values?: Record<string, unknown>) => values ? `${key} ${Object.values(values).join(" ")}` : key }));
jest.mock("next/navigation", () => ({
  useSearchParams: () => {
    const React = require("react");
    const query = React.useSyncExternalStore((listener: () => void) => { window.addEventListener("popstate", listener); return () => window.removeEventListener("popstate", listener); }, () => window.location.search, () => "");
    return new URLSearchParams(query);
  },
}));
jest.mock("@/src/i18n/routing", () => ({ Link: ({ href, children, prefetch, ...props }: any) => <a {...props} href={typeof href === "string" ? href : `${href.pathname}${href.query ? `?${new URLSearchParams(href.query)}` : ""}`}>{children}</a> }));
jest.mock("sonner", () => ({ toast: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn() }) }));
jest.mock("@heroui/react", () => ({
  Button: ({ children, onPress, onClick, isDisabled, isLoading, startContent, endContent, isIconOnly, size, color, variant, ...props }: any) => <button {...props} disabled={isDisabled || isLoading} onClick={(event) => { onClick?.(event); onPress?.(event); }}>{startContent}{children}{endContent}</button>,
  ModalContent: ({ children }: any) => <div>{children}</div>,
}));
jest.mock("../heroui/custom-modal", () => ({ CustomModal: ({ isOpen, children, "aria-label": label }: any) => isOpen ? <div role="dialog" aria-label={label}>{children}</div> : null }));
jest.mock("../heroui/custom-input", () => ({ CustomInput: require("react").forwardRef(({ value, onValueChange, label, type = "text", maxLength, isRequired, isDisabled }: any, ref: any) => <input ref={ref} type={type} aria-label={label} maxLength={maxLength} required={isRequired} disabled={isDisabled} value={value} onChange={event => onValueChange(event.target.value)} />) }));
jest.mock("../heroui/custom-select", () => ({ CustomSelect: ({ label, options, selectedKeys, onChange, isDisabled }: any) => <select aria-label={label} value={selectedKeys?.[0] ?? ""} onChange={onChange} disabled={isDisabled}><option value="" />{Object.entries(options).map(([key, value]) => <option key={key} value={key}>{String(value)}</option>)}</select> }));
jest.mock("../saved-word-preview", () => ({ __esModule: true, default: ({ word }: any) => <div>{word ? `Preview: ${word.word_name}` : "previewHint"}</div> }));
jest.mock("../heroui/custom-pagination", () => ({ CustomPagination: ({ total, page, onChange }: any) => <div>Pages: {total}<span>Page: {page}</span>{total > 1 && <button onClick={() => onChange(2)}>Go to page 2</button>}</div> }));

const collectionId = "00000000-0000-4000-8000-000000000001";
const secondCollectionId = "00000000-0000-4000-8000-000000000002";
const session = { user: { id: "reader" } } as never;
const makeClient = () => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: false }, mutations: { retry: false } } });

beforeEach(() => {
  jest.clearAllMocks();
  window.history.replaceState({ nextInternal: true }, "", "/en/saved-words");
  Object.defineProperty(window, "matchMedia", { configurable: true, value: jest.fn(() => ({ matches: true, addEventListener: jest.fn(), removeEventListener: jest.fn() })) });
});

function setup(initialSize: number, options: { collectionWords?: number[]; url?: string; failList?: boolean; unsaveDelayMs?: number; collectionDelayMs?: number; collectionRefreshDelayMs?: number } = {}) {
  if (options.url) window.history.replaceState({ nextInternal: true }, "", options.url);
  const initial = readSavedWordsState(new URLSearchParams(window.location.search));
  const collections = [{ id: collectionId, name: "Reading" }, { id: secondCollectionId, name: "Writing" }];
  let rows = Array.from({ length: initialSize }, (_, i) => ({ word_data: {
    word_id: initialSize - i, word_name: `word-${initialSize - i}`, saved_at: "2026-10-01T12:00:00.123456+00:00", meaning: `Meaning ${initialSize - i}`,
    root: { root: "", language: "" }, collections: options.collectionWords?.includes(initialSize - i) ? [{ id: collectionId, name: "Reading" }] : [],
  } }));
  const removed = new Map<number, typeof rows[number]>();
  const requests: { path: string; input: any }[] = [];
  const listRequests: { search: string; take: number; skip: number }[] = [];
  let failList = options.failList ?? false;
  const filtered = (input: any) => rows.filter(row => row.word_data.word_name.includes(input.search ?? "") && (input.collectionId === undefined || row.word_data.collections.some(collection => collection.id === input.collectionId)));
  const collectionRows = () => collections.map(collection => ({ ...collection, wordCount: rows.filter(row => row.word_data.collections.some(member => member.id === collection.id)).length }));
  const serverClient = makeClient();
  if (!failList) serverClient.setQueryData(getQueryKey(api.user.getSavedWords, getSavedWordsInput(initial), "query"), filtered(initial).slice((initial.page - 1) * initial.perPage, initial.page * initial.perPage));
  serverClient.setQueryData(getQueryKey(api.user.getSavedWordCount, getSavedWordsCountInput(initial), "query"), filtered(initial).length);
  serverClient.setQueryData(getQueryKey(api.user.getSavedWordCount, { search: "" }, "query"), rows.length);
  serverClient.setQueryData(getQueryKey(api.user.getSavedWordCollections, undefined, "query"), collectionRows());
  const client = makeClient();
  const trpcClient = api.createClient({ links: [() => ({ op }) => observable(observer => {
    requests.push({ path: op.path, input: op.input });
    const input = op.input as any;
    let data: unknown;
    if (op.path === "user.setWordSaved") {
      const row = rows.find(row => row.word_data.word_id === input.wordId);
      if (row) removed.set(input.wordId, row);
      rows = rows.filter(row => row.word_data.word_id !== input.wordId);
      data = { saved: false, snapshot: row ? { savedAt: row.word_data.saved_at, collectionIds: row.word_data.collections.map(collection => collection.id) } : undefined };
    } else if (op.path === "user.restoreSavedWord") {
      const row = removed.get(input.wordId);
      if (row && !rows.some(item => item.word_data.word_id === input.wordId)) rows = [...rows, row].sort((a, b) => b.word_data.word_id - a.word_data.word_id);
      data = { saved: true };
    } else if (op.path === "user.getSavedWords") {
      listRequests.push(input);
      if (failList) { observer.error(new Error("Offline")); return; }
      data = filtered(input).slice(input.skip, input.skip + input.take);
    } else if (op.path === "user.getSavedWordCount") {
      data = filtered(input).length;
    } else if (op.path === "user.getSavedWordCollections") {
      data = collectionRows();
    } else if (op.path === "user.createSavedWordCollection") {
      const collection = { id: "00000000-0000-4000-8000-000000000003", name: input.name };
      collections.push(collection);
      data = collection;
    } else if (op.path === "user.updateSavedWordCollection") {
      const affected: number[] = [];
      rows = rows.map(row => {
        if (!input.wordIds.includes(row.word_data.word_id)) return row;
        const existing = row.word_data.collections.some(collection => collection.id === input.collectionId);
        if (existing === (input.action === "add")) return row;
        affected.push(row.word_data.word_id);
        return { word_data: { ...row.word_data, collections: input.action === "remove" ? row.word_data.collections.filter(collection => collection.id !== input.collectionId) : [...row.word_data.collections, collections.find(collection => collection.id === input.collectionId)!] } };
      });
      data = { success: true, wordIds: affected };
    } else if (op.path === "word.getWord") data = [];
    else data = false;
    const emit = () => { observer.next({ result: { data } }); observer.complete(); };
    if (op.path === "user.setWordSaved" && options.unsaveDelayMs) {
      const timer = setTimeout(emit, options.unsaveDelayMs);
      return () => clearTimeout(timer);
    }
    if (op.path === "user.createSavedWordCollection" && options.collectionDelayMs) {
      const timer = setTimeout(emit, options.collectionDelayMs);
      return () => clearTimeout(timer);
    }
    if (op.path === "user.getSavedWordCollections" && options.collectionRefreshDelayMs) {
      const timer = setTimeout(emit, options.collectionRefreshDelayMs);
      return () => clearTimeout(timer);
    }
    emit();
  })] });
  const view = render(<QueryClientProvider client={client}><api.Provider client={trpcClient} queryClient={client}><HydrationBoundary state={dehydrate(serverClient)}><SavedWordsPage session={session} locale="en" /></HydrationBoundary></api.Provider></QueryClientProvider>);
  return { requests, listRequests, client, view, recover: () => { failList = false; }, cleanup: () => { view.unmount(); client.clear(); } };
}

test("prepared library hydrates list, total and collections without another request", async () => {
  const test = setup(7);
  expect(screen.getByRole("button", { name: "previewWord word-7" })).toBeInTheDocument();
  expect(screen.getByText("Pages: 2")).toBeInTheDocument();
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
  expect(test.requests).toEqual([]);
  test.cleanup();
});

test("idempotent removal updates count, and Undo sends the precise original date and memberships", async () => {
  const test = setup(7, { collectionWords: [7] });
  fireEvent.click(screen.getByRole("button", { name: "unsaveWord word-7" }));
  await waitFor(() => expect(screen.queryByRole("button", { name: "previewWord word-7" })).not.toBeInTheDocument());
  expect(screen.getByRole("button", { name: "previewWord word-1" })).toBeInTheDocument();
  await waitFor(() => expect(toast).toHaveBeenCalled());
  const undo = (toast as unknown as jest.Mock).mock.calls.at(-1)[1].action.onClick;
  await act(async () => undo());
  await screen.findByRole("button", { name: "previewWord word-7" });
  expect(test.requests.find(request => request.path === "user.restoreSavedWord")?.input).toEqual({ wordId: 7, savedAt: "2026-10-01T12:00:00.123456+00:00", collectionIds: [collectionId] });
  test.cleanup();
});

test("removing the final word on the last page returns to the remaining library", async () => {
  const test = setup(7);
  fireEvent.click(screen.getByRole("button", { name: "Go to page 2" }));
  await screen.findByRole("button", { name: "unsaveWord word-1" });
  fireEvent.click(screen.getByRole("button", { name: "unsaveWord word-1" }));
  await screen.findByRole("button", { name: "previewWord word-7" });
  expect(window.location.search).not.toContain("page=");
  expect(screen.queryByText("emptyLibraryTitle")).not.toBeInTheDocument();
  test.cleanup();
});

test.each([false, true])("unchanged real toolbar debounce preserves page 2 (initial debounce settled: %s)", async (settleInitialSearch) => {
  const test = setup(7);
  if (settleInitialSearch) await act(async () => { await new Promise(resolve => setTimeout(resolve, 350)); });
  fireEvent.click(screen.getByRole("button", { name: "Go to page 2" }));
  await screen.findByRole("button", { name: "previewWord word-1" });
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 350)); });
  expect(screen.getByText("Page: 2")).toBeInTheDocument();
  expect(test.listRequests).toHaveLength(1);
  expect(test.listRequests[0]).toMatchObject({ search: "", skip: 6 });
  test.cleanup();
});

test("changed search resets the page after debounce and lets Next synchronize its URL hooks", async () => {
  const test = setup(13);
  const replace = jest.spyOn(window.history, "replaceState");
  fireEvent.click(screen.getByRole("button", { name: "Go to page 2" }));
  await screen.findByRole("button", { name: "previewWord word-7" });
  fireEvent.change(screen.getByRole("searchbox", { name: "searchLabel" }), { target: { value: "word-1" } });
  expect(screen.getByText("Page: 2")).toBeInTheDocument();
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 350)); });
  await waitFor(() => expect(test.listRequests.at(-1)).toMatchObject({ search: "word-1", skip: 0 }));
  expect(window.location.search).toBe("?search=word-1");
  expect(replace).toHaveBeenLastCalledWith(null, "", "/en/saved-words?search=word-1");
  replace.mockRestore();
  test.cleanup();
});

test("preview requests the selected word ID instead of substituting a same-name variant", async () => {
  const test = setup(2);
  fireEvent.click(screen.getByRole("button", { name: "previewWord word-1" }));
  await waitFor(() => expect(test.requests.find(request => request.path === "word.getWord")?.input)
    .toEqual({ name: "word-1", wordId: 1, skipLogging: true }));
  test.cleanup();
});

test("a delayed unsave does not close a different word preview opened while it was pending", async () => {
  const test = setup(2, { unsaveDelayMs: 75 });
  fireEvent.click(screen.getByRole("button", { name: "previewWord word-2" }));
  fireEvent.click(screen.getByRole("button", { name: "unsaveWord word-2" }));
  fireEvent.click(screen.getByRole("button", { name: "previewWord word-1" }));
  await waitFor(() => expect(screen.queryByRole("button", { name: "previewWord word-2" })).not.toBeInTheDocument());
  expect(screen.getByText("Preview: word-1")).toBeInTheDocument();
  test.cleanup();
});

test("switching collections closes a rename form bound to the previous collection", async () => {
  const test = setup(2, { collectionWords: [2] });
  fireEvent.click(screen.getByRole("button", { name: "Reading", exact: true }));
  fireEvent.click(screen.getByRole("button", { name: "renameCollection", exact: true }));
  expect(screen.getByRole("textbox", { name: "collectionName", exact: true })).toHaveValue("Reading");
  fireEvent.click(screen.getByRole("button", { name: "Writing", exact: true }));
  expect(screen.queryByRole("textbox", { name: "collectionName", exact: true })).not.toBeInTheDocument();
  expect(test.requests.some(request => request.path === "user.renameSavedWordCollection")).toBe(false);
  test.cleanup();
});

test("finishing a delayed collection creation preserves a newer search", async () => {
  const test = setup(2, { collectionDelayMs: 650 });
  fireEvent.click(screen.getByRole("button", { name: "newCollection", exact: true }));
  fireEvent.change(screen.getByRole("textbox", { name: "collectionName", exact: true }), { target: { value: "Books" } });
  fireEvent.click(screen.getByRole("button", { name: "saveCollection", exact: true }));
  fireEvent.change(screen.getByRole("searchbox", { name: "searchLabel", exact: true }), { target: { value: "word-1" } });
  await waitFor(() => expect(test.listRequests.at(-1)?.search).toBe("word-1"));
  await waitFor(() => expect(window.location.search).toContain("collectionId=00000000-0000-4000-8000-000000000003"));
  expect(window.location.search).toContain("search=word-1");
  expect(screen.getByRole("searchbox", { name: "searchLabel", exact: true })).toHaveValue("word-1");
  test.cleanup();
});

test("collection controls stay busy until refreshed data and selection finish", async () => {
  const test = setup(2, { collectionRefreshDelayMs: 250 });
  fireEvent.click(screen.getByRole("button", { name: "newCollection", exact: true }));
  fireEvent.change(screen.getByRole("textbox", { name: "collectionName", exact: true }), { target: { value: "Books" } });
  fireEvent.click(screen.getByRole("button", { name: "saveCollection", exact: true }));
  await waitFor(() => expect(test.requests.some(request => request.path === "user.getSavedWordCollections")).toBe(true));
  expect(screen.getByRole("button", { name: "allWords", exact: true })).toBeDisabled();
  expect(screen.getByRole("button", { name: "saveCollection", exact: true })).toBeDisabled();
  expect(screen.getByRole("button", { name: "cancel", exact: true })).toBeDisabled();
  expect(screen.getByRole("textbox", { name: "collectionName", exact: true })).toBeDisabled();
  await waitFor(() => expect(screen.getByRole("button", { name: "Books", exact: true })).toHaveAttribute("aria-pressed", "true"));
  await waitFor(() => expect(screen.getByRole("button", { name: "allWords", exact: true })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "allWords", exact: true }));
  await screen.findByRole("button", { name: "previewWord word-2", exact: true });
  expect(window.location.search).not.toContain("collectionId");
  test.cleanup();
});

test("returning to a URL restores search, sort and page without a debounce reset", async () => {
  const test = setup(13);
  await act(async () => { window.history.replaceState(window.history.state, "", "/en/saved-words?sort=az&page=2"); window.dispatchEvent(new PopStateEvent("popstate")); });
  await screen.findByRole("button", { name: "previewWord word-7" });
  expect(screen.getByRole("combobox", { name: "sortLabel" })).toHaveValue("az");
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 350)); });
  expect(screen.getByText("Page: 2")).toBeInTheDocument();
  expect(test.listRequests.at(-1)).toMatchObject({ sortBy: "alphabet", skip: 6 });
  test.cleanup();
});

test("an empty prepared library has a discovery action and no refetch", async () => {
  const test = setup(0);
  expect(screen.getByText("emptyLibraryTitle")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "discoverWords" })).toHaveAttribute("href", "/word-list");
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
  expect(test.requests).toEqual([]);
  test.cleanup();
});

test("invalid empty collection scope stays unavailable and cannot practice all saved words", async () => {
  const test = setup(7, { url: "/en/saved-words?collectionId=" });
  expect(screen.getByText("collectionUnavailable")).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "practiceCollection" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "previewWord word-7" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "showAllWords" }));
  await screen.findByRole("button", { name: "previewWord word-7" });
  expect(window.location.search).toBe("");
  test.cleanup();
});

test("collection Practice link retains source and collection scope", () => {
  const test = setup(7, { collectionWords: [7], url: `/en/saved-words?collectionId=${collectionId}` });
  expect(screen.getByRole("link", { name: "practiceCollection" })).toHaveAttribute("href", `/play/flashcards?source=saved&collectionId=${collectionId}`);
  test.cleanup();
});

test("partial membership removal Undo restores only memberships that existed", async () => {
  const test = setup(2, { collectionWords: [2] });
  fireEvent.click(screen.getByRole("button", { name: "selectWords" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "selectAll" }));
  fireEvent.change(screen.getByRole("combobox", { name: "targetCollection" }), { target: { value: collectionId } });
  fireEvent.click(screen.getByRole("button", { name: "removeFromCollection" }));
  await waitFor(() => expect(toast.success).toHaveBeenCalled());
  const undo = (toast.success as jest.Mock).mock.calls.at(-1)[1].action.onClick;
  await act(async () => undo());
  await waitFor(() => expect(test.requests.filter(request => request.path === "user.updateSavedWordCollection")).toHaveLength(2));
  expect(test.requests.filter(request => request.path === "user.updateSavedWordCollection").at(-1)?.input).toEqual({ collectionId, wordIds: [2], action: "add" });
  test.cleanup();
});

test("a load failure is recoverable and is not shown as an empty library", async () => {
  const test = setup(1, { failList: true });
  await screen.findByText("loadFailed");
  expect(screen.queryByText("emptyLibraryTitle")).not.toBeInTheDocument();
  test.recover();
  fireEvent.click(screen.getByRole("button", { name: "retry" }));
  await screen.findByRole("button", { name: "previewWord word-1" });
  test.cleanup();
});
