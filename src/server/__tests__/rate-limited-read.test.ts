/** @jest-environment node */
import { readWithRateLimit } from "../rate-limited-read";
import { isRateLimitError } from "@/src/lib/rate-limit-error";
import { TRPCError } from "@trpc/server";
import { RateLimitError } from "../api/rate-limit-error";

test("server throttle is renderable state rather than a fatal page exception", async () => {
    const error = new RateLimitError(Date.now() + 5_000);
    await expect(readWithRateLimit(() => Promise.reject(error))).resolves.toEqual({ data: undefined, rateLimited: true, retryAt: error.retryAt });
});

test.each([0, [], null])("successful empty reads remain distinguishable from throttling: %p", async (data) => {
    await expect(readWithRateLimit(() => Promise.resolve(data))).resolves.toEqual({ data, rateLimited: false });
});

test.each(["INTERNAL_SERVER_ERROR", "UNAUTHORIZED", "NOT_FOUND"] as const)("other server errors still propagate: %s", async (code) => {
    const error = new TRPCError({ code });
    await expect(readWithRateLimit(() => Promise.reject(error))).rejects.toBe(error);
});

test("classifies browser tRPC errors without treating arbitrary messages as throttling", () => {
    expect(isRateLimitError({ data: { code: "TOO_MANY_REQUESTS" } })).toBe(true);
    for (const error of [null, "TOO_MANY_REQUESTS", new Error("Rate limit exceeded"), { code: 429 }, { data: null }]) {
        expect(isRateLimitError(error)).toBe(false);
    }
});
