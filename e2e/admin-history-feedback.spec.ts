import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import postgres from "postgres";
import superjson from "superjson";
import { ciEnvironment } from "../scripts/ci/env.mjs";

test("feedback status, type and deletion share their audit transaction", async ({ request }) => {
  test.setTimeout(90_000);
  const sql = postgres(ciEnvironment().DATABASE_URL, { max: 1 });
  await sql`SELECT pg_advisory_lock(20261015, 6)`;
  const [initialCoverage] = await sql`SELECT * FROM admin_audit_coverage WHERE id = 1`;
  const prefix = "auditfeedback" + randomUUID().replaceAll("-", "");
  const headers = { origin: "http://localhost:3100", "x-forwarded-for": `10.67.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}` };
  let actorId: string | undefined, feedbackId: number | undefined;
  const mutate = (path: string, input: unknown) => request.post(`/api/trpc/admin.feedback.${path}`, {
    headers, data: superjson.serialize(input), timeout: 10_000,
  });
  try {
    const email = prefix + "@example.invalid", password = "ci-only-feedback-password";
    const signup = await request.post("/api/auth/sign-up/email", { maxRetries: 2, headers, data: { email, name: "Feedback fixture", username: prefix, password } });
    expect(signup.ok(), await signup.text()).toBe(true); actorId = (await signup.json()).user.id;
    const title = "DO_NOT_RETAIN_TITLE_" + prefix, description = "DO_NOT_RETAIN_DESCRIPTION_" + prefix;
    const [feedback] = await sql`INSERT INTO feedbacks (user_id, type, title, description) VALUES (${actorId!}, 'bug', ${title}, ${description}) RETURNING id`;
    feedbackId = feedback.id;
    expect((await mutate("updateStatus", { id: feedbackId, status: "in_progress" })).status()).toBe(401);
    expect(await sql`SELECT id FROM admin_audit_events WHERE actor_id = ${actorId!}`).toHaveLength(0);
    await sql`UPDATE users SET role = 'admin' WHERE id = ${actorId!}`;
    await request.post("/api/auth/sign-out", { headers });
    expect((await request.post("/api/auth/sign-in/email", { headers, data: { email, password } })).ok()).toBe(true);

    const status = await mutate("updateStatus", { id: feedbackId, status: "in_progress" });
    expect(status.status(), await status.text()).toBe(200);
    expect((await sql`SELECT status FROM feedbacks WHERE id = ${feedbackId!}`)[0].status).toBe("in_progress");
    expect((await mutate("updateStatus", { id: feedbackId, status: "invalid" })).status()).toBe(400);
    const type = await mutate("updateType", { id: feedbackId, type: "feature" });
    expect(type.status(), await type.text()).toBe(200);
    expect((await sql`SELECT type FROM feedbacks WHERE id = ${feedbackId!}`)[0].type).toBe("feature");
    const deleted = await mutate("delete", { id: feedbackId });
    expect(deleted.status(), await deleted.text()).toBe(200);
    expect(await sql`SELECT id FROM feedbacks WHERE id = ${feedbackId!}`).toHaveLength(0);

    const events = await sql`SELECT * FROM admin_audit_events WHERE actor_id = ${actorId!} ORDER BY id`;
    expect(events).toHaveLength(3);
    expect(events.map(event => event.action)).toEqual(["update", "update", "delete"]);
    expect(events.every(event => event.target_type === "feedback" && event.target_id === String(feedbackId))).toBe(true);
    expect(events[0].changes).toContainEqual({ field: "status", before: "open", after: "in_progress" });
    expect(events[1].changes).toContainEqual({ field: "type", before: "bug", after: "feature" });
    expect(events[2].changes).toContainEqual({ field: "type", before: "feature", after: null });
    expect(JSON.stringify(events)).not.toContain(title);
    expect(JSON.stringify(events)).not.toContain(description);
  } finally {
    if (actorId) await sql`DELETE FROM admin_audit_events WHERE actor_id = ${actorId}`;
    if (feedbackId) await sql`DELETE FROM feedbacks WHERE id = ${feedbackId}`;
    if (actorId) await sql`DELETE FROM users WHERE id = ${actorId}`;
    if (!initialCoverage) await sql`DELETE FROM admin_audit_coverage WHERE id = 1 AND NOT EXISTS (SELECT 1 FROM admin_audit_events)`;
    await sql`SELECT pg_advisory_unlock(20261015, 6)`; await sql.end({ timeout: 5 });
  }
});
