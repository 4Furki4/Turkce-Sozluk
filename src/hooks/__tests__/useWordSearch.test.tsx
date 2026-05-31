import { QueryClient, QueryClientProvider, onlineManager } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

import type { WordData } from "@/src/lib/db-config";
import { useWordSearch } from "@/src/hooks/useWordSearch";
import {
  getOfflineMetadata,
  getWordByNameOffline,
  searchByPattern,
} from "@/src/lib/offline-db";

const mockGetWordQuery = jest.fn();

jest.mock("@/src/trpc/react", () => ({
  api: {
    useUtils: () => ({
      client: {
        word: {
          getWord: {
            query: mockGetWordQuery,
          },
        },
      },
    }),
  },
}));

jest.mock("@/src/lib/offline-db", () => ({
  getOfflineMetadata: jest.fn(),
  getWordByNameOffline: jest.fn(),
  searchByPattern: jest.fn(),
}));

const makeWord = (word_id: number, word_name: string): WordData => ({
  word_id,
  word_name,
  phonetic: "",
  prefix: "",
  suffix: "",
  view_count: 0,
  attributes: [],
  root: {
    root: "",
    language_en: "",
    language_tr: "",
    language_code: "",
  },
  meanings: [
    {
      meaning_id: word_id,
      meaning: `${word_name} meaning`,
      imageUrl: null,
      part_of_speech: "isim",
      sentence: undefined,
      author: undefined,
      author_id: undefined,
      attributes: [],
    },
  ],
  relatedWords: [],
  relatedPhrases: [],
});

const setNavigatorOnline = (online: boolean) => {
  Object.defineProperty(window.navigator, "onLine", {
    configurable: true,
    get: () => online,
  });
  onlineManager.setOnline(online);
};

const wrapper = ({ children }: { children: ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("useWordSearch offline behavior", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setNavigatorOnline(false);
    (searchByPattern as jest.Mock).mockResolvedValue([]);
  });

  it("does not call tRPC while offline with no downloaded dataset", async () => {
    (getOfflineMetadata as jest.Mock).mockResolvedValue({
      activeVersion: null,
      status: "not-downloaded",
    });

    const { result } = renderHook(() => useWordSearch("susuz"), { wrapper });

    await waitFor(() => {
      expect(result.current.offlineStatus).toBe("not-downloaded");
    });

    expect(result.current.hasOfflineDataset).toBe(false);
    expect(result.current.isError).toBe(true);
    expect(mockGetWordQuery).not.toHaveBeenCalled();
    expect(getWordByNameOffline).not.toHaveBeenCalled();
  });

  it("uses IndexedDB results while offline without tRPC", async () => {
    const word = makeWord(1, "susuz");
    (getOfflineMetadata as jest.Mock).mockResolvedValue({
      activeVersion: 1,
      status: "ready",
    });
    (getWordByNameOffline as jest.Mock).mockResolvedValue(word);

    const { result } = renderHook(() => useWordSearch("susuz"), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toMatchObject({
        word_name: "susuz",
        source: "offline",
      });
    });

    expect(result.current.hasOfflineDataset).toBe(true);
    expect(mockGetWordQuery).not.toHaveBeenCalled();
  });

  it("uses tRPC online only after the local dataset misses", async () => {
    setNavigatorOnline(true);
    const word = makeWord(2, "susuz");
    (getOfflineMetadata as jest.Mock).mockResolvedValue({
      activeVersion: null,
      status: "not-downloaded",
    });
    mockGetWordQuery.mockResolvedValue([{ word_data: word }]);

    const { result } = renderHook(() => useWordSearch("susuz"), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toMatchObject({
        word_name: "susuz",
        source: "online",
      });
    });

    expect(mockGetWordQuery).toHaveBeenCalledWith({ name: "susuz" });
  });
});
