import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BentoCommonMistake, BentoGalatiMeshur } from "../hero-client-extras";

const mockFetch = jest.fn();

jest.mock("@/src/hooks/use-online-status", () => ({ useOnlineStatus: () => true }));
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
  const { useQuery } = jest.requireActual("@tanstack/react-query");
  const useHeroQuery = (input: { offset: number }, options: object) => useQuery({
    queryKey: ["hero-entry", input.offset],
    queryFn: () => mockFetch(input.offset),
    ...options,
  });
  return { api: { extras: { getMisspellings: { useQuery: useHeroQuery }, getGalatiMeshur: { useQuery: useHeroQuery } } } };
});

beforeEach(() => {
  mockFetch.mockReset();
  window.matchMedia = jest.fn().mockReturnValue({
    matches: false, addListener: jest.fn(), removeListener: jest.fn(),
    addEventListener: jest.fn(), removeEventListener: jest.fn(),
  });
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
