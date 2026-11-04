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
  Button: ({ children, isDisabled, onPress, "aria-label": label }: {
    children: React.ReactNode; isDisabled: boolean; onPress: () => void; "aria-label": string;
  }) => <button disabled={isDisabled} onClick={onPress} aria-label={label}>{children}</button>,
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
  expect(next).toBeDisabled();
  expect(previous).toBeEnabled();
  fireEvent.click(next);
  expect(screen.getByText("2 / 3")).toBeVisible();
  fireEvent.click(previous);
  await waitFor(() => expect(screen.getByText(firstWord)).toBeVisible());
  expect(screen.getByText("1 / 3")).toBeVisible();
  expect(next).toBeEnabled();
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
  expect(previous).toBeEnabled();
  fireEvent.click(previous);
  expect(screen.getByText("1 / 2")).toBeVisible();
  expect(screen.getByText(kind === "misspellings" ? "şoför" : "vasat")).toBeVisible();
  expect(previous).toBeDisabled();
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
  expect(previous).toBeDisabled();
  expect(screen.getByText("1 / 2")).toBeVisible();
  fireEvent.click(next);
  await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
  expect(screen.getByText(firstWord)).toBeVisible();
  expect(screen.getByText("1 / 2")).toBeVisible();
  expect(previous).toBeDisabled();
  expect(next).toBeDisabled();
  fireEvent.click(next);
  expect(mockFetch).toHaveBeenCalledTimes(1);

  await act(async () => { finishRequest(kind === "misspellings" ? secondMistake : secondGalati); });
  await waitFor(() => expect(screen.getByText(secondWord)).toBeVisible());
  expect(screen.getByText("2 / 2")).toBeVisible();
  expect(screen.getByRole("button", { name: "HomeExtras.previous" })).toBe(previous);
  expect(previous).toBeEnabled();
  expect(next).toBeDisabled();
  await waitFor(() => expect(screen.queryByText(firstWord)).not.toBeInTheDocument());

  fireEvent.click(previous);
  await waitFor(() => expect(screen.getByText(firstWord)).toBeVisible());
  expect(screen.getByText("1 / 2")).toBeVisible();
  expect(previous).toBeDisabled();
  expect(next).toBeEnabled();
  expect(mockFetch).toHaveBeenCalledTimes(1);
  if (kind === "galati") {
    expect(screen.getByRole("link", { name: "HomeExtras.readMore" })).toHaveAttribute("href", "/galati-meshur/1");
  }
  unmount();
  client.clear();
});
