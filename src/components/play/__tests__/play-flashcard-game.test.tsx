import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

jest.mock("@/src/trpc/react", () => ({
    api: {
        useUtils: jest.fn(),
        game: {
            getRandomWordsForFlashcards: { useQuery: jest.fn() },
            getFlashcardReviewSummary: { useQuery: jest.fn() },
            getDueFlashcardReviews: { useQuery: jest.fn() },
            rateFlashcardReview: { useMutation: jest.fn() },
        },
        user: { getSavedWordCollections: { useQuery: jest.fn() } },
    },
}));

const { api: mockApi } = jest.requireMock("@/src/trpc/react") as {
    api: {
        useUtils: jest.Mock;
        game: {
            getRandomWordsForFlashcards: { useQuery: jest.Mock };
            getFlashcardReviewSummary: { useQuery: jest.Mock };
            getDueFlashcardReviews: { useQuery: jest.Mock };
            rateFlashcardReview: { useMutation: jest.Mock };
        };
        user: { getSavedWordCollections: { useQuery: jest.Mock } };
    };
};
const mockPracticeRefetch = jest.fn();
const mockDueRefetch = jest.fn();
const mockSummaryRefetch = jest.fn();
const mockRateMutateAsync = jest.fn();
const mockInvalidateSummary = jest.fn();
const mockInvalidateDue = jest.fn();
const mockPracticeQuery = mockApi.game.getRandomWordsForFlashcards.useQuery;
const mockSummaryQuery = mockApi.game.getFlashcardReviewSummary.useQuery;
const mockDueQuery = mockApi.game.getDueFlashcardReviews.useQuery;
const mockRateMutation = mockApi.game.rateFlashcardReview.useMutation;

jest.mock("framer-motion", () => {
    const React = require("react") as typeof import("react");
    const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & Record<string, unknown>>(
        ({ children, animate, exit, initial, transition, whileTap, ...props }, ref) => React.createElement("button", { ...props, ref }, children),
    );
    const Div = ({ children, animate, exit, initial, transition, ...props }: { children: ReactNode } & Record<string, unknown>) => React.createElement("div", props, children);

    return {
        AnimatePresence: ({ children }: { children: ReactNode }) => React.createElement(React.Fragment, null, children),
        motion: { button: Button, div: Div },
        useReducedMotion: () => true,
    };
});

jest.mock("next-intl", () => ({
    useTranslations: (namespace: string) => (key: string, values?: Record<string, string | number>) => (
        `${namespace}.${key}${values ? `:${Object.values(values).join(",")}` : ""}`
    ),
}));

jest.mock("@/src/i18n/routing", () => ({
    Link: ({ children, href, locale, ...props }: { children: ReactNode; href: { pathname: string; query?: Record<string, string> }; locale: string }) => (
        <a href={`${href.pathname}${href.query ? `?${new URLSearchParams(href.query)}` : ""}`} {...props}>{children}</a>
    ),
}));

import PlayFlashcardGame from "../play-flashcard-game";

const signedInSession = { user: { id: "learner-1" } } as never;

function makeDueCard(direction: "word" | "meaning" = "word") {
    return {
        id: 1,
        meaningId: 11,
        name: "kitap",
        phonetic: null,
        meaning: "okumak için ciltlenmiş yapraklardan oluşan nesne",
        partOfSpeech: "isim",
        direction,
        dueAt: new Date("2026-07-21T12:00:00.000Z"),
    };
}

describe("PlayFlashcardGame learning loop", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        let actionNumber = 0;
        Object.defineProperty(globalThis, "crypto", {
            configurable: true,
            value: { randomUUID: () => `rating-action-${++actionNumber}` },
        });
        mockApi.useUtils.mockReturnValue({
            game: {
                getFlashcardReviewSummary: { invalidate: mockInvalidateSummary },
                getDueFlashcardReviews: { invalidate: mockInvalidateDue },
            },
        });
        mockPracticeQuery.mockReturnValue({ refetch: mockPracticeRefetch });
        mockSummaryQuery.mockReturnValue({
            data: { totalCount: 0, dueCount: 0, nextDueAt: null },
            isLoading: false,
            isError: false,
            refetch: mockSummaryRefetch,
        });
        mockDueQuery.mockReturnValue({ refetch: mockDueRefetch });
        mockApi.user.getSavedWordCollections.useQuery.mockReturnValue({ data: [], isLoading: false, isError: false });
        mockRateMutation.mockReturnValue({ mutateAsync: mockRateMutateAsync });
        mockRateMutateAsync.mockResolvedValue({
            meaningId: 11,
            direction: "word",
            rating: "good",
            dueAt: "2026-07-24T12:00:00.000Z",
            repetitions: 1,
            lapses: 0,
            easeFactor: 250,
            intervalDays: 3,
        });
    });

    it("keeps guests in visibly untracked practice without querying review state", () => {
        render(<PlayFlashcardGame session={null} locale="en" />);

        expect(screen.getByText("Play.flashcards.untrackedPractice")).toBeInTheDocument();
        expect(screen.queryByText(/Play\.flashcards\.reviewDue/)).not.toBeInTheDocument();
        expect(mockSummaryQuery).toHaveBeenCalledWith(undefined, expect.objectContaining({ enabled: false }));
    });

    it("opens saved-word practice with a scoped review queue", () => {
        render(<PlayFlashcardGame session={signedInSession} locale="en" initialSource="saved" />);
        expect(mockPracticeQuery).toHaveBeenCalledWith({ count: 10, source: "saved", collectionId: undefined }, expect.anything());
        expect(mockSummaryQuery).toHaveBeenCalledWith({ source: "saved", collectionId: undefined }, expect.objectContaining({ enabled: true }));
        expect(mockDueQuery).toHaveBeenCalledWith({ limit: 10, source: "saved", collectionId: undefined }, expect.anything());
        expect(screen.getByRole("link", { name: /backToSavedWords/ })).toHaveAttribute("href", "/saved-words");
    });

    it("keeps collection practice and due cards scoped until an explicit source change", () => {
        const collectionId = "50000000-0000-4000-8000-000000000001";
        mockApi.user.getSavedWordCollections.useQuery.mockReturnValue({ data: [{ id: collectionId, name: "Reading", wordCount: 2 }], isLoading: false, isError: false });
        render(<PlayFlashcardGame session={signedInSession} locale="en" initialSource="saved" initialCollectionId={collectionId} />);
        expect(screen.getByText("Play.flashcards.collectionScope:Reading")).toBeInTheDocument();
        expect(mockPracticeQuery).toHaveBeenCalledWith({ count: 10, source: "saved", collectionId }, expect.anything());
        expect(mockSummaryQuery).toHaveBeenCalledWith({ source: "saved", collectionId }, expect.objectContaining({ enabled: true }));
        expect(mockDueQuery).toHaveBeenCalledWith({ limit: 10, source: "saved", collectionId }, expect.anything());
        expect(screen.getByRole("link", { name: /backToSavedWords/ })).toHaveAttribute("href", `/saved-words?collectionId=${collectionId}`);
        fireEvent.click(screen.getByText("Play.flashcards.clearCollection"));
        expect(mockPracticeQuery).toHaveBeenLastCalledWith({ count: 10, source: "saved", collectionId: undefined }, expect.anything());
        expect(screen.queryByText("Play.flashcards.collectionScope:Reading")).not.toBeInTheDocument();
    });

    it("blocks missing or malformed collections instead of practicing all saved words", () => {
        const { rerender } = render(<PlayFlashcardGame session={signedInSession} locale="en" initialCollectionInvalid />);
        expect(screen.getByRole("alert")).toHaveTextContent("Play.flashcards.collectionUnavailable");
        expect(screen.getByRole("button", { name: /FlashcardGame.startGame/ })).toBeDisabled();
        expect(mockSummaryQuery).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ enabled: false }));
        rerender(<PlayFlashcardGame key="missing" session={signedInSession} locale="en" initialCollectionId="50000000-0000-4000-8000-000000000001" />);
        expect(screen.getByRole("button", { name: /FlashcardGame.startGame/ })).toBeDisabled();
        fireEvent.click(screen.getByRole("button", { name: /FlashcardGame.startGame/ }));
        expect(mockPracticeRefetch).not.toHaveBeenCalled();
    });

    it("does not reopen stale practice data after a deleted collection or network failure", async () => {
        const collectionId = "50000000-0000-4000-8000-000000000001";
        mockApi.user.getSavedWordCollections.useQuery.mockReturnValue({ data: [{ id: collectionId, name: "Reading", wordCount: 1 }], isLoading: false, isError: false });
        mockPracticeRefetch.mockResolvedValue({ data: { words: [makeDueCard()], error: null }, error: { data: { code: "NOT_FOUND" } } });
        render(<PlayFlashcardGame session={signedInSession} locale="en" initialCollectionId={collectionId} />);
        fireEvent.click(screen.getByRole("button", { name: /FlashcardGame.startGame/ }));
        expect(await screen.findByText("Play.flashcards.collectionUnavailable")).toBeInTheDocument();
        expect(screen.queryByText("kitap")).not.toBeInTheDocument();
    });

    it("retries a failed collection load without broadening the deck", () => {
        const collectionId = "50000000-0000-4000-8000-000000000001";
        const refetch = jest.fn();
        mockApi.user.getSavedWordCollections.useQuery.mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch });
        render(<PlayFlashcardGame session={signedInSession} locale="en" initialCollectionId={collectionId} />);
        expect(screen.getByRole("button", { name: /FlashcardGame.startGame/ })).toBeDisabled();
        fireEvent.click(screen.getByText("Play.flashcards.retryCollection"));
        expect(refetch).toHaveBeenCalledTimes(1);
        expect(mockPracticeQuery).toHaveBeenLastCalledWith({ count: 10, source: "saved", collectionId }, expect.anything());
    });

    it("retains a return link after practice and blocks it while a rating outcome is unresolved", async () => {
        mockPracticeRefetch.mockResolvedValue({ data: { words: [makeDueCard()], error: null } });
        mockRateMutateAsync.mockRejectedValue(new Error("transport lost"));
        render(<PlayFlashcardGame session={signedInSession} locale="en" initialSource="saved" />);
        fireEvent.click(screen.getByRole("button", { name: /FlashcardGame.startGame/ }));
        await screen.findByText("kitap");
        expect(screen.getByRole("link", { name: /backToSavedWords/ })).toHaveAttribute("aria-disabled", "false");
        fireEvent.click(screen.getAllByRole("button", { name: "FlashcardGame.flip" })[0]!);
        fireEvent.click(screen.getByText("Play.flashcards.ratingGood"));
        await screen.findByText("Play.flashcards.ratingError");
        const backLink = screen.getByRole("link", { name: /backToSavedWords/ });
        expect(backLink).toHaveAttribute("aria-disabled", "true");
        expect(fireEvent.click(backLink)).toBe(false);
        mockRateMutateAsync.mockResolvedValue({ dueAt: "2026-10-22T12:00:00.000Z" });
        fireEvent.click(screen.getByText("Play.flashcards.retryRating"));
        await screen.findByText("Play.flashcards.roundCompleteTitle");
        expect(screen.getByRole("link", { name: /backToSavedWords/ })).toHaveAttribute("aria-disabled", "false");
    });

    it("opens due cards with their stored direction and sends only card identity, rating, and action ID", async () => {
        mockSummaryQuery.mockReturnValue({
            data: { totalCount: 1, dueCount: 1, nextDueAt: null },
            isLoading: false,
            isError: false,
            refetch: mockSummaryRefetch,
        });
        mockDueRefetch.mockResolvedValue({ data: { cards: [makeDueCard("meaning")], totalDueCount: 1 } });

        render(<PlayFlashcardGame session={signedInSession} locale="en" />);
        fireEvent.click(screen.getByText("Play.flashcards.reviewDue:1"));

        await screen.findByText("okumak için ciltlenmiş yapraklardan oluşan nesne");
        fireEvent.click(screen.getAllByRole("button", { name: "FlashcardGame.flip" })[0]!);
        fireEvent.click(screen.getByText("Play.flashcards.ratingGood"));

        await waitFor(() => {
            expect(mockRateMutateAsync).toHaveBeenCalledWith(expect.objectContaining({
                meaningId: 11,
                direction: "meaning",
                rating: "good",
                actionId: "rating-action-1",
            }));
        });
        expect(mockInvalidateSummary).toHaveBeenCalled();
        expect(mockInvalidateDue).toHaveBeenCalled();
    });

    it("retries a failed rating with the same immutable action ID", async () => {
        mockSummaryQuery.mockReturnValue({
            data: { totalCount: 1, dueCount: 1, nextDueAt: null },
            isLoading: false,
            isError: false,
            refetch: mockSummaryRefetch,
        });
        mockDueRefetch.mockResolvedValue({ data: { cards: [makeDueCard()], totalDueCount: 1 } });
        mockRateMutateAsync
            .mockRejectedValueOnce(new Error("transport lost"))
            .mockRejectedValueOnce(new Error("transport still lost"))
            .mockResolvedValueOnce({
                meaningId: 11,
                direction: "word",
                rating: "again",
                dueAt: "2026-07-21T12:10:00.000Z",
                repetitions: 0,
                lapses: 1,
                easeFactor: 230,
                intervalDays: 0,
            });

        render(<PlayFlashcardGame session={signedInSession} locale="en" />);
        fireEvent.click(screen.getByText("Play.flashcards.reviewDue:1"));
        await screen.findByText("kitap");
        fireEvent.click(screen.getAllByRole("button", { name: "FlashcardGame.flip" })[0]!);
        fireEvent.click(screen.getByText("Play.flashcards.ratingAgain"));

        await screen.findByText("Play.flashcards.ratingError");
        const card = screen.getAllByRole("button", { name: "FlashcardGame.flip" })[0]!;
        expect(card).toBeDisabled();
        fireEvent.click(card);
        expect(screen.getByText("Play.flashcards.ratingError")).toBeInTheDocument();
        fireEvent.click(screen.getByText("Play.flashcards.retryRating"));

        await waitFor(() => expect(mockRateMutateAsync).toHaveBeenCalledTimes(3));
        expect(mockRateMutateAsync.mock.calls[0]?.[0]?.actionId).toBe("rating-action-1");
        expect(mockRateMutateAsync.mock.calls[1]?.[0]?.actionId).toBe("rating-action-1");
        expect(mockRateMutateAsync.mock.calls[2]?.[0]?.actionId).toBe("rating-action-1");
    });

    it("shows a queue-load error instead of reopening stale due cards", async () => {
        mockSummaryQuery.mockReturnValue({
            data: { totalCount: 1, dueCount: 1, nextDueAt: null },
            isLoading: false,
            isError: false,
            refetch: mockSummaryRefetch,
        });
        mockDueRefetch.mockResolvedValue({
            data: { cards: [makeDueCard()], totalDueCount: 1 },
            error: new Error("network unavailable"),
        });

        render(<PlayFlashcardGame session={signedInSession} locale="en" />);
        fireEvent.click(screen.getByText("Play.flashcards.reviewDue:1"));

        expect(await screen.findByText("Play.flashcards.reviewLoadError")).toBeInTheDocument();
        expect(screen.queryByText("kitap")).not.toBeInTheDocument();
    });

    it("allows arrow navigation when the focused flashcard is the event target", async () => {
        mockPracticeRefetch.mockResolvedValue({
            data: {
                words: [
                    makeDueCard(),
                    { ...makeDueCard(), id: 2, meaningId: 12, name: "kalem", meaning: "yazı yazmaya yarayan araç" },
                    { ...makeDueCard(), id: 3, meaningId: 13, name: "defter", meaning: "not almak için kullanılan yapraklar" },
                ],
                error: null,
            },
        });

        render(<PlayFlashcardGame session={null} locale="en" />);
        fireEvent.click(screen.getByText("FlashcardGame.startGame"));
        await screen.findByText("kitap");

        const card = screen.getAllByRole("button", { name: "FlashcardGame.flip" })[0]!;
        card.focus();
        fireEvent.keyDown(window, { code: "ArrowRight" });
        fireEvent.keyDown(window, { code: "ArrowRight" });

        expect(await screen.findByText("kalem")).toBeInTheDocument();
        expect(screen.queryByText("defter")).not.toBeInTheDocument();
    });
});
