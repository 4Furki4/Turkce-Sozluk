import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { ciEnvironment } from "../scripts/ci/env.mjs";
import { getContentQuality } from "../src/server/content-quality";
import { contentQualityInputSchema } from "../src/server/api/schemas/content-quality";
import en from "../messages/en.json";
import tr from "../messages/tr.json";

test.use({ timezoneId: "America/Los_Angeles" });

test("SQL quality checks distinguish published audio, overlapping gaps, enrichment and bounded demand", async () => {
  const sql = postgres(ciEnvironment().DATABASE_URL, { max: 1 });
  const database = drizzle(sql);
  const ids: number[] = [];
  const assets: string[] = [];
  const actor = randomUUID();
  const prefix = "quality" + randomUUID().replaceAll("-", "") + " ";
  let source: number | undefined;
  const list = (input = {}) => getContentQuality(database as never, contentQualityInputSchema.parse({
    q: prefix, selection: { range: "custom", start: "2002-03-01", end: "2002-03-02" }, ...input,
  }));
  const published = async (id: number, name: string, headword = name) => {
    const key = randomUUID().replaceAll("-", "") + randomUUID().replaceAll("-", ""); assets.push(key);
    await sql`INSERT INTO pronunciation_assets (key, spoken_text, model, model_revision, package_version, settings, object_key, audio_url, sha256, duration, rms)
      VALUES (${key}, ${name}, 'ci', 'ci', 'ci', ${JSON.stringify({ seed: 1, speed: 1, device: "cpu", sampleRate: 24000, pipeline: 1 })}::jsonb, ${key}, 'https://example.invalid/audio.wav', ${key}, 1, 0.1)`;
    await sql`INSERT INTO word_pronunciation_audio (word_id, asset_key, headword) VALUES (${id}, ${key}, ${headword})`;
  };
  try {
    await sql`INSERT INTO users (id, email) VALUES (${actor}, ${actor + "@example.invalid"})`;
    [ { id: source } ] = await sql`INSERT INTO word_sources (source_type) VALUES ('tdk') RETURNING id`;
    for (const suffix of ["a empty", "b partial", "c complete", "d enrich", "e stale", "f blank", "g examples"]) {
      const [row] = await sql`INSERT INTO words (name, variant, source_id) VALUES (${prefix + suffix}, 0, ${ids.length ? source! : null}) RETURNING id`;
      ids.push(row.id);
    }
    for (const index of [1, 2, 3, 4, 5, 6]) {
      const [meaning] = await sql`INSERT INTO meanings (word_id, meaning) VALUES (${ids[index]}, ${index === 5 ? " \t\n" : "meaning"}) RETURNING id`;
      if (![5, 6].includes(index)) await sql`INSERT INTO examples (meaning_id, sentence) VALUES (${meaning.id}, 'example')`;
      if (index === 1) {
        const [second] = await sql`INSERT INTO meanings (word_id, meaning) VALUES (${ids[index]}, 'second') RETURNING id`;
        await sql`INSERT INTO examples (meaning_id, sentence) VALUES (${second.id}, E' \t\n')`;
      }
    }
    // Editors and the reader associate roots by word_id; root_id stays null.
    // Multiple owned roots must still count as one word, and blank roots do not
    // satisfy optional enrichment.
    await sql`INSERT INTO roots (word_id, root) VALUES (${ids[2]}, 'root'), (${ids[2]}, 'second root'), (${ids[2]}, E' \t\n'), (${ids[3]}, E' \t\n')`;
    expect((await sql`SELECT root_id FROM words WHERE id = ${ids[2]}`)[0].root_id).toBeNull();
    for (const index of [1, 3, 4, 5]) await published(ids[index]!, prefix + ["a empty", "b partial", "c complete", "d enrich", "e stale", "f blank"][index], index === 4 ? "old headword" : prefix + ["a empty", "b partial", "c complete", "d enrich", "e stale", "f blank"][index]);
    for (const index of [2, 5, 6]) await sql`INSERT INTO pronunciations (word_id, user_id, audio_url) VALUES (${ids[index]}, ${actor}, 'https://example.invalid/reviewed.wav')`;
    await sql`INSERT INTO pronunciations (word_id, user_id, audio_url) VALUES (${ids[5]}, ${actor}, E' \t\n')`;
    for (const [index, n] of [[0, 5], [1, 2], [6, 2]]) for (let i = 0; i < n!; i++) await sql`INSERT INTO search_logs (word_id, search_timestamp) VALUES (${ids[index!]}, ${i ? "2002-03-02T23:59:59.999Z" : "2002-03-01T00:00:00Z"})`;
    await sql`INSERT INTO search_logs (word_id, search_timestamp) VALUES (${ids[4]}, '2002-03-03T00:00:00Z')`;
    const result = await list();
    expect(result.summary).toMatchObject({ words: 7, needsWork: 5, matching: 5, meaning: 2, pronunciation: 3, examples: 2, source: 1, etymology: 6, searches: 9 });
    expect(result.items.map(row => row.id)).toEqual([ids[0], ids[1], ids[6], ids[4], ids[5]]);
    expect(result.items.find(row => row.id === ids[1])).toMatchObject({ meaning: false, pronunciation: false, examples: true, withoutExamples: 1 });
    expect(result.items.find(row => row.id === ids[5])).toMatchObject({ meaning: true, examples: false, pronunciation: true });
    const enrichment = await list({ gap: "etymology" });
    expect(enrichment.total).toBe(6);
    expect(enrichment.items.map(row => row.id)).toContain(ids[3]);
    expect(enrichment.items.map(row => row.id)).not.toContain(ids[2]);
    expect((await list({ gap: "source" })).total).toBe(1);
    expect((await list({ demand: "unsearched", sort: "demand_asc" })).items.map(row => row.id)).toEqual([ids[4], ids[5]]);
    expect((await list({ demand: "searched" })).summary.words).toBe(3);
    expect((await list({ sort: "demand_asc" })).items[0]!.id).toBe(ids[4]);
    expect((await list({ page: 999, pageSize: 5 })).page).toBe(1);
    expect((await list({ q: prefix + "%" })).total).toBe(0);
    expect((await list({ q: prefix + "_" })).total).toBe(0);
    expect((await list({ q: prefix + "absent" })).summary).toMatchObject({ words: 0, needsWork: 0, matching: 0, searches: 0 });
    await sql`INSERT INTO roots (word_id, root) VALUES (${ids[3]}, 'new etymology')`;
    const enriched = await list({ gap: "etymology" });
    expect(enriched.items.map(row => row.id)).not.toContain(ids[3]);
    expect(enriched.summary).toMatchObject({ words: 7, etymology: 5 });
    const [fixed] = await sql`INSERT INTO meanings (word_id, meaning) VALUES (${ids[0]}, 'fixed') RETURNING id`;
    await sql`INSERT INTO examples (meaning_id, sentence) VALUES (${fixed.id}, 'fixed example')`;
    await sql`UPDATE words SET source_id = ${source!} WHERE id = ${ids[0]}`;
    await sql`INSERT INTO pronunciations (word_id, user_id, audio_url) VALUES (${ids[0]}, ${actor}, 'https://example.invalid/fixed.wav')`;
    expect((await list()).items.map(row => row.id)).not.toContain(ids[0]);
  } finally {
    if (ids.length) await sql`DELETE FROM words WHERE id IN ${sql(ids)}`;
    if (assets.length) await sql`DELETE FROM pronunciation_assets WHERE key IN ${sql(assets)}`;
    if (source) await sql`DELETE FROM word_sources WHERE id = ${source}`;
    await sql`DELETE FROM users WHERE id = ${actor}`;
    await sql.end({ timeout: 5 });
  }
});

for (const locale of ["tr", "en"] as const) test(`${locale}: quality filters, demand order, history and existing editors work`, async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const sql = postgres(ciEnvironment().DATABASE_URL, { max: 1 });
  const copy = (locale === "tr" ? tr : en).Dashboard.contentQuality;
  const ids: number[] = [];
  let actor: string | undefined;
  const prefix = "quality" + randomUUID().replaceAll("-", "") + " ";
  const term = prefix + "a";
  const longTerm = prefix + "uzun".repeat(35);
  const path = locale === "tr" ? "/tr/panel/icerik-kalitesi" : "/en/dashboard/content-quality";
  const url = `${path}?range=custom&start=2002-03-01&end=2002-03-02&q=${encodeURIComponent(prefix)}`;
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (/MISSING_MESSAGE|FORMATTING_ERROR|width\(-1\)/.test(message.text())) errors.push(message.text()); });
  await page.route(/^https:\/\//, route => route.abort());
  await page.context().setExtraHTTPHeaders({ "x-forwarded-for": `10.64.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}` });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const choose = async (label: string, value: string) => {
    const trigger = page.getByRole("button", { name: label, exact: true });
    if (!(await trigger.isVisible())) await page.getByText(copy.filters.title, { exact: true }).click();
    await trigger.scrollIntoViewIfNeeded();
    if (testInfo.project.name === "mobile") await trigger.tap(); else await trigger.click();
    await page.getByRole("option", { name: value, exact: true }).press("Enter");
    await expect(trigger).toContainText(value);
  };
  try {
    const identity = "quality_" + randomUUID().replaceAll("-", "");
    const email = identity + "@example.invalid";
    const password = "ci-only-quality-password";
    const signup = await page.request.post("/api/auth/sign-up/email", { maxRetries: 2, headers: { origin: "http://localhost:3100" }, data: { email, name: "Quality Reviewer", username: identity, password } });
    expect(signup.ok(), await signup.text()).toBe(true);
    actor = (await signup.json()).user.id;
    await sql`UPDATE users SET role = 'admin' WHERE id = ${actor!}`;
    await page.request.post("/api/auth/sign-out", { headers: { origin: "http://localhost:3100" } });
    expect((await page.request.post("/api/auth/sign-in/email", { headers: { origin: "http://localhost:3100" }, data: { email, password } })).ok()).toBe(true);
    for (const name of [term, longTerm, ...Array.from({ length: 10 }, (_, i) => prefix + "term " + String.fromCharCode(97 + i))]) {
      const [row] = await sql`INSERT INTO words (name, variant) VALUES (${name}, 0) RETURNING id`; ids.push(row.id);
    }
    for (let i = 0; i < 3; i++) await sql`INSERT INTO search_logs (word_id, search_timestamp) VALUES (${ids[0]}, '2002-03-01T00:00:00Z')`;
    await page.goto(url);
    const items = page.getByTestId("quality-item");
    await expect(items).toHaveCount(10);
    await expect(items.first().getByRole("heading", { name: term, exact: true })).toBeVisible();
    await expect(items.first().getByTestId("quality-demand")).toContainText("3");
    await expect(page.getByTestId("quality-summary-meaning")).toBeInViewport();
    await expect(items.first().getByRole("heading", { name: term, exact: true }).getByRole("link")).toBeInViewport();
    const firstLink = await items.first().getByRole("heading", { name: term, exact: true }).getByRole("link").boundingBox();
    expect(firstLink!.y + firstLink!.height).toBeLessThanOrEqual(page.viewportSize()!.height - (testInfo.project.name === "mobile" ? 84 : 0));
    await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: "instant" }));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    await page.screenshot({ path: testInfo.outputPath("content-quality.png"), fullPage: true, scale: "css", animations: "disabled" });
    await page.screenshot({ path: testInfo.outputPath("content-quality-viewport.png"), scale: "css", animations: "disabled" });
    await page.getByText(copy.filters.title, { exact: true }).click();
    const form = page.locator('form').filter({ has: page.getByRole("textbox", { name: copy.filters.query, exact: true }) });
    const heights = await form.locator('[data-slot="input-wrapper"], [data-slot="trigger"], button[type="submit"]').evaluateAll(elements => elements.map(el => el.getBoundingClientRect().height));
    expect(heights).toHaveLength(6); expect(heights.every(h => Math.abs(h - 40) < 1)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: "instant" }));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    await page.screenshot({ path: testInfo.outputPath("content-quality-expanded.png"), fullPage: true, scale: "css", animations: "disabled" });
    await page.getByRole("button", { name: copy.pagination.next, exact: true }).click();
    await expect(page).toHaveURL(/page=2/); await expect(items).toHaveCount(2);
    await expect(items.getByRole("heading", { name: longTerm, exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: "instant" }));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    await page.screenshot({ path: testInfo.outputPath("content-quality-long.png"), fullPage: true, scale: "css", animations: "disabled" });
    await page.goBack(); await expect(items).toHaveCount(10);
    await choose(copy.filters.sort, copy.sort.demand_asc);
    await form.getByRole("button", { name: copy.filters.apply, exact: true }).click();
    await expect(page).toHaveURL(/sort=demand_asc/);
    await expect(items.first().getByTestId("quality-demand")).toContainText("0");
    await page.reload(); await expect(items.first().getByTestId("quality-demand")).toContainText("0");
    await choose(copy.filters.demand, copy.demand.searched);
    await form.getByRole("button", { name: copy.filters.apply, exact: true }).click(); await expect(items).toHaveCount(1);
    const manage = items.first().getByRole("link", { name: copy.actions.manage, exact: true });
    await expect(manage).toHaveAttribute("href", new RegExp(locale === "tr" ? "/tr/panel/kelimeler\\?search=" : "/en/dashboard/word-list\\?search="));
    await manage.focus(); await page.keyboard.press("Enter");
    await expect(page.locator('input').filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByRole("row").filter({ hasText: term })).toHaveCount(1);
    await page.goBack(); await expect(items).toHaveCount(1);
    await choose(copy.filters.gap, copy.gaps.meaning); await form.getByRole("button", { name: copy.filters.apply, exact: true }).click();
    await expect(items).toHaveCount(1);
    await sql`INSERT INTO meanings (word_id, meaning) VALUES (${ids[0]}, 'fixed meaning')`;
    await page.getByRole("button", { name: copy.actions.refresh, exact: true }).click();
    await expect(items).toHaveCount(0); await expect(page.getByText(copy.empty, { exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  } finally {
    if (ids.length) await sql`DELETE FROM words WHERE id IN ${sql(ids)}`;
    if (actor) await sql`DELETE FROM users WHERE id = ${actor}`;
    await sql.end({ timeout: 5 });
  }
});
