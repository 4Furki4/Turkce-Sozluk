import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { dehydrate, HydrationBoundary, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";
import { observable } from "@trpc/server/observable";
import { api } from "@/src/trpc/react";
import { savedWordsInitialInput } from "@/src/lib/saved-words-input";
import SavedWordsPage from "../saved-words-page";

jest.mock("@/src/trpc/react", () => ({ api: require("@trpc/react-query").createTRPCReact() }));
jest.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
jest.mock("@/src/store/preferences", () => ({ preferencesState: {} }));
jest.mock("valtio", () => ({ useSnapshot: () => ({ isBlurEnabled: false }) }));
jest.mock("../heroui/custom-input", () => ({ CustomInput: ({ value, onValueChange, placeholder }: { value: string; onValueChange: (value: string) => void; placeholder: string }) => (
  <input aria-label="search saved words" value={value} onChange={event => onValueChange(event.target.value)} placeholder={placeholder} />
) }));
jest.mock("../heroui/custom-select", () => ({ CustomSelect: ({ label, options, defaultSelectedKeys, onChange }: { label: string; options: Record<string, string>; defaultSelectedKeys: string[]; onChange: React.ChangeEventHandler<HTMLSelectElement> }) => (
  <select aria-label={label} defaultValue={defaultSelectedKeys[0]} onChange={onChange}>{Object.entries(options).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select>
) }));
jest.mock("../saved-word-card-skeleton", () => ({ __esModule: true, default: () => <div>Loading card</div> }));
jest.mock("../saved-word-card", () => ({ __esModule: true, default: ({ wordData, onUnsave }: { wordData: { word_name: string }; onUnsave: () => void }) => (
  <div>{wordData.word_name}<button onClick={onUnsave}>Remove {wordData.word_name}</button></div>
) }));
jest.mock("../heroui/custom-pagination", () => ({ CustomPagination: ({ total, page, initialPage, onChange }: { total: number; page?: number; initialPage: number; onChange: (page: number) => void }) => (
  <div>Pages: {total}<span>Page: {page ?? initialPage}</span>{total > 1 ? <button onClick={() => onChange(2)}>Go to page 2</button> : null}</div>
) }));

const session = { user: { id: "reader" } } as never;
const makeClient = () => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: false }, mutations: { retry: false } } });

function setup(initialSize: number) {
  let rows = Array.from({ length: initialSize }, (_, i) => ({ word_data: { word_id: initialSize - i, word_name: `word-${initialSize - i}` } }));
  const requests: string[] = [];
  const listRequests: { search: string; take: number; skip: number }[] = [];
  const serverClient = makeClient();
  serverClient.setQueryData(getQueryKey(api.user.getSavedWords, savedWordsInitialInput, "query"), rows.slice(0, 6));
  serverClient.setQueryData(getQueryKey(api.user.getSavedWordCount, { search: "" }, "query"), rows.length);
  const client = makeClient();
  const trpcClient = api.createClient({ links: [() => ({ op }) => observable(observer => {
    requests.push(op.path);
    let data: unknown;
    if (op.path === "user.saveWord") {
      rows = rows.filter(row => row.word_data.word_id !== (op.input as { wordId: number }).wordId);
      data = false;
    } else if (op.path === "user.getSavedWords") {
      const input = op.input as { search: string; take: number; skip: number };
      listRequests.push(input);
      data = rows.filter(row => row.word_data.word_name.includes(input.search)).slice(input.skip, input.skip + input.take);
    } else if (op.path === "user.getSavedWordCount") {
      data = rows.filter(row => row.word_data.word_name.includes((op.input as { search: string }).search)).length;
    } else {
      data = false;
    }
    observer.next({ result: { data } });
    observer.complete();
  })] });
  const view = render(
    <QueryClientProvider client={client}>
      <api.Provider client={trpcClient} queryClient={client}>
        <HydrationBoundary state={dehydrate(serverClient)}>
          <SavedWordsPage session={session} locale="en" />
        </HydrationBoundary>
      </api.Provider>
    </QueryClientProvider>
  );
  return { requests, listRequests, client, view };
}

test("fresh prepared data shows the first page without another list or count request", async () => {
  const { requests, view, client } = setup(7);
  expect(screen.getByText("word-7")).toBeInTheDocument();
  expect(screen.getByText("Pages: 2")).toBeInTheDocument();
  expect(screen.queryByText("Loading card")).not.toBeInTheDocument();
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(requests).toEqual([]);
  view.unmount();
  client.clear();
});

test("removing a word updates both the visible cards and the page count", async () => {
  const { requests, view, client } = setup(7);
  fireEvent.click(screen.getByRole("button", { name: "Remove word-7" }));
  await waitFor(() => expect(screen.queryByText("word-7")).not.toBeInTheDocument());
  expect(screen.getByText("word-1")).toBeInTheDocument();
  await waitFor(() => expect(screen.getByText("Pages: 1")).toBeInTheDocument());
  expect(requests).toEqual(expect.arrayContaining(["user.saveWord", "user.getSavedWords", "user.getSavedWordCount"]));
  view.unmount();
  client.clear();
});

test("removing the final word on the last page returns to the remaining words", async () => {
  const { view, client } = setup(7);
  fireEvent.click(screen.getByRole("button", { name: "Go to page 2" }));
  await screen.findByRole("button", { name: "Remove word-1" });
  expect(screen.getByText("Page: 2")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Remove word-1" }));
  await waitFor(() => expect(screen.getByText("Page: 1")).toBeInTheDocument());
  expect(screen.getByText("Pages: 1")).toBeInTheDocument();
  expect(screen.getByText("word-7")).toBeInTheDocument();
  expect(screen.queryByText("emptyMessage")).not.toBeInTheDocument();
  view.unmount();
  client.clear();
});

test.each([false, true])("the real toolbar keeps the selected page with an unchanged search (initial debounce complete: %s)", async (settleInitialSearch) => {
  const { view, client, listRequests } = setup(7);
  if (settleInitialSearch) await act(async () => { await new Promise(resolve => setTimeout(resolve, 350)); });
  fireEvent.click(screen.getByRole("button", { name: "Go to page 2" }));
  await screen.findByRole("button", { name: "Remove word-1" });
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 350)); });
  expect(screen.getByText("Page: 2")).toBeInTheDocument();
  expect(screen.getByText("word-1")).toBeInTheDocument();
  expect(listRequests).toHaveLength(1);
  expect(listRequests[0]).toMatchObject({ search: "", skip: 6 });
  view.unmount();
  client.clear();
});

test("a changed search resets the page after the real toolbar debounce", async () => {
  const { view, client, listRequests } = setup(13);
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 350)); });
  fireEvent.click(screen.getByRole("button", { name: "Go to page 2" }));
  await screen.findByRole("button", { name: "Remove word-7" });
  fireEvent.change(screen.getByRole("textbox", { name: "search saved words" }), { target: { value: "word-1" } });
  expect(screen.getByText("Page: 2")).toBeInTheDocument();
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 350)); });
  await waitFor(() => expect(screen.getByText("Page: 1")).toBeInTheDocument());
  expect(listRequests.at(-1)).toMatchObject({ search: "word-1", skip: 0 });
  await waitFor(() => expect(screen.getByText("Pages: 1")).toBeInTheDocument());
  view.unmount();
  client.clear();
});

test("an empty prepared account shows its empty state without refetching", async () => {
  const { requests, view, client } = setup(0);
  expect(screen.getByText("emptyMessage")).toBeInTheDocument();
  expect(screen.queryByText("Loading card")).not.toBeInTheDocument();
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(requests).toEqual([]);
  view.unmount();
  client.clear();
});
