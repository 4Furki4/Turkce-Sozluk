import { randomUUID } from "node:crypto";
import { expect, test, type APIRequestContext } from "@playwright/test";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import superjson from "superjson";
import { ciEnvironment } from "../scripts/ci/env.mjs";
import { auditAdminMutation, pruneAdminAudit } from "../src/server/admin-audit";
import { getAdminHistory, getAdminHistoryDetail } from "../src/server/admin-history";
import { adminHistoryInputSchema } from "../src/server/api/schemas/admin-history";
import { authors } from "../db/schema/authors";
import { adminAuditEvents } from "../db/schema/admin_audit";
import { eq } from "drizzle-orm";
import en from "../messages/en.json";
import tr from "../messages/tr.json";

test.use({ timezoneId: "America/Los_Angeles" });

async function rpc(request: APIRequestContext, path: string, input: unknown, expectedStatus = 200) {
  const response = await request.post(`/api/trpc/${path}`, { headers: { origin: "http://localhost:3100" }, data: superjson.serialize(input) });
  expect(response.status(), await response.text()).toBe(expectedStatus);
  const body = await response.json();
  return body.result ? superjson.deserialize(body.result.data) as any : body;
}

test("SQL audit events are atomic, bounded, attributable after deletion and serialized per target", async () => {
  test.setTimeout(180_000);
  const sql = postgres(ciEnvironment().DATABASE_URL, { max: 4 });
  const connection = await sql.reserve();
  await connection`SELECT pg_advisory_lock(20261015, 6)`;
  const database = drizzle(sql);
  const actor = { id: randomUUID(), name: "Audit fixture" };
  const label = "audit" + randomUUID().replaceAll("-", "");
  let authorId: number | undefined;
  const [initialCoverage] = await sql`SELECT * FROM admin_audit_coverage WHERE id = 1`;
  try {
    await sql`INSERT INTO users (id, email) VALUES (${actor.id}, ${label + '@example.invalid'})`;
    const result = await auditAdminMutation(database as never, "admin.dynamicParameters.createAuthor", { name: label, password: "NEVER_RETAIN_THIS_SECRET" }, actor, async tx => {
      const rows = await tx.insert(authors).values({ name: label }).returning();
      return { result: rows, output: rows };
    });
    authorId = result[0].id;
    let rows = await sql`SELECT * FROM admin_audit_events WHERE actor_id = ${actor.id} ORDER BY id`;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ actor_id: actor.id, target_id: String(authorId), target_label: label, action: "create" });
    expect(JSON.stringify(rows)).not.toContain("NEVER_RETAIN_THIS_SECRET");
    const update = (name: string) => auditAdminMutation(database as never, "admin.dynamicParameters.updateAuthor", { id: authorId, name }, actor, async tx => {
      await tx.update(authors).set({ name }).where(eq(authors.id, authorId!));
      return { result: true, output: true };
    });
    await Promise.all([update(label + " A"), update(label + " B")]);
    rows = await sql`SELECT * FROM admin_audit_events WHERE actor_id = ${actor.id} ORDER BY id`;
    expect(rows).toHaveLength(3);
    const first = rows[1].changes.find((value: any) => value.field === "name");
    const second = rows[2].changes.find((value: any) => value.field === "name");
    expect(first.before).toBe(label); expect(second.before).toBe(first.after);
    await expect(auditAdminMutation(database as never, "admin.dynamicParameters.createAuthor", {}, actor, async tx => {
      await tx.insert(authors).values({ name: label + " rollback" });
      throw new Error("resolver failure");
    })).rejects.toThrow("resolver failure");
    await expect(auditAdminMutation(database as never, "admin.dynamicParameters.createAuthor", {}, { id: "x".repeat(129) }, async tx => {
      const rows = await tx.insert(authors).values({ name: label + " storage failure" }).returning();
      return { result: rows, output: rows };
    })).rejects.toThrow();
    expect(await sql`SELECT id FROM authors WHERE name IN (${label + " rollback"}, ${label + " storage failure"})`).toHaveLength(0);
    expect(await sql`SELECT id FROM admin_audit_events WHERE actor_id = ${actor.id}`).toHaveLength(3);
    await auditAdminMutation(database as never, "admin.dynamicParameters.deleteAuthor", { id: authorId }, actor, async tx => {
      await tx.delete(authors).where(eq(authors.id, authorId!));
      return { result: true, output: true };
    });
    await sql`DELETE FROM users WHERE id = ${actor.id}`;
    const [deleted] = await sql`SELECT * FROM admin_audit_events WHERE actor_id = ${actor.id} AND action = 'delete'`;
    expect(deleted.actor_label).toBe("Audit fixture"); expect(deleted.target_label).toContain(label);
    expect(deleted.changes.some((value: any) => value.field === "name" && value.after === null)).toBe(true);
  } finally {
    await sql`DELETE FROM admin_audit_events WHERE actor_id = ${actor.id}`;
    if (authorId) await sql`DELETE FROM authors WHERE id = ${authorId}`;
    await sql`DELETE FROM users WHERE id = ${actor.id}`;
    if (!initialCoverage) await sql`DELETE FROM admin_audit_coverage WHERE id = 1 AND NOT EXISTS (SELECT 1 FROM admin_audit_events)`;
    await connection`SELECT pg_advisory_unlock(20261015, 6)`;
    connection.release(); await sql.end({ timeout: 5 });
  }
});

test("SQL history enforces UTC bounds, deterministic pages, retention and coverage preservation", async () => {
  test.setTimeout(180_000);
  const sql = postgres(ciEnvironment().DATABASE_URL, { max: 1 });
  await sql`SELECT pg_advisory_lock(20261015, 6)`;
  const database = drizzle(sql);
  const actorId = randomUUID();
  const now = new Date("2097-07-03T12:00:00Z");
  const cutoff = new Date(now.getTime() - 365 * 86_400_000);
  try {
    await expect(database.transaction(async tx => {
      const timestamps = [new Date(cutoff.getTime() - 1), cutoff, new Date("2097-07-01T00:00:00Z"), new Date("2097-07-02T23:59:59.999Z"), new Date("2097-07-03T00:00:00Z")];
      const ids: number[] = [];
      for (const occurredAt of timestamps) {
        const [event] = await tx.insert(adminAuditEvents).values({ occurredAt, actorId, actorLabel: "retention fixture", action: "update", procedure: "user.setRole", targetType: "user", targetId: "target", targetLabel: "Account", changes: [{ field: "role", before: "user", after: "admin" }] }).returning({ id: adminAuditEvents.id });
        ids.push(event.id);
      }
      const input = adminHistoryInputSchema.parse({ selection: { range: "custom", start: "2097-07-01", end: "2097-07-02" }, actorId, page: 999, pageSize: 5 });
      const result = await getAdminHistory(tx as never, input, now);
      expect(result.total).toBe(2); expect(result.page).toBe(1);
      expect(result.items.map(row => row.id)).toEqual([ids[3], ids[2]]);
      expect(result.items[0]).not.toHaveProperty("changes");
      expect(await getAdminHistoryDetail(tx as never, ids[0], now)).toBeNull();
      expect(await getAdminHistoryDetail(tx as never, ids[1], now)).not.toBeNull();
      await pruneAdminAudit(tx as never, now);
      const kept = await tx.select({ id: adminAuditEvents.id }).from(adminAuditEvents).where(eq(adminAuditEvents.actorId, actorId));
      expect(kept.map(row => row.id)).not.toContain(ids[0]); expect(kept.map(row => row.id)).toContain(ids[1]);
      throw new Error("ROLLBACK_HISTORY_FIXTURE");
    })).rejects.toThrow("ROLLBACK_HISTORY_FIXTURE");
  } finally {
    await sql`SELECT pg_advisory_unlock(20261015, 6)`; await sql.end({ timeout: 5 });
  }
});

for (const locale of ["tr", "en"] as const) test(`${locale}: real admin mutations appear in history with filters, details and safe rollback`, async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const sql = postgres(ciEnvironment().DATABASE_URL, { max: 1 });
  await sql`SELECT pg_advisory_lock(20261015, 6)`;
  const copy = (locale === "tr" ? tr : en).Dashboard.adminHistory;
  const [initialCoverage] = await sql`SELECT * FROM admin_audit_coverage WHERE id = 1`;
  const name = "audit" + randomUUID().replaceAll("-", "");
  const authorIds: number[] = [];
  let actorId: string | undefined, wordId: number | undefined, requestId: number | undefined;
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (/MISSING_MESSAGE|FORMATTING_ERROR/.test(message.text())) errors.push(message.text()); });
  await page.route(/^https:\/\//, route => route.abort());
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.context().setExtraHTTPHeaders({ "x-forwarded-for": `10.65.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}` });
  try {
    expect((await page.request.get("/api/trpc/admin.history.list")).status()).toBe(401);
    const identity = "audit_" + randomUUID().replaceAll("-", "");
    const email = identity + "@example.invalid", password = "ci-only-audit-password";
    const signup = await page.request.post("/api/auth/sign-up/email", { headers: { origin: "http://localhost:3100" }, data: { email, name: "Audit Reviewer", username: identity, password } });
    expect(signup.ok(), await signup.text()).toBe(true); actorId = (await signup.json()).user.id;
    await rpc(page.request, "admin.dynamicParameters.createAuthor", { name }, 401);
    await sql`UPDATE users SET role = 'admin' WHERE id = ${actorId!}`;
    await page.request.post("/api/auth/sign-out", { headers: { origin: "http://localhost:3100" } });
    expect((await page.request.post("/api/auth/sign-in/email", { headers: { origin: "http://localhost:3100" }, data: { email, password } })).ok()).toBe(true);
    for (let i = 0; i < 12; i++) {
      const rows = await rpc(page.request, "admin.dynamicParameters.createAuthor", { name: name + " " + (i === 11 ? "uzun".repeat(35) : i) });
      authorIds.push(rows[0].id);
    }
    await rpc(page.request, "admin.dynamicParameters.updateAuthor", { id: authorIds[0], name: name + " güncel" });
    const added = await rpc(page.request, "admin.addWord", { name, meanings: [{ meaning: "original meaning", attributes: [] }] });
    wordId = added.word.id;
    const meaning = added.meanings[0];
    await rpc(page.request, "admin.editWord", { id: wordId, name: name + " must rollback", meanings: [{ id: meaning.id, meaning: "must rollback", attributes: [2147483000] }] }, 500);
    expect((await sql`SELECT name FROM words WHERE id = ${wordId!}`)[0].name).toBe(name);
    expect((await sql`SELECT meaning FROM meanings WHERE id = ${meaning.id}`)[0].meaning).toBe("original meaning");
    await rpc(page.request, "admin.dynamicParameters.createAuthor", { name: 5 }, 400);
    const [request] = await sql`INSERT INTO requests (user_id, entity_type, entity_id, action, new_data) VALUES (${actorId!}, 'words', ${wordId!}, 'update', ${JSON.stringify({ wordName: name + " new" })}::jsonb) RETURNING id`; requestId = request.id;
    await rpc(page.request, "request.rejectRequest", { requestId, reason: "NEVER_RETAIN_MODERATION_TEXT" });
    await rpc(page.request, "request.rejectRequest", { requestId, reason: "duplicate" }, 409);
    const persisted = await sql`SELECT * FROM admin_audit_events WHERE actor_id = ${actorId!} ORDER BY id DESC`;
    expect(persisted).toHaveLength(15);
    expect(JSON.stringify(persisted)).not.toContain("NEVER_RETAIN_MODERATION_TEXT");
    const path = locale === "tr" ? "/tr/panel/islem-gecmisi" : "/en/dashboard/history";
    await page.goto(`${path}?actorId=${encodeURIComponent(actorId!)}&pageSize=5`);
    const items = page.getByTestId("audit-event");
    await expect(items).toHaveCount(5);
    await expect(items.first().getByRole("heading")).toContainText(copy.verbs.reject);
    await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: "instant" }));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    const first = await items.first().getByRole("heading").boundingBox();
    expect(first!.y + first!.height).toBeLessThanOrEqual(page.viewportSize()!.height - (testInfo.project.name === "mobile" ? 84 : 0));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("admin-history.png"), fullPage: true, scale: "css", animations: "disabled" });
    await page.screenshot({ path: testInfo.outputPath("admin-history-viewport.png"), scale: "css", animations: "disabled" });
    await items.first().getByText(copy.actions.inspect, { exact: true }).click();
    await expect(items.first().getByTestId("audit-detail")).toContainText(copy.fields.status);
    await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: "instant" }));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    await page.screenshot({ path: testInfo.outputPath("admin-history-detail.png"), fullPage: true, scale: "css", animations: "disabled" });
    const link = items.first().getByRole("link", { name: copy.actions.request });
    await expect(link).toHaveAttribute("href", new RegExp(locale === "tr" ? `/tr/panel/istekler/${requestId}` : `/en/dashboard/requests/${requestId}`));
    await link.focus(); await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`/${requestId}$`));
    await page.goBack(); await expect(items).toHaveCount(5);
    await page.locator("summary").filter({ hasText: copy.filters.title }).click();
    const form = page.locator("form").filter({ has: page.getByRole("textbox", { name: copy.filters.actorId, exact: true }) });
    const heights = await form.locator('[data-slot="input-wrapper"], [data-slot="trigger"], button[type="submit"]').evaluateAll(elements => elements.map(el => el.getBoundingClientRect().height));
    expect(heights).toHaveLength(6); expect(heights.every(height => Math.abs(height - 40) < 1)).toBe(true);
    await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: "instant" }));
    await page.screenshot({ path: testInfo.outputPath("admin-history-expanded.png"), fullPage: true, scale: "css", animations: "disabled" });
    await page.getByRole("button", { name: copy.pagination.next, exact: true }).click();
    await expect(page).toHaveURL(/page=2/); await expect(page).toHaveURL(/asOf=/); await expect(items).toHaveCount(5);
    await page.reload(); await expect(items).toHaveCount(5);
    await page.goBack(); await expect(items).toHaveCount(5);
    if (!(await form.isVisible())) await page.locator("summary").filter({ hasText: copy.filters.title }).click();
    await form.getByRole("textbox", { name: copy.filters.targetId, exact: true }).fill(String(requestId));
    const trigger = form.getByRole("button", { name: copy.filters.targetType, exact: true });
    await trigger.scrollIntoViewIfNeeded();
    await trigger.focus();
    await trigger.press("Enter");
    await expect(page.getByRole("listbox")).toBeVisible();
    await page.getByRole("option", { name: copy.entities.request, exact: true }).press("Enter");
    await expect(trigger).toContainText(copy.entities.request);
    await form.getByRole("button", { name: copy.filters.apply, exact: true }).click();
    await expect(items).toHaveCount(1); await expect(page).not.toHaveURL(/page=2/);
    await page.getByRole("button", { name: copy.actions.refresh, exact: true }).click();
    await expect(page).not.toHaveURL(/asOf=/); await expect(items).toHaveCount(1);
    expect(errors).toEqual([]);
  } finally {
    if (actorId) await sql`DELETE FROM admin_audit_events WHERE actor_id = ${actorId}`;
    if (authorIds.length) await sql`DELETE FROM authors WHERE id IN ${sql(authorIds)}`;
    if (requestId) await sql`DELETE FROM requests WHERE id = ${requestId}`;
    if (wordId) await sql`DELETE FROM words WHERE id = ${wordId!}`;
    if (actorId) await sql`DELETE FROM users WHERE id = ${actorId}`;
    if (!initialCoverage) await sql`DELETE FROM admin_audit_coverage WHERE id = 1 AND NOT EXISTS (SELECT 1 FROM admin_audit_events)`;
    await sql`SELECT pg_advisory_unlock(20261015, 6)`; await sql.end({ timeout: 5 });
  }
});
