/** @jest-environment node */
jest.mock("@/db", () => ({ db: {} }));
jest.mock("@/src/lib/auth", () => ({ auth: { api: { getSession: jest.fn() } } }));
jest.mock("@upstash/redis", () => ({ Redis: { fromEnv: () => ({}) } }));
const mockLimit = jest.fn();
jest.mock("@upstash/ratelimit", () => ({ Ratelimit: class {
    static slidingWindow = jest.fn(() => ({}));
    limit(identifier: string) { return mockLimit(identifier); }
} }));
jest.mock("superjson", () => ({ __esModule: true, default: { serialize: (json: unknown) => ({ json }), deserialize: ({ json }: { json: unknown }) => json } }));

import { Ratelimit } from "@upstash/ratelimit";
import { createTRPCRouter, publicProcedure, protectedProcedure, adminProcedure } from "../trpc";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

const router = createTRPCRouter({
    read: publicProcedure.query(() => "ok"),
    write: protectedProcedure.mutation(() => "written"),
    admin: adminProcedure.query(() => "admin"),
});
const originalNodeEnv = process.env.NODE_ENV;
let log: jest.SpyInstance;
beforeEach(() => {
    Object.defineProperty(process.env, "NODE_ENV", { value: "production", configurable: true });
    mockLimit.mockReset().mockResolvedValue({ success: true });
    log = jest.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => { Object.defineProperty(process.env, "NODE_ENV", { value: originalNodeEnv, configurable: true }); log.mockRestore(); });

test("allows a more generous browsing burst", () => {
    expect(Ratelimit.slidingWindow).toHaveBeenCalledWith(120, "10 s");
});

test.each([
    [{ "cf-connecting-ip": "203.0.113.1", "x-forwarded-for": "10.0.0.1" }, "203.0.113.1"],
    [{ "x-forwarded-for": "203.0.113.2, 10.0.0.1" }, "203.0.113.2"],
    [{}, "127.0.0.1"],
])("uses the visitor identity, not the full proxy chain: %p", async (headers, expected) => {
    const caller = router.createCaller({ db: {}, session: null, headers: new Headers(headers) } as never);
    await expect(caller.read()).resolves.toBe("ok");
    expect(mockLimit).toHaveBeenCalledWith(expected);
});

test("authenticated users retain their own quota", async () => {
    const caller = router.createCaller({ db: {}, session: { user: { id: "visitor" } }, headers: new Headers({ "cf-connecting-ip": "203.0.113.1" }) } as never);
    await caller.read();
    expect(mockLimit).toHaveBeenCalledWith("visitor");
});

test("actual exhaustion still denies reads, writes and admin queries", async () => {
    mockLimit.mockResolvedValue({ success: false });
    const caller = router.createCaller({ db: {}, session: { user: { id: "admin", role: "admin" } }, headers: new Headers() } as never);
    for (const run of [() => caller.read(), () => caller.write(), () => caller.admin()]) {
        await expect(run()).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
    }
});

test("the 429 wire response includes the actual limiter retry deadline", async () => {
    const reset = Date.now() + 7_000;
    mockLimit.mockResolvedValue({ success: false, reset });
    const response = await fetchRequestHandler({
        endpoint: "/api/trpc",
        req: new Request("http://localhost/api/trpc/read"),
        router,
        createContext: () => ({ db: {}, session: null, headers: new Headers() } as never),
    });
    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body.error.json.data).toMatchObject({ code: "TOO_MANY_REQUESTS", retryAt: reset });
});

test("the relaxed burst limit still enforces authentication and admin permissions", async () => {
    const caller = router.createCaller({ db: {}, session: null, headers: new Headers() } as never);
    await expect(caller.write()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.admin()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
});
