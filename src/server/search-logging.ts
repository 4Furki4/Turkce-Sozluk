import { after } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { searchLogs, type NewSearchLog } from "@/db/schema/search_logs";
import { userSearchHistory } from "@/db/schema/user_search_history";

/** Each callback uses the shared database, never a completed read transaction. */
export function scheduleSearchLog(event: Pick<NewSearchLog, "wordId" | "userId">) {
  const { wordId, userId } = event;
  after(async () => {
    const started = performance.now();
    try {
      await db.transaction(async (tx) => {
        await tx.execute(sql`SET LOCAL statement_timeout = '2s'`);
        await tx.execute(sql`SET LOCAL lock_timeout = '1s'`);
        await tx.insert(searchLogs).values({ wordId, userId });
      });
    } catch {
      console.error("[search-log] write failed", { durationMs: performance.now() - started });
      return;
    }

    if (userId) {
      try {
        await db.transaction(async (tx) => {
          await tx.execute(sql`SET LOCAL statement_timeout = '2s'`);
          await tx.execute(sql`SET LOCAL lock_timeout = '1s'`);
          await tx.insert(userSearchHistory).values({ wordId, userId });
        });
      } catch {
        console.error("[search-history] write failed", { durationMs: performance.now() - started });
      }
    }
  });
}
