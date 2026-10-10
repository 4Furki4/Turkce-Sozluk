/** @jest-environment node */
import { PgDialect } from "drizzle-orm/pg-core";
import { requestRouter } from "../request";
import { verifyRecaptcha } from "@/src/lib/recaptcha";

jest.mock("@/src/lib/recaptcha", () => ({ verifyRecaptcha: jest.fn() }));
jest.mock("../request-handlers", () => ({ pronunciationHandlers: {}, relatedItemsHandlers: {}, contentEditsHandlers: {}, adminHandlers: {} }));
jest.mock("@/src/server/api/trpc", () => {
  const { initTRPC } = require("@trpc/server");
  const t = initTRPC.create();
  return { createTRPCRouter: t.router, protectedProcedure: t.procedure };
});

function caller(returnedIds: { id: number }[]) {
  const returning = jest.fn().mockResolvedValue(returnedIds);
  const where = jest.fn().mockReturnValue({ returning });
  const db = { delete: jest.fn().mockReturnValue({ where }), select: jest.fn() };
  const client = requestRouter.createCaller({ db, session: { user: { id: "owner-id" } } } as any);
  return { client, db, where };
}
beforeEach(() => jest.mocked(verifyRecaptcha).mockResolvedValue({ success: true } as any));
it("cancels with ownership and pending status checked in the same database statement", async () => {
  const { client, db, where } = caller([{ id: 42 }]);
  await expect(client.cancelRequest({ requestId: 42, captchaToken: "test-token" })).resolves.toEqual({ success: true });
  const query = new PgDialect().sqlToQuery(where.mock.calls[0][0]);
  expect(query.sql).toContain('"requests"."id"');
  expect(query.sql).toContain('"requests"."user_id"');
  expect(query.sql).toContain('"requests"."status"');
  expect(query.params).toEqual([42, "owner-id", "pending"]);
  expect(db.select).not.toHaveBeenCalled();
});
it("reports that a request is unavailable when no owned pending row was removed", async () => {
  const { client } = caller([]);
  await expect(client.cancelRequest({ requestId: 42, captchaToken: "test-token" })).rejects.toMatchObject({ code: "NOT_FOUND" });
});
it("never attempts deletion when verification fails", async () => {
  jest.mocked(verifyRecaptcha).mockResolvedValueOnce({ success: false } as any);
  const { client, db } = caller([{ id: 42 }]);
  await expect(client.cancelRequest({ requestId: 42, captchaToken: "test-token" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  expect(db.delete).not.toHaveBeenCalled();
});
