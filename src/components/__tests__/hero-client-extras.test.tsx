import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BentoCommonMistake, BentoGalatiMeshur } from "../hero-client-extras";

const mockFetch = jest.fn();
let mockIsOnline = true;

jest.mock("@/src/hooks/use-online-status", () => ({ useOnlineStatus: () => mockIsOnline }));
jest.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
jest.mock("@/src/components/customs/heroui/custom-card", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <article>{children}</article>,
}));
jest.mock("@/src/i18n/routing", () => ({
  Link: ({ href, children, ...props }: { href: string | { params: { id: string } }; children: React.ReactNode }) => (
    <a {...props} href={typeof href === "string" ? href : `/galati-meshur/${href.params.id}`}>{children}</a>
  ),
}));
jest.mock("@heroui/react", () => ({
  CardBody: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  CardFooter: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  Button: ({ children, isDisabled, onPress, "aria-label": label, "aria-disabled": ariaDisabled }: {
    children: React.ReactNode;
    isDisabled?: boolean;
    onPress: () => void;
    "aria-label": string;
    "aria-disabled"?: boolean;
  }) => <button disabled={isDisabled} onClick={onPress} aria-label={label} aria-disabled={ariaDisabled}>{children}</button>,
}));
jest.mock("@/src/trpc/react", () => {
  const { useQuery, useQueryClient } = jest.requireActual("@tanstack/react-query");
  const useHeroQuery = (input: { offset: number }, options: object) => useQuery({
    queryKey: ["hero-entry", input.offset],
    queryFn: () => mockFetch(input.offset),
    ...options,
  });
  const useUtils = () => {
    const client = useQueryClient();
    const getData = (input: { offset: number }) => client.getQueryData(["hero-entry", input.offset]);
    return { extras: { getMisspellings: { getData }, getGalatiMeshur: { getData } } };
  };
  return { api: { useUtils, extras: { getMisspellings: { useQuery: useHeroQuery }, getGalatiMeshur: { useQuery: useHeroQuery } } } };
});

beforeEach(() => {
  mockFetch.mockReset();
  mockIsOnline = true;
  window.matchMedia = jest.fn().mockReturnValue({
    matches: false, addListener: jest.fn(), removeListener: jest.fn(),
    addEventListener: jest.fn(), removeEventListener: jest.fn(),
  });
});

test.each(["misspellings", "galati"] as const)("%s allows cached pages offline without advancing into an uncached page", async (kind) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const firstMistake = { data: [{ id: 1, wrong: "şöför", correct: "şoför" }], total: 3 };
  const secondMistake = { data: [{ id: 2, wrong: "herkez", correct: "herkes" }], total: 3 };
  const firstGalati = { data: [{ id: 1, word: "vasat", explanation: "Orta, ortalama.", correctUsage: null }], total: 3 };
  const secondGalati = { data: [{ id: 2, word: "mütevazı", explanation: "Alçak gönüllü.", correctUsage: null }], total: 3 };
  const firstWord = kind === "misspellings" ? "şoför" : "vasat";
  const secondWord = kind === "misspellings" ? "herkes" : "mütevazı";
  client.setQueryData(["hero-entry", 1], kind === "misspellings" ? secondMistake : secondGalati);
  const content = () => (
    <QueryClientProvider client={client}>
      {kind === "misspellings" ? <BentoCommonMistake initialData={firstMistake} /> : <BentoGalatiMeshur initialData={firstGalati} />}
    </QueryClientProvider>
  );
  const { rerender, unmount } = render(content());
  const previous = screen.getByRole("button", { name: "HomeExtras.previous" });
  const next = screen.getByRole("button", { name: "HomeExtras.next" });
  fireEvent.click(next);
  await waitFor(() => expect(screen.getByText(secondWord)).toBeVisible());
  await waitFor(() => expect(screen.queryByText(firstWord)).not.toBeInTheDocument());
  mockIsOnline = false;
  rerender(content());
  expect(next).toHaveAttribute("aria-disabled", "true");
  expect(previous).toHaveAttribute("aria-disabled", "false");
  fireEvent.click(next);
  expect(screen.getByText("2 / 3")).toBeVisible();
  fireEvent.click(previous);
  await waitFor(() => expect(screen.getByText(firstWord)).toBeVisible());
  expect(screen.getByText("1 / 3")).toBeVisible();
  expect(next).toHaveAttribute("aria-disabled", "false");
  await waitFor(() => expect(screen.queryByText(secondWord)).not.toBeInTheDocument());
  fireEvent.click(next);
  await waitFor(() => expect(screen.getByText(secondWord)).toBeVisible());
  expect(screen.getByText("2 / 3")).toBeVisible();
  expect(mockFetch).not.toHaveBeenCalled();
  unmount();
  client.clear();
});

test.each(["misspellings", "galati"] as const)("%s can return to the current entry if connectivity drops during a request", async (kind) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const firstMistake = { data: [{ id: 1, wrong: "şöför", correct: "şoför" }], total: 2 };
  const firstGalati = { data: [{ id: 1, word: "vasat", explanation: "Orta, ortalama.", correctUsage: null }], total: 2 };
  mockFetch.mockImplementation(() => new Promise(() => {}));
  const content = () => (
    <QueryClientProvider client={client}>
      {kind === "misspellings" ? <BentoCommonMistake initialData={firstMistake} /> : <BentoGalatiMeshur initialData={firstGalati} />}
    </QueryClientProvider>
  );
  const { rerender, unmount } = render(content());
  const previous = screen.getByRole("button", { name: "HomeExtras.previous" });
  fireEvent.click(screen.getByRole("button", { name: "HomeExtras.next" }));
  await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
  mockIsOnline = false;
  rerender(content());
  expect(previous).toHaveAttribute("aria-disabled", "false");
  fireEvent.click(previous);
  expect(screen.getByText("1 / 2")).toBeVisible();
  expect(screen.getByText(kind === "misspellings" ? "şoför" : "vasat")).toBeVisible();
  expect(previous).toHaveAttribute("aria-disabled", "true");
  unmount();
  client.clear();
});

test.each(["misspellings", "galati"] as const)("%s retains the current page while loading and returns through the cache", async (kind) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const firstMistake = { data: [{ id: 1, wrong: "şöför", correct: "şoför" }], total: 2 };
  const secondMistake = { data: [{ id: 2, wrong: "herkez", correct: "herkes" }], total: 2 };
  const firstGalati = { data: [{ id: 1, word: "vasat", explanation: "Orta, ortalama.", correctUsage: null }], total: 2 };
  const secondGalati = { data: [{ id: 2, word: "mütevazı", explanation: "Alçak gönüllü.", correctUsage: null }], total: 2 };
  const firstWord = kind === "misspellings" ? "şoför" : "vasat";
  const secondWord = kind === "misspellings" ? "herkes" : "mütevazı";
  let finishRequest!: (value: unknown) => void;
  mockFetch.mockImplementation(() => new Promise(resolve => { finishRequest = resolve; }));
  const { unmount } = render(
    <QueryClientProvider client={client}>
      {kind === "misspellings" ? <BentoCommonMistake initialData={firstMistake} /> : <BentoGalatiMeshur initialData={firstGalati} />}
    </QueryClientProvider>,
  );
  const previous = screen.getByRole("button", { name: "HomeExtras.previous" });
  const next = screen.getByRole("button", { name: "HomeExtras.next" });
  expect(previous).toHaveAttribute("aria-disabled", "true");
  expect(screen.getByText("1 / 2")).toBeVisible();
  fireEvent.click(next);
  await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
  expect(screen.getByText(firstWord)).toBeVisible();
  expect(screen.getByText("1 / 2")).toBeVisible();
  expect(previous).toHaveAttribute("aria-disabled", "true");
  expect(next).toHaveAttribute("aria-disabled", "true");
  fireEvent.click(next);
  expect(mockFetch).toHaveBeenCalledTimes(1);

  await act(async () => { finishRequest(kind === "misspellings" ? secondMistake : secondGalati); });
  await waitFor(() => expect(screen.getByText(secondWord)).toBeVisible());
  expect(screen.getByText("2 / 2")).toBeVisible();
  expect(screen.getByRole("button", { name: "HomeExtras.previous" })).toBe(previous);
  expect(previous).toHaveAttribute("aria-disabled", "false");
  expect(next).toHaveAttribute("aria-disabled", "true");
  await waitFor(() => expect(screen.queryByText(firstWord)).not.toBeInTheDocument());

  fireEvent.click(previous);
  await waitFor(() => expect(screen.getByText(firstWord)).toBeVisible());
  expect(screen.getByText("1 / 2")).toBeVisible();
  expect(previous).toHaveAttribute("aria-disabled", "true");
  expect(next).toHaveAttribute("aria-disabled", "false");
  expect(mockFetch).toHaveBeenCalledTimes(1);
  if (kind === "galati") {
    expect(screen.getByRole("link", { name: "HomeExtras.readMore" })).toHaveAttribute("href", "/galati-meshur/1");
  }
  unmount();
  client.clear();
});

test.each(["misspellings", "galati"] as const)("%s rolls a different entry and keeps the displayed number while loading", async (kind) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const firstMistake = { data: [{ id: 1, wrong: "şöför", correct: "şoför" }], total: 3 };
  const lastMistake = { data: [{ id: 3, wrong: "herkez", correct: "herkes" }], total: 3 };
  const firstGalati = { data: [{ id: 1, word: "vasat", explanation: "Orta, ortalama.", correctUsage: null }], total: 3 };
  const lastGalati = { data: [{ id: 3, word: "mütevazı", explanation: "Alçak gönüllü.", correctUsage: null }], total: 3 };
  let finishRequest!: (value: unknown) => void;
  mockFetch.mockImplementation(() => new Promise(resolve => { finishRequest = resolve; }));
  const { unmount } = render(
    <QueryClientProvider client={client}>
      {kind === "misspellings" ? <BentoCommonMistake initialData={firstMistake} /> : <BentoGalatiMeshur initialData={firstGalati} />}
    </QueryClientProvider>,
  );
  const dice = screen.getByRole("button", { name: "HomeExtras.random" });
  const random = jest.spyOn(Math, "random").mockReturnValue(0.75);
  try {
    fireEvent.click(dice);
    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith(2));
    expect(screen.getByText("1 / 3")).toBeVisible();
    expect(dice).toHaveAttribute("aria-disabled", "true");
    expect(dice).toBeEnabled(); // Pending rolls retain the native focus target.
    fireEvent.click(dice);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    await act(async () => { finishRequest(kind === "misspellings" ? lastMistake : lastGalati); });
    await waitFor(() => expect(screen.getByText(kind === "misspellings" ? "herkes" : "mütevazı")).toBeVisible());
    expect(screen.getByText("3 / 3")).toBeVisible();
    expect(screen.getByRole("button", { name: "HomeExtras.previous" })).toHaveAttribute("aria-disabled", "false");
    expect(screen.getByRole("button", { name: "HomeExtras.next" })).toHaveAttribute("aria-disabled", "true");
    if (kind === "galati") {
      expect(screen.getByRole("link", { name: "HomeExtras.readMore" })).toHaveAttribute("href", "/galati-meshur/3");
    }

    random.mockReturnValue(0);
    fireEvent.click(dice);
    expect(await screen.findByText("1 / 3")).toBeVisible();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  } finally {
    random.mockRestore();
    unmount();
    client.clear();
  }
});

test.each(["misspellings", "galati"] as const)("%s can retry failed or empty rolls", async (kind) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const firstMistake = { data: [{ id: 1, wrong: "şöför", correct: "şoför" }], total: 2 };
  const firstGalati = { data: [{ id: 1, word: "vasat", explanation: "Orta, ortalama.", correctUsage: null }], total: 2 };
  mockFetch
    .mockRejectedValueOnce(new Error("Unavailable"))
    .mockResolvedValueOnce({ data: [], total: 2 })
    .mockResolvedValueOnce({
      data: [{ id: 2, wrong: "herkez", correct: "herkes", word: "mütevazı" }],
      total: 2,
    });
  const { unmount } = render(
    <QueryClientProvider client={client}>
      {kind === "misspellings" ? <BentoCommonMistake initialData={firstMistake} /> : <BentoGalatiMeshur initialData={firstGalati} />}
    </QueryClientProvider>,
  );
  const dice = screen.getByRole("button", { name: "HomeExtras.random" });
  for (const attempt of [1, 2]) {
    fireEvent.click(dice);
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(attempt));
    await waitFor(() => expect(dice).toHaveAttribute("aria-disabled", "false"));
    expect(screen.getByText("1 / 2")).toBeVisible();
    expect(screen.getByText(kind === "misspellings" ? "şoför" : "vasat")).toBeVisible();
  }
  fireEvent.click(dice);
  await waitFor(() => expect(screen.getByText("2 / 2")).toBeVisible());
  expect(mockFetch.mock.calls).toEqual([[1], [1], [1]]);
  unmount();
  client.clear();
});

test("a roll that finds an empty collection clears the card", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const first = { data: [{ id: 1, wrong: "şöför", correct: "şoför" }], total: 2 };
  mockFetch.mockResolvedValueOnce({ data: [], total: 0 });
  const { unmount } = render(
    <QueryClientProvider client={client}>
      <BentoCommonMistake initialData={first} />
    </QueryClientProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "HomeExtras.random" }));
  await waitFor(() => expect(screen.queryByRole("button", { name: "HomeExtras.random" })).not.toBeInTheDocument());
  expect(screen.queryByText("1 / 2")).not.toBeInTheDocument();
  expect(screen.getByText("HomeExtras.noMisspellingsFound")).toBeVisible();
  unmount();
  client.clear();
});

test.each(["HomeExtras.random", "HomeExtras.next"])(
  "%s stays focused while a deleted entry is revalidated and can be retried after failure", async (label) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const first = { data: [{ id: 1, word: "vasat", explanation: "Orta, ortalama.", correctUsage: null }], total: 2 };
  mockFetch
    .mockResolvedValueOnce({ data: [], total: 1 })
    .mockRejectedValueOnce(new Error("Unavailable"))
    .mockResolvedValueOnce({
      data: [{ id: 2, word: "mütevazı", explanation: "Alçak gönüllü.", correctUsage: null }],
      total: 1,
    });
  const { unmount } = render(
    <QueryClientProvider client={client}>
      <BentoGalatiMeshur initialData={first} />
    </QueryClientProvider>,
  );
  const trigger = screen.getByRole("button", { name: label });
  act(() => trigger.focus());
  fireEvent.click(trigger);
  const retry = await screen.findByRole("button", { name: "HomeExtras.retry" });
  expect(trigger).toHaveFocus();
  await waitFor(() => expect(retry).toHaveAttribute("aria-disabled", "false"));
  expect(screen.getByText("vasat")).toBeVisible();
  expect(screen.queryByRole("link", { name: "HomeExtras.readMore" })).not.toBeInTheDocument();

  fireEvent.click(retry);
  await waitFor(() => expect(screen.getByText("mütevazı")).toBeVisible());
  expect(screen.getByRole("link", { name: "HomeExtras.readMore" })).toHaveAttribute("href", "/galati-meshur/2");
  expect(mockFetch.mock.calls).toEqual([[1], [0], [0]]);
  mockFetch.mockRejectedValueOnce(new Error("Background refresh failed"));
  await act(async () => { await client.refetchQueries({ queryKey: ["hero-entry", 0], exact: true }); });
  expect(screen.getByText("mütevazı")).toBeVisible();
  expect(screen.queryByRole("button", { name: "HomeExtras.retry" })).not.toBeInTheDocument();
  unmount();
  client.clear();
});

test("a roll can reach another example after the visible ID moves to a different offset", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const first = { id: 1, wrong: "şöför", correct: "şoför" };
  const second = { id: 2, wrong: "herkez", correct: "herkes" };
  const third = { id: 3, wrong: "yanlız", correct: "yalnız" };
  client.setQueryData(["hero-entry", 0], { data: [first], total: 3 }, { updatedAt: Date.now() - 1000 });
  client.setQueryData(["hero-entry", 1], { data: [second], total: 3 }, { updatedAt: Date.now() - 1000 });
  mockFetch.mockResolvedValueOnce({ data: [second], total: 2 }).mockResolvedValueOnce({ data: [third], total: 2 });
  const { unmount } = render(
    <QueryClientProvider client={client}>
      <BentoCommonMistake />
    </QueryClientProvider>,
  );
  const dice = screen.getByRole("button", { name: "HomeExtras.random" });
  const random = jest.spyOn(Math, "random").mockReturnValue(0.9);
  try {
    fireEvent.click(screen.getByRole("button", { name: "HomeExtras.next" }));
    await waitFor(() => expect(screen.getByText("2 / 3")).toBeVisible());
    client.removeQueries({ queryKey: ["hero-entry", 0], exact: true });
    fireEvent.click(dice);
    await waitFor(() => expect(screen.getByText("yalnız")).toBeVisible());
    expect(screen.getByText("2 / 2")).toBeVisible();
    expect(mockFetch.mock.calls).toEqual([[0], [1]]);
  } finally {
    random.mockRestore();
    unmount();
    client.clear();
  }
});

test("a roll recovers when the displayed position no longer exists", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const first = { data: [{ id: 1, wrong: "şöför", correct: "şoför" }], total: 4 };
  client.setQueryData(["hero-entry", 3], { data: [{ id: 4, wrong: "herkez", correct: "herkes" }], total: 4 });
  mockFetch
    .mockResolvedValueOnce({ data: [], total: 2 })
    .mockResolvedValueOnce({ data: [{ id: 2, wrong: "yanlız", correct: "yalnız" }], total: 2 });
  const { unmount } = render(
    <QueryClientProvider client={client}>
      <BentoCommonMistake initialData={first} />
    </QueryClientProvider>,
  );
  const dice = screen.getByRole("button", { name: "HomeExtras.random" });
  const random = jest.spyOn(Math, "random").mockReturnValue(0.9);
  try {
    fireEvent.click(dice);
    await waitFor(() => expect(screen.getByText("4 / 4")).toBeVisible());
    fireEvent.click(dice);
    await waitFor(() => expect(screen.getByText("2 / 2")).toBeVisible());
    expect(mockFetch.mock.calls).toEqual([[2], [1]]);
    await waitFor(() => expect(screen.getByText("yalnız")).toBeVisible());
  } finally {
    random.mockRestore();
    unmount();
    client.clear();
  }
});

test("a roll stops when cached responses repeat the same ID at both offsets", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const first = { id: 1, wrong: "şöför", correct: "şoför" };
  const second = { id: 2, wrong: "herkez", correct: "herkes" };
  const third = { id: 3, wrong: "yanlız", correct: "yalnız" };
  client.setQueryData(["hero-entry", 1], { data: [second], total: 4 });
  mockFetch
    .mockResolvedValueOnce({ data: [second], total: 4 })
    .mockResolvedValueOnce({ data: [second], total: 4 })
    .mockResolvedValueOnce({ data: [third], total: 4 });
  const { unmount } = render(
    <QueryClientProvider client={client}>
      <BentoCommonMistake initialData={{ data: [first], total: 4 }} />
    </QueryClientProvider>,
  );
  const dice = screen.getByRole("button", { name: "HomeExtras.random" });
  const random = jest.spyOn(Math, "random").mockReturnValue(0.4);
  try {
    fireEvent.click(screen.getByRole("button", { name: "HomeExtras.next" }));
    await waitFor(() => expect(screen.getByText("2 / 4")).toBeVisible());
    fireEvent.click(dice);
    await waitFor(() => expect(mockFetch.mock.calls).toEqual([[3], [1]]));
    await waitFor(() => expect(dice).toHaveAttribute("aria-disabled", "false"));
    expect(screen.getByText("herkes")).toBeVisible();

    fireEvent.click(dice);
    await waitFor(() => expect(screen.getByText("yalnız")).toBeVisible());
    expect(mockFetch.mock.calls).toEqual([[3], [1], [1]]);
  } finally {
    random.mockRestore();
    unmount();
    client.clear();
  }
});

test("a roll revalidates a cached example from before a known deletion", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const first = { id: 1, wrong: "şöför", correct: "şoför" };
  const deleted = { id: 2, wrong: "herkez", correct: "herkes" };
  const third = { id: 3, wrong: "yanlız", correct: "yalnız" };
  const last = { id: 4, wrong: "yanlışlıklaa", correct: "yanlışlıkla" };
  client.setQueryData(["hero-entry", 1], { data: [deleted], total: 4 }, { updatedAt: Date.now() - 1000 });
  mockFetch
    .mockResolvedValueOnce({ data: [], total: 3 })
    .mockResolvedValueOnce({ data: [first], total: 3 })
    .mockResolvedValueOnce({ data: [last], total: 3 })
    .mockResolvedValueOnce({ data: [third], total: 3 });
  const { unmount } = render(
    <QueryClientProvider client={client}>
      <BentoCommonMistake initialData={{ data: [first], total: 4 }} />
    </QueryClientProvider>,
  );
  const dice = screen.getByRole("button", { name: "HomeExtras.random" });
  const random = jest.spyOn(Math, "random").mockReturnValue(0.9);
  try {
    fireEvent.click(dice);
    await waitFor(() => expect(screen.getByText("3 / 3")).toBeVisible());
    fireEvent.click(dice);
    await waitFor(() => expect(screen.getByText("yalnız")).toBeVisible());
    expect(screen.queryByText("herkes")).not.toBeInTheDocument();
    expect(mockFetch.mock.calls).toEqual([[3], [0], [2], [1]]);
  } finally {
    random.mockRestore();
    unmount();
    client.clear();
  }
});

test("a superseded cached page is revalidated after reconnecting", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const first = { id: 1, wrong: "şöför", correct: "şoför" };
  const deleted = { id: 2, wrong: "herkez", correct: "herkes" };
  const third = { id: 3, wrong: "yanlız", correct: "yalnız" };
  const last = { id: 4, wrong: "yanlışlıklaa", correct: "yanlışlıkla" };
  const initialData = { data: [first], total: 4 };
  client.setQueryData(["hero-entry", 1], { data: [deleted], total: 4 }, { updatedAt: Date.now() - 1000 });
  mockFetch
    .mockResolvedValueOnce({ data: [last], total: 3 })
    .mockResolvedValueOnce({ data: [third], total: 3 });
  const content = () => (
    <QueryClientProvider client={client}>
      <BentoCommonMistake initialData={initialData} />
    </QueryClientProvider>
  );
  const { rerender, unmount } = render(content());
  const dice = screen.getByRole("button", { name: "HomeExtras.random" });
  const random = jest.spyOn(Math, "random").mockReturnValue(0.5);
  try {
    fireEvent.click(dice);
    await waitFor(() => expect(screen.getByText("3 / 3")).toBeVisible());
    mockIsOnline = false;
    rerender(content());
    fireEvent.click(screen.getByRole("button", { name: "HomeExtras.previous" }));
    await waitFor(() => expect(screen.getByText("herkes")).toBeVisible());
    expect(mockFetch.mock.calls).toEqual([[2]]);

    mockIsOnline = true;
    rerender(content());
    await waitFor(() => expect(screen.getByText("yalnız")).toBeVisible());
    expect(screen.getByText("2 / 3")).toBeVisible();
    expect(mockFetch.mock.calls).toEqual([[2], [1]]);
  } finally {
    random.mockRestore();
    unmount();
    client.clear();
  }
});

test.each(["misspellings", "galati"] as const)("%s can cancel a pending roll offline without jumping to a cached non-neighbor", async (kind) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const firstMistake = { data: [{ id: 1, wrong: "şöför", correct: "şoför" }], total: 4 };
  const firstGalati = { data: [{ id: 1, word: "vasat", explanation: "Orta, ortalama.", correctUsage: null }], total: 4 };
  client.setQueryData(["hero-entry", 3], {
    data: [{ id: 4, wrong: "herkez", correct: "herkes", word: "mütevazı" }],
    total: 4,
  });
  mockFetch.mockImplementation(() => new Promise(() => {}));
  const content = () => (
    <QueryClientProvider client={client}>
      {kind === "misspellings" ? <BentoCommonMistake initialData={firstMistake} /> : <BentoGalatiMeshur initialData={firstGalati} />}
    </QueryClientProvider>
  );
  const { rerender, unmount } = render(content());
  const dice = screen.getByRole("button", { name: "HomeExtras.random" });
  const random = jest.spyOn(Math, "random").mockReturnValue(0.5);
  try {
    fireEvent.click(dice);
    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith(2));
    mockIsOnline = false;
    rerender(content());
    expect(screen.getByRole("button", { name: "HomeExtras.next" })).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(screen.getByRole("button", { name: "HomeExtras.previous" }));
    expect(screen.getByText("1 / 4")).toBeVisible();
    expect(screen.getByRole("button", { name: "HomeExtras.previous" })).toHaveAttribute("aria-disabled", "true");
  } finally {
    random.mockRestore();
    unmount();
    client.clear();
  }
});
