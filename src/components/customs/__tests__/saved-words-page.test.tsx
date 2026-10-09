import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { dehydrate, HydrationBoundary, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";
import { observable } from "@trpc/server/observable";
import { api } from "@/src/trpc/react";
import { savedWordsInitialInput } from "@/src/lib/saved-words-input";
import SavedWordsPage from "../saved-words-page";

jest.mock("@/src/trpc/react", () => ({ api: require("@trpc/react-query").createTRPCReact() }));
jest.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
jest.mock("../saved-words-toolbar", () => ({ __esModule: true, default: () => <input aria-label="search saved words" /> }));
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
      const { take, skip } = op.input as { take: number; skip: number };
      data = rows.slice(skip, skip + take);
    } else if (op.path === "user.getSavedWordCount") {
      data = rows.length;
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
  return { requests, client, view };
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

test("an empty prepared account shows its empty state without refetching", async () => {
  const { requests, view, client } = setup(0);
  expect(screen.getByText("emptyMessage")).toBeInTheDocument();
  expect(screen.queryByText("Loading card")).not.toBeInTheDocument();
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(requests).toEqual([]);
  view.unmount();
  client.clear();
});
