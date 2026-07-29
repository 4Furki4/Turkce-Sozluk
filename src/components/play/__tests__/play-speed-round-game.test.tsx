import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

jest.mock("@/src/trpc/react", () => ({
    api: {
        game: {
            getWordsForSpeedRound: { useQuery: jest.fn() },
            startSpeedRoundSession: { useMutation: jest.fn() },
            activateGameSession: { useMutation: jest.fn() },
            answerSpeedRoundSession: { useMutation: jest.fn() },
            getLeaderboard: { useQuery: jest.fn() },
        },
        user: {
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
    const stripMotionProps = ({ animate, initial, transition, ...props }: Record<string, unknown>) => props;
    const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & Record<string, unknown>>(
        (props, ref) => React.createElement("button", { ...stripMotionProps(props), ref }),
    );
    const Div = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>>(
        (props, ref) => React.createElement("div", { ...stripMotionProps(props), ref }),
    );

    return {
        motion: { button: Button, div: Div },
        useReducedMotion: () => true,
    };
});

jest.mock("next-intl", () => ({
    useTranslations: (namespace: string) => (key: string, values?: Record<string, string | number>) => (
        `${namespace}.${key}${values ? `:${Object.values(values).join(",")}` : ""}`
    ),
}));

import { api as mockApi } from "@/src/trpc/react";
import PlaySpeedRoundGame from "../play-speed-round-game";

const mockGuestRefetch = jest.fn();
const mockStartMutateAsync = jest.fn();
const mockActivateMutateAsync = jest.fn();
const mockAnswerMutateAsync = jest.fn();
const signedInSession = { user: { id: "learner-1" } } as never;

function preparedRound() {
    return {
        sessionId: "40000000-0000-4000-8000-000000000001",
        error: null,
        question: {
            token: "10000000-0000-4000-8000-000000000001",
            word: "kitap",
            options: [
                { token: "20000000-0000-4000-8000-000000000001", text: "book" },
                { token: "20000000-0000-4000-8000-000000000002", text: "pen" },
            ],
        },
        questionCount: 10,
        score: 0,
        streak: 0,
    };
}

describe("PlaySpeedRoundGame activation timing", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (mockApi.game.getWordsForSpeedRound.useQuery as jest.Mock).mockReturnValue({ refetch: mockGuestRefetch });
        (mockApi.game.startSpeedRoundSession.useMutation as jest.Mock).mockReturnValue({
            mutateAsync: mockStartMutateAsync,
            isPending: false,
        });
        (mockApi.game.activateGameSession.useMutation as jest.Mock).mockReturnValue({
            mutateAsync: mockActivateMutateAsync,
        });
        (mockApi.game.answerSpeedRoundSession.useMutation as jest.Mock).mockReturnValue({
            mutateAsync: mockAnswerMutateAsync,
        });
        (mockApi.game.getLeaderboard.useQuery as jest.Mock).mockReturnValue({
            data: { leaderboard: [] },
            refetch: jest.fn(),
        });
        (mockApi.user.saveWord.useMutation as jest.Mock).mockReturnValue({
            mutate: jest.fn(),
            isPending: false,
        });
    });

    it("renders the prepared first question disabled and starts its timer after activation", async () => {
        jest.useFakeTimers();
        let resolveActivation!: (value: unknown) => void;
        mockStartMutateAsync.mockResolvedValue(preparedRound());
        mockActivateMutateAsync.mockReturnValue(new Promise((resolve) => {
            resolveActivation = resolve;
        }));

        try {
            render(<PlaySpeedRoundGame session={signedInSession} locale="en" />);
            fireEvent.click(screen.getByText("SpeedRoundGame.startGame"));
            const answer = await screen.findByText("book");

            expect(answer).toBeDisabled();
            expect(screen.getByRole("timer")).toHaveTextContent("10s");
            expect(screen.getByText("Play.speedRound.roundReady")).toBeInTheDocument();
            expect(mockAnswerMutateAsync).not.toHaveBeenCalled();
            // This delay models a slow outbound activation request. The server
            // clock did not exist during that portion of the round trip.
            act(() => jest.advanceTimersByTime(5_000));

            await act(async () => {
                resolveActivation({
                    gameType: "speed_round",
                    activatedAt: "2026-07-29T12:00:00.000Z",
                    deadlineAt: "2026-07-29T12:00:10.000Z",
                    serverNow: "2026-07-29T12:00:00.000Z",
                });
                await Promise.resolve();
            });
            expect(answer).toBeEnabled();
            expect(screen.getByRole("timer")).toHaveTextContent("10s");

            act(() => jest.advanceTimersByTime(1_000));
            expect(screen.getByRole("timer")).toHaveTextContent("9s");
        } finally {
            jest.useRealTimers();
        }
    });

    it("ignores a late activation response after the player returns to setup", async () => {
        let resolveActivation!: (value: unknown) => void;
        mockStartMutateAsync.mockResolvedValue(preparedRound());
        mockActivateMutateAsync.mockReturnValue(new Promise((resolve) => {
            resolveActivation = resolve;
        }));

        render(<PlaySpeedRoundGame session={signedInSession} locale="en" />);
        fireEvent.click(screen.getByText("SpeedRoundGame.startGame"));
        await screen.findByText("kitap");
        fireEvent.click(screen.getByRole("button", { name: "SpeedRoundGame.settings" }));

        await act(async () => {
            resolveActivation({
                gameType: "speed_round",
                activatedAt: "2026-07-29T12:00:00.000Z",
                deadlineAt: "2026-07-29T12:00:10.000Z",
                serverNow: "2026-07-29T12:00:00.000Z",
            });
            await Promise.resolve();
        });

        expect(screen.getByText("SpeedRoundGame.startGame")).toBeInTheDocument();
        expect(screen.queryByText("kitap")).not.toBeInTheDocument();
    });

    it("keeps the guest timer stopped while question data is loading", async () => {
        jest.useFakeTimers();
        let resolveGuest!: (value: unknown) => void;
        mockGuestRefetch.mockReturnValue(new Promise((resolve) => {
            resolveGuest = resolve;
        }));

        try {
            render(<PlaySpeedRoundGame session={null} locale="en" />);
            fireEvent.click(screen.getByText("SpeedRoundGame.startGame"));
            act(() => jest.advanceTimersByTime(5_000));
            expect(screen.getByText("SpeedRoundGame.loading")).toBeInTheDocument();

            await act(async () => {
                resolveGuest({
                    data: {
                        questions: [{
                            id: 1,
                            word: "kitap",
                            correctMeaning: "book",
                            options: ["book", "pen"],
                        }],
                        error: null,
                    },
                });
                await Promise.resolve();
            });
            await waitFor(() => expect(screen.getByRole("timer")).toHaveTextContent("10s"));

            act(() => jest.advanceTimersByTime(1_000));
            expect(screen.getByRole("timer")).toHaveTextContent("9s");
            expect(mockActivateMutateAsync).not.toHaveBeenCalled();
        } finally {
            jest.useRealTimers();
        }
    });
});
