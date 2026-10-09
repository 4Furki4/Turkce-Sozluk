/** @jest-environment node */
jest.mock("@/db", () => ({ db: { execute: jest.fn() } }));
jest.mock("@/src/lib/auth", () => ({ auth: { api: { getSession: jest.fn() } } }));
jest.mock("@upstash/redis", () => ({ Redis: { fromEnv: () => ({}) } }));
const mockLimit = jest.fn();
jest.mock("@upstash/ratelimit", () => ({ Ratelimit: class {
  static slidingWindow = jest.fn(() => ({}));
  limit(id: string) { return mockLimit(id); }
} }));
jest.mock("superjson", () => ({ __esModule: true, default: { serialize: (json: unknown) => ({ json }), deserialize: ({ json }: { json: unknown }) => json } }));
jest.mock("isomorphic-dompurify", () => ({ __esModule: true, default: { sanitize: (value: string) => value } }));

import { db } from "@/db";
import { invalidateDictionaryCache } from "@/src/server/dictionary-cache";
import { adminProcedure, createTRPCRouter } from "../../trpc";
import { wordRouter } from "../word";

const router = createTRPCRouter({
  word: wordRouter,
  admin: createTRPCRouter({ update: adminProcedure.mutation(() => "updated") }),
});
const caller = (id = "reader", database = db) => router.createCaller({
  db: database, session: { user: { id, role: "admin" } }, headers: new Headers(),
} as never);
const execute = db.execute as jest.Mock;
const originalNodeEnv = process.env.NODE_ENV;
let log: jest.SpyInstance;

beforeEach(() => {
  Object.defineProperty(process.env, "NODE_ENV", { value: "production", configurable: true });
  invalidateDictionaryCache();
  execute.mockReset().mockResolvedValue([{ word_id: 1, name: "kitap", meaning: "book" }]);
  mockLimit.mockReset().mockResolvedValue({ success: true });
  log = jest.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => {
  Object.defineProperty(process.env, "NODE_ENV", { value: originalNodeEnv, configurable: true });
  log.mockRestore();
});

test("public rows can be reused across readers while each reader keeps their quota", async () => {
  const first = await caller("first").word.getWords({ take: 10 });
  expect(await caller("second").word.getWords({ take: 10 })).toEqual(first);
  expect(execute).toHaveBeenCalledTimes(1);
  expect(mockLimit.mock.calls.map(([id]) => id)).toEqual(["first", "second"]);
  mockLimit.mockResolvedValue({ success: false, reset: Date.now() + 5000 });
  await expect(caller().word.getWords({ take: 10 })).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
});

test.each([
  { take: 6 }, { skip: 10 }, { search: "İ" }, { search: "ı" },
  { partOfSpeechId: ["2"] }, { languageId: ["3"] }, { attributeId: ["4"] },
  { sortBy: "date" as const }, { sortBy: "length" as const },
  { sortOrder: "desc" as const }, { startsWith: "I" },
])("different list inputs never receive the previous result: %p", async (change) => {
  await caller().word.getWords({ take: 10 });
  const different = [{ word_id: 2, name: "su", meaning: "water" }];
  execute.mockResolvedValue(different);
  expect(await caller().word.getWords({ take: 10, ...change })).toEqual(different);
  expect(execute).toHaveBeenCalledTimes(2);
});

test("counts use their own filter key and remain numeric", async () => {
  execute.mockResolvedValueOnce([{ count: "12" }]).mockResolvedValueOnce([{ count: "3" }]);
  expect(await caller().word.getWordCount({})).toBe(12);
  expect(await caller().word.getWordCount({})).toBe(12);
  expect(await caller().word.getWordCount({ languageId: ["2"] })).toBe(3);
  expect(execute).toHaveBeenCalledTimes(2);
});

test("successful dictionary writes invalidate prepared rows and counts", async () => {
  await caller().word.getWords({ take: 10 });
  execute.mockResolvedValue([{ count: "2" }]);
  await caller().word.getWordCount({});
  await caller().admin.update();
  const updated = [{ word_id: 3, name: "yeni", meaning: "new" }];
  execute.mockResolvedValueOnce(updated).mockResolvedValueOnce([{ count: "3" }]);
  expect(await caller().word.getWords({ take: 10 })).toEqual(updated);
  expect(await caller().word.getWordCount({})).toBe(3);
  expect(execute).toHaveBeenCalledTimes(4);
});

test("failed fills and a different database do not reuse shared results", async () => {
  execute.mockRejectedValueOnce(new Error("database unavailable"));
  await expect(caller().word.getWords({ take: 10 })).rejects.toThrow("database unavailable");
  await expect(caller().word.getWords({ take: 10 })).resolves.toHaveLength(1);
  const otherRows = [{ word_id: 7, name: "başka", meaning: "other" }];
  const otherDb = { execute: jest.fn().mockResolvedValue(otherRows) };
  expect(await caller("other", otherDb as never).word.getWords({ take: 10 })).toEqual(otherRows);
  expect(otherDb.execute).toHaveBeenCalledTimes(1);
});
