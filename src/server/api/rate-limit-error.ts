import { TRPCError } from "@trpc/server";

export class RateLimitError extends TRPCError {
    constructor(readonly retryAt: number) {
        super({ code: "TOO_MANY_REQUESTS", message: "Rate limit exceeded. Please try again later." });
    }
}
