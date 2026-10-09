/** @jest-environment node */
import { createPublicReadCache } from "../public-read-cache";

afterEach(() => jest.useRealTimers());

test("concurrent reads coalesce while distinct word/case keys stay isolated", async () => {
  const cache = createPublicReadCache<string>(45_000, 10);
  let resolve!: (value: string) => void;
  const load = jest.fn(() => new Promise<string>((done) => { resolve = done; }));
  const reads = Array.from({ length: 1000 }, () => cache.read("kitap", load));
  await Promise.resolve();
  expect(load).toHaveBeenCalledTimes(1);
  resolve("kitap");
  expect(await Promise.all(reads)).toEqual(Array(1000).fill("kitap"));
  expect(await cache.read("Kitap", async () => "different variant")).toBe("different variant");
  expect(await cache.read("su", async () => "su")).toBe("su");
});

test("expiry and invalidation cannot let an old in-flight fill replace a new one", async () => {
  jest.useFakeTimers();
  const cache = createPublicReadCache<string>(45_000, 10);
  let resolveOld!: (value: string) => void;
  const oldRead = cache.read("word", () => new Promise<string>((done) => { resolveOld = done; }));
  await Promise.resolve();
  cache.invalidate();
  expect(await cache.read("word", async () => "new")).toBe("new");
  resolveOld("old");
  expect(await oldRead).toBe("old");
  expect(await cache.read("word", async () => "unexpected")).toBe("new");
  jest.advanceTimersByTime(45_000);
  expect(await cache.read("word", async () => "refreshed")).toBe("refreshed");
});

test("failed reads can be retried and storage stays bounded", async () => {
  const cache = createPublicReadCache<string>(45_000, 2);
  await expect(cache.read("failure", async () => { throw new Error("database unavailable"); })).rejects.toThrow();
  expect(await cache.read("failure", async () => "recovered")).toBe("recovered");
  await cache.read("second", async () => "second");
  await cache.read("third", async () => "third");
  expect(cache.stats().entries).toBe(2);
  expect(cache.stats().evictions).toBe(1);
});
