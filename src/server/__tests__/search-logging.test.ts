/** @jest-environment node */
const callbacks: Array<() => Promise<void>> = [];
jest.mock("next/server", () => ({ after: (callback: () => Promise<void>) => callbacks.push(callback) }));
jest.mock("@/db", () => ({ db: { transaction: jest.fn() } }));

import { db } from "@/db";
import { scheduleSearchLog } from "../search-logging";
import { searchLogs } from "@/db/schema/search_logs";
import { userSearchHistory } from "@/db/schema/user_search_history";

beforeEach(() => { callbacks.length = 0; jest.clearAllMocks(); });

test("writes only in the after-response callback and preserves signed-in history eligibility", async () => {
  const writes: Array<{ table: unknown; event: unknown }> = [];
  const tx = { execute: jest.fn(), insert: (table: unknown) => ({ values: async (event: unknown) => { writes.push({ table, event }); } }) };
  (db.transaction as jest.Mock).mockImplementation((run) => run(tx));
  scheduleSearchLog({ wordId: 42, userId: "user" });
  expect(db.transaction).not.toHaveBeenCalled();
  expect(callbacks).toHaveLength(1);
  await callbacks[0]();
  expect(writes).toEqual([
    { table: searchLogs, event: { wordId: 42, userId: "user" } },
    { table: userSearchHistory, event: { wordId: 42, userId: "user" } },
  ]);
  expect(tx.execute).toHaveBeenCalledTimes(4);
});

test("anonymous search does not create private history; log failure is contained", async () => {
  const insert = jest.fn(() => ({ values: jest.fn() }));
  (db.transaction as jest.Mock).mockImplementation((run) => run({ execute: jest.fn(), insert }));
  scheduleSearchLog({ wordId: 42, userId: null });
  await callbacks[0]();
  expect(insert).toHaveBeenCalledTimes(1);
  expect(insert).toHaveBeenCalledWith(searchLogs);
  const warning = jest.spyOn(console, "error").mockImplementation(() => {});
  (db.transaction as jest.Mock).mockRejectedValue(new Error("unavailable"));
  scheduleSearchLog({ wordId: 42, userId: "user" });
  await expect(callbacks[1]()).resolves.toBeUndefined();
  expect(warning).toHaveBeenCalledWith("[search-log] write failed", expect.any(Object));
  warning.mockRestore();
});
