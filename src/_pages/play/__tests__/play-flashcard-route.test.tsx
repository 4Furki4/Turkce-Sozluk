import { waitFor } from "@testing-library/react";

jest.mock("@/src/components/play/play-flashcard-game", () => () => null);
jest.mock("@/src/components/progressive-enhancement/no-script-notice", () => ({
    NoScriptNotice: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("@/src/lib/auth", () => ({
    auth: { api: { getSession: jest.fn() } },
}));
jest.mock("@/src/trpc/server", () => ({
    api: {
        game: {
            getRandomWordsForFlashcards: { prefetch: jest.fn() },
            getFlashcardReviewSummary: { prefetch: jest.fn() },
        },
    },
    HydrateClient: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("next/headers", () => ({ headers: jest.fn() }));

const { auth: mockAuth } = jest.requireMock("@/src/lib/auth") as {
    auth: { api: { getSession: jest.Mock } };
};
const { api: mockApi } = jest.requireMock("@/src/trpc/server") as {
    api: {
        game: {
            getRandomWordsForFlashcards: { prefetch: jest.Mock };
            getFlashcardReviewSummary: { prefetch: jest.Mock };
        };
    };
};
const { headers: mockHeaders } = jest.requireMock("next/headers") as { headers: jest.Mock };
const mockGetSession = mockAuth.api.getSession;
const mockPracticePrefetch = mockApi.game.getRandomWordsForFlashcards.prefetch;
const mockReviewSummaryPrefetch = mockApi.game.getFlashcardReviewSummary.prefetch;

import PlayFlashcardRoute from "../play-flashcard-route";

describe("PlayFlashcardRoute", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockHeaders.mockResolvedValue(new Headers());
        mockGetSession.mockResolvedValue({ user: { id: "learner-1" } });
        mockPracticePrefetch.mockResolvedValue(undefined);
    });

    it("settles the signed-in review prefetch before hydrating the client", async () => {
        let settleReviewPrefetch: (() => void) | undefined;
        mockReviewSummaryPrefetch.mockReturnValue(new Promise<void>((resolve) => {
            settleReviewPrefetch = resolve;
        }));

        const route = PlayFlashcardRoute({ params: Promise.resolve({ locale: "tr" }) });
        await waitFor(() => expect(mockReviewSummaryPrefetch).toHaveBeenCalledTimes(1));

        let routeResolved = false;
        void route.then(() => { routeResolved = true; });
        await Promise.resolve();
        expect(routeResolved).toBe(false);

        settleReviewPrefetch?.();
        await expect(route).resolves.toBeDefined();
    });
});
