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
