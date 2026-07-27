import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

jest.mock("@/src/trpc/react", () => ({
    api: {
        useUtils: jest.fn(),
        game: {
            getWordsForMatching: { useQuery: jest.fn() },
            startWordMatchingSession: { useMutation: jest.fn() },
            attemptWordMatchingSession: { useMutation: jest.fn() },
        },
        user: {
            getWordSaveStatus: { useQuery: jest.fn() },
            saveWord: { useMutation: jest.fn() },
        },
    },
}));

jest.mock("@/src/i18n/routing", () => ({
    Link: ({ children, href, ...props }: { children: ReactNode; href: unknown }) => (
        <a href={typeof href === "string" ? href : "#word"} {...props}>{children}</a>
    ),
}));

jest.mock("framer-motion", () => {
    const React = require("react") as typeof import("react");
    const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & Record<string, unknown>>(
        ({ children, animate, initial, transition, ...props }, ref) => React.createElement("button", { ...props, ref }, children),
    );

    return {
        motion: { button: Button },
        useReducedMotion: () => true,
    };
});

jest.mock("next-intl", () => ({
    useTranslations: (namespace: string) => (key: string, values?: Record<string, string | number>) => (
        `${namespace}.${key}${values ? `:${Object.values(values).join(",")}` : ""}`
    ),
}));

import { api as mockApi } from "@/src/trpc/react";
import PlayWordMatchingGame from "../play-word-matching-game";

const mockGuestRefetch = jest.fn();
const mockStartMutateAsync = jest.fn();
const mockAttemptMutateAsync = jest.fn();
const mockSaveMutate = jest.fn();
const mockSaveStatusCancel = jest.fn();
const mockSaveStatusGetData = jest.fn();
const mockSaveStatusSetData = jest.fn();
const mockSaveStatusInvalidate = jest.fn();

const signedInSession = { user: { id: "learner-1" } } as never;

function ratedRound(word = "kitap", meaning = "book") {
    return {
        sessionId: `session-${word}`,
        error: null,
        board: {
            words: [{ token: "10000000-0000-4000-8000-000000000001", word }],
            meanings: [{ token: "20000000-0000-4000-8000-000000000001", meaning }],
        },
        deadlineAt: null,
        serverNow: "2026-07-27T12:00:00.000Z",
        score: 0,
        mistakes: 0,
    };
}

function terminalOutcome(word = "kitap", meaning = "book") {
    return {
        expired: false,
        completed: true,
        isCorrect: true,
        score: 100,
        mistakes: 0,
        matchedWordTokens: ["10000000-0000-4000-8000-000000000001"],
        matchedMeaningTokens: ["20000000-0000-4000-8000-000000000001"],
        timeTakenSeconds: 2,
        finalResult: null,
        rank: null,
        review: [{ wordId: 1, word, meaning, matched: true, mistakeCount: 0 }],
    };
}

describe("PlayWordMatchingGame result review", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        let actionNumber = 0;
        Object.defineProperty(globalThis, "crypto", {
            configurable: true,
            value: { randomUUID: () => `30000000-0000-4000-8000-${String(++actionNumber).padStart(12, "0")}` },
        });
        (mockApi.game.getWordsForMatching.useQuery as jest.Mock).mockReturnValue({ refetch: mockGuestRefetch });
        (mockApi.game.startWordMatchingSession.useMutation as jest.Mock).mockReturnValue({
            mutateAsync: mockStartMutateAsync,
            isPending: false,
        });
        (mockApi.game.attemptWordMatchingSession.useMutation as jest.Mock).mockReturnValue({
            mutateAsync: mockAttemptMutateAsync,
        });
        (mockApi.useUtils as jest.Mock).mockReturnValue({
            user: {
                getWordSaveStatus: {
                    cancel: mockSaveStatusCancel,
                    getData: mockSaveStatusGetData,
                    setData: mockSaveStatusSetData,
                    invalidate: mockSaveStatusInvalidate,
                },
            },
        });
        (mockApi.user.getWordSaveStatus.useQuery as jest.Mock).mockReturnValue({
            data: false,
            isLoading: false,
            isError: false,
        });
        (mockApi.user.saveWord.useMutation as jest.Mock).mockReturnValue({
            mutate: mockSaveMutate,
            isPending: false,
        });
    });

    it("retries the final rated action with one action ID and renders the authoritative review", async () => {
        mockStartMutateAsync.mockResolvedValue(ratedRound());
        mockAttemptMutateAsync
            .mockRejectedValueOnce(new Error("transport lost"))
            .mockResolvedValueOnce(terminalOutcome());

        render(<PlayWordMatchingGame session={signedInSession} locale="en" />);
        fireEvent.click(screen.getByText("WordMatchingGame.startGame"));
        fireEvent.click(await screen.findByText("kitap"));
        fireEvent.click(screen.getByText("book"));

        expect(await screen.findByText("Play.wordMatching.review")).toBeInTheDocument();
        expect(screen.getByText("Play.wordMatching.correctPair")).toBeInTheDocument();
        expect(mockAttemptMutateAsync).toHaveBeenCalledTimes(2);
        expect(mockAttemptMutateAsync.mock.calls[0]?.[0]?.actionId)
            .toBe(mockAttemptMutateAsync.mock.calls[1]?.[0]?.actionId);
    });

    it("prevents duplicate save requests while an optimistic save is pending", async () => {
        mockStartMutateAsync.mockResolvedValue(ratedRound());
        mockAttemptMutateAsync.mockResolvedValue(terminalOutcome());

        render(<PlayWordMatchingGame session={signedInSession} locale="en" />);
        fireEvent.click(screen.getByText("WordMatchingGame.startGame"));
        fireEvent.click(await screen.findByText("kitap"));
        fireEvent.click(screen.getByText("book"));

        const saveButton = await screen.findByRole("button", { name: "Play.wordMatching.save" });
        fireEvent.click(saveButton);
        fireEvent.click(saveButton);

        expect(mockSaveMutate).toHaveBeenCalledTimes(1);
        expect(mockSaveMutate).toHaveBeenCalledWith({ wordId: 1 });
        expect(saveButton).toBeDisabled();
    });

    it("uses the authoritative saved state for review words before toggling", async () => {
        (mockApi.user.getWordSaveStatus.useQuery as jest.Mock).mockReturnValue({
            data: true,
            isLoading: false,
            isError: false,
        });
        mockStartMutateAsync.mockResolvedValue(ratedRound());
        mockAttemptMutateAsync.mockResolvedValue(terminalOutcome());

        render(<PlayWordMatchingGame session={signedInSession} locale="en" />);
        fireEvent.click(screen.getByText("WordMatchingGame.startGame"));
        fireEvent.click(await screen.findByText("kitap"));
        fireEvent.click(screen.getByText("book"));

        expect(await screen.findByRole("button", { name: "Play.wordMatching.saved" })).toBeInTheDocument();
        expect(mockApi.user.getWordSaveStatus.useQuery).toHaveBeenCalledWith(1, { enabled: true });
    });

    it("builds a guest mistake review locally and keeps save actions non-mutating", async () => {
        mockGuestRefetch.mockResolvedValue({
            data: {
                pairs: [
                    { id: 1, word: "kitap", meaning: "book" },
                    { id: 2, word: "kalem", meaning: "writing tool" },
                ],
                error: null,
            },
        });

        render(<PlayWordMatchingGame session={null} locale="en" />);
        fireEvent.click(screen.getByText("WordMatchingGame.startGame"));
        fireEvent.click(await screen.findByText("kitap"));
        fireEvent.click(screen.getByText("writing tool"));
        fireEvent.click(screen.getByText("kitap"));
        fireEvent.click(screen.getByText("book"));
        fireEvent.click(screen.getByText("kalem"));
        fireEvent.click(screen.getByText("writing tool"));

        expect(await screen.findByText("Play.wordMatching.review")).toBeInTheDocument();
        expect(screen.getAllByText("Play.wordMatching.mistakeCount:1")).toHaveLength(2);
        const signInButtons = screen.getAllByRole("button", { name: "Play.wordMatching.signInToSave" });
        expect(signInButtons).toHaveLength(2);
        expect(signInButtons.every((button) => button.hasAttribute("disabled"))).toBe(true);
        expect(mockSaveMutate).not.toHaveBeenCalled();
        expect(screen.getByText("Play.wordMatching.unrankedPractice")).toBeInTheDocument();
    });

    it("keeps a final guest mistake in the timeout review", async () => {
        jest.useFakeTimers();
        try {
            mockGuestRefetch.mockResolvedValue({
                data: {
                    pairs: [
                        { id: 1, word: "kitap", meaning: "book" },
                        { id: 2, word: "kalem", meaning: "writing tool" },
                    ],
                    error: null,
                },
            });

            render(<PlayWordMatchingGame session={null} locale="en" />);
            fireEvent.click(screen.getByText("WordMatchingGame.timedMode"));
            fireEvent.click(screen.getByText("WordMatchingGame.startGame"));
            await act(async () => {
                await Promise.resolve();
            });
            fireEvent.click(screen.getByText("kitap"));
            fireEvent.click(screen.getByText("writing tool"));
            act(() => {
                jest.advanceTimersByTime(60_000);
            });

            expect(screen.getByText("Play.wordMatching.review")).toBeInTheDocument();
            expect(screen.getAllByText("Play.wordMatching.mistakeCount:1")).toHaveLength(2);
            expect(screen.getByText("Play.wordMatching.unrankedPractice")).toBeInTheDocument();
        } finally {
            jest.useRealTimers();
        }
    });

    it("clears the prior review before a consecutive rated round appears", async () => {
        mockStartMutateAsync
            .mockResolvedValueOnce(ratedRound())
            .mockResolvedValueOnce(ratedRound("kalem", "pen"));
        mockAttemptMutateAsync.mockResolvedValue(terminalOutcome());

        render(<PlayWordMatchingGame session={signedInSession} locale="en" />);
        fireEvent.click(screen.getByText("WordMatchingGame.startGame"));
        fireEvent.click(await screen.findByText("kitap"));
        fireEvent.click(screen.getByText("book"));
        await screen.findByText("Play.wordMatching.review");

        fireEvent.click(screen.getByText("WordMatchingGame.playAgain"));

        expect(await screen.findByText("kalem")).toBeInTheDocument();
        await waitFor(() => expect(screen.queryByText("Play.wordMatching.review")).not.toBeInTheDocument());
        expect(screen.queryByText("book")).not.toBeInTheDocument();
    });
});
