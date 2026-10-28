import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import postgres from "postgres";
import superjson from "superjson";
import { ciEnvironment } from "../scripts/ci/env.mjs";

test("audited word edits keep shared attributes and foreign meanings on their owning entries", async ({ request }) => {
  test.setTimeout(90_000);
  const sql = postgres(ciEnvironment().DATABASE_URL, { max: 1 });
  await sql`SELECT pg_advisory_lock(20261015, 6)`;
  const [initialCoverage] = await sql`SELECT * FROM admin_audit_coverage WHERE id = 1`;
  const prefix = "auditintegrity" + randomUUID().replaceAll("-", "");
  const wordIds: number[] = [], wordAttributes: number[] = [], meaningAttributes: number[] = [], meaningIds: number[] = [];
  let actorId: string | undefined;
  try {
    const email = prefix + "@example.invalid", password = "ci-only-integrity-password";
    const signup = await request.post("/api/auth/sign-up/email", { maxRetries: 2, headers: { origin: "http://localhost:3100" }, data: { email, name: "Integrity fixture", username: prefix, password } });
    expect(signup.ok(), await signup.text()).toBe(true); actorId = (await signup.json()).user.id;
    await sql`UPDATE users SET role = 'admin' WHERE id = ${actorId!}`;
    await request.post("/api/auth/sign-out", { headers: { origin: "http://localhost:3100" } });
    expect((await request.post("/api/auth/sign-in/email", { headers: { origin: "http://localhost:3100" }, data: { email, password } })).ok()).toBe(true);
    for (const suffix of [" A", " B"]) {
      const [word] = await sql`INSERT INTO words (name) VALUES (${prefix + suffix}) RETURNING id`; wordIds.push(word.id);
      const [meaning] = await sql`INSERT INTO meanings (word_id, meaning) VALUES (${word.id}, ${"meaning" + suffix}) RETURNING id`; meaningIds.push(meaning.id);
      const [attribute] = await sql`INSERT INTO word_attributes (attribute) VALUES (${prefix + suffix}) RETURNING id`; wordAttributes.push(attribute.id);
      const [meaningAttribute] = await sql`INSERT INTO meaning_attributes (attribute) VALUES (${prefix + suffix}) RETURNING id`; meaningAttributes.push(meaningAttribute.id);
    }
    await sql`INSERT INTO words_attributes (word_id, attribute_id) VALUES (${wordIds[0]}, ${wordAttributes[0]}), (${wordIds[0]}, ${wordAttributes[1]}), (${wordIds[1]}, ${wordAttributes[0]})`;
    await sql`INSERT INTO meanings_attributes (meaning_id, attribute_id) VALUES (${meaningIds[0]}, ${meaningAttributes[0]}), (${meaningIds[0]}, ${meaningAttributes[1]}), (${meaningIds[1]}, ${meaningAttributes[0]})`;
    const input = { id: wordIds[0], name: prefix + " updated", attributes: [wordAttributes[1]], meanings: [{ id: meaningIds[0], meaning: "a" + "😀".repeat(256), attributes: [meaningAttributes[1]] }] };
    const edited = await request.post("/api/trpc/admin.editWord", { data: superjson.serialize(input) });
    expect(edited.status(), await edited.text()).toBe(200);
    expect(await sql`SELECT * FROM words_attributes WHERE word_id = ${wordIds[1]} AND attribute_id = ${wordAttributes[0]}`).toHaveLength(1);
    expect(await sql`SELECT * FROM meanings_attributes WHERE meaning_id = ${meaningIds[1]} AND attribute_id = ${meaningAttributes[0]}`).toHaveLength(1);
    expect(await sql`SELECT * FROM words_attributes WHERE word_id = ${wordIds[0]} AND attribute_id = ${wordAttributes[0]}`).toHaveLength(0);
    expect(await sql`SELECT * FROM meanings_attributes WHERE meaning_id = ${meaningIds[0]} AND attribute_id = ${meaningAttributes[0]}`).toHaveLength(0);
    const invalid = await request.post("/api/trpc/admin.editWord", { data: superjson.serialize({ ...input, name: prefix + " must rollback", meanings: [{ id: meaningIds[1], meaning: "must not change" }] }) });
    expect(invalid.status()).toBe(500);
    expect((await sql`SELECT name FROM words WHERE id = ${wordIds[0]}`)[0].name).toBe(prefix + " updated");
    expect((await sql`SELECT meaning FROM meanings WHERE id = ${meaningIds[1]}`)[0].meaning).toBe("meaning B");
    const events = await sql`SELECT * FROM admin_audit_events WHERE actor_id = ${actorId!}`;
    expect(events).toHaveLength(1); expect(events[0].target_id).toBe(String(wordIds[0]));
    expect(events[0].truncated).toBe(1);
    expect(events[0].changes.some((change: any) => change.field === "name" && change.after === prefix + " updated")).toBe(true);
  } finally {
    if (actorId) await sql`DELETE FROM admin_audit_events WHERE actor_id = ${actorId}`;
    if (wordIds.length) await sql`DELETE FROM words WHERE id IN ${sql(wordIds)}`;
    if (wordAttributes.length) await sql`DELETE FROM word_attributes WHERE id IN ${sql(wordAttributes)}`;
    if (meaningAttributes.length) await sql`DELETE FROM meaning_attributes WHERE id IN ${sql(meaningAttributes)}`;
    if (actorId) await sql`DELETE FROM users WHERE id = ${actorId}`;
    if (!initialCoverage) await sql`DELETE FROM admin_audit_coverage WHERE id = 1 AND NOT EXISTS (SELECT 1 FROM admin_audit_events)`;
    await sql`SELECT pg_advisory_unlock(20261015, 6)`; await sql.end({ timeout: 5 });
  }
});
