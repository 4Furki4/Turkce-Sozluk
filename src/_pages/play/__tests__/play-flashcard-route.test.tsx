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
        user: { getSavedWordCollections: { prefetch: jest.fn() } },
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
        user: { getSavedWordCollections: { prefetch: jest.Mock } };
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
        mockReviewSummaryPrefetch.mockResolvedValue(undefined);
        mockApi.user.getSavedWordCollections.prefetch.mockResolvedValue(undefined);
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

    it("prefetches the same saved collection scope passed to the client", async () => {
        const collectionId = "50000000-0000-4000-8000-000000000001";
        const route = await PlayFlashcardRoute({
            params: Promise.resolve({ locale: "en" }),
            searchParams: Promise.resolve({ source: "saved", collectionId }),
        });
        expect(mockPracticePrefetch).toHaveBeenCalledWith({ count: 10, source: "saved", collectionId });
        expect(mockReviewSummaryPrefetch).toHaveBeenCalledWith({ source: "saved", collectionId });
        expect(mockApi.user.getSavedWordCollections.prefetch).toHaveBeenCalledTimes(1);
        const game = route.props.children[1];
        expect(game.props).toMatchObject({ initialSource: "saved", initialCollectionId: collectionId, initialCollectionInvalid: false });
    });

    it("never prefetches a broader deck for an invalid collection link", async () => {
        const route = await PlayFlashcardRoute({
            params: Promise.resolve({ locale: "tr" }),
            searchParams: Promise.resolve({ collectionId: "invalid" }),
        });
        expect(mockPracticePrefetch).not.toHaveBeenCalled();
        expect(mockReviewSummaryPrefetch).not.toHaveBeenCalled();
        expect(route.props.children[1].props).toMatchObject({ initialSource: "saved", initialCollectionInvalid: true });
    });

    it("does not prefetch private saved decks for guests", async () => {
        mockGetSession.mockResolvedValue(null);
        await PlayFlashcardRoute({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({ source: "saved" }) });
        expect(mockPracticePrefetch).not.toHaveBeenCalled();
        expect(mockReviewSummaryPrefetch).not.toHaveBeenCalled();
    });
});
