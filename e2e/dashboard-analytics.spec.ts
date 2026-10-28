import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { ciEnvironment } from "../scripts/ci/env.mjs";
import { getDashboardOverview } from "../src/server/dashboard-overview";
import { getWordQueryLatency } from "../src/server/word-query-latency";
import enMessages from "../messages/en.json";
import trMessages from "../messages/tr.json";

test.use({ timezoneId: "America/Los_Angeles" });

for (const locale of ["tr", "en"] as const) {
  test(`${locale}: dashboard periods, comparisons, validation and history work in another timezone`, async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    const sql = postgres(ciEnvironment().DATABASE_URL, { max: 1 });
    await sql`SELECT pg_advisory_lock(20261015, 1)`;
    const database = drizzle(sql);
    const userIds: string[] = [];
    const requestIds: number[] = [];
    const sampleIds: string[] = [];
    let wordId: number | undefined;
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (/width\(-1\)|height\(-1\)|MISSING_MESSAGE|FORMATTING_ERROR/.test(message.text())) errors.push(message.text()); });
    const copy = (locale === "tr" ? trMessages : enMessages).Dashboard.overview;
    const path = locale === "tr" ? "/tr/panel" : "/en/dashboard";
    const customUrl = `${path}?range=custom&start=2001-02-01&end=2001-02-02`;
    await page.route(/^https:\/\//, route => route.abort());
    await page.context().setExtraHTTPHeaders({ "x-forwarded-for": `10.54.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}` });
    try {
      const identity = `analytics_${randomUUID().replaceAll("-", "")}`;
      const email = `${identity}@example.invalid`;
      const password = "ci-only-analytics-password";
      const signup = await page.request.post("/api/auth/sign-up/email", {
        maxRetries: 2,
        headers: { origin: "http://localhost:3100" }, data: { email, name: "Analytics Test", username: identity, password },
      });
      expect(signup.ok(), await signup.text()).toBe(true);
      const adminId = (await signup.json()).user.id as string;
      userIds.push(adminId);
      await sql`UPDATE users SET role = 'admin' WHERE id = ${adminId}`;
      await page.request.post("/api/auth/sign-out", { headers: { origin: "http://localhost:3100" } });
      expect((await page.request.post("/api/auth/sign-in/email", {
        headers: { origin: "http://localhost:3100" }, data: { email, password },
      })).ok()).toBe(true);

      await sql`SET TIME ZONE 'Pacific/Auckland'`;
      for (const createdAt of ["2001-02-01T00:00:00Z", "2001-02-02T18:00:00Z", "2001-01-30T00:00:00Z", "2001-02-03T00:00:00Z"]) {
        const id = randomUUID();
        userIds.push(id);
        await sql`INSERT INTO users (id, email, created_at) VALUES (${id}, ${`${id}@example.invalid`}, ${createdAt})`;
      }
      const [word] = await sql`INSERT INTO words (name, variant) VALUES (${identity}, 0) RETURNING id`;
      wordId = word.id;
      for (const [index, timestamp] of ["2001-02-01T00:00:00Z", "2001-02-02T18:00:00Z", "2001-02-02T23:59:59.999Z", "2001-01-30T00:00:00Z", "2001-01-31T18:00:00Z", "2001-02-03T00:00:00Z"].entries()) {
        await sql`INSERT INTO search_logs (word_id, user_id, search_timestamp) VALUES (${wordId!}, ${index % 2 === 0 ? userIds[1] : null}, ${timestamp})`;
      }
      for (const [createdAt, resolvedAt, status] of [
        ["2001-02-01T00:00:00Z", null, "pending"],
        ["2001-02-01T01:00:00Z", "2001-02-02T18:00:00Z", "approved"],
        ["2001-01-30T00:00:00Z", "2001-01-31T18:00:00Z", "rejected"],
        ["2001-01-30T01:00:00Z", "2001-01-30T01:00:00Z", "approved"],
        ["2001-02-03T00:00:00Z", null, "approved"],
      ] as const) {
        const [request] = await sql`INSERT INTO requests (user_id, entity_type, action, request_date, resolved_at, status)
          VALUES (${adminId}, 'words', 'create', ${createdAt}, ${resolvedAt}, ${status}) RETURNING id`;
        requestIds.push(request.id);
      }
      for (const [duration, timestamp] of [
        [10, "2001-02-01T00:00:00Z"], [20, "2001-02-01T01:00:00Z"], [1000, "2001-02-02T18:00:00Z"],
        [100, "2001-01-30T00:00:00Z"], [200, "2001-01-31T18:00:00Z"], [100000, "2001-02-03T00:00:00Z"],
      ] as const) {
        const id = randomUUID();
        sampleIds.push(id);
        await sql`INSERT INTO word_query_latencies (event_id, duration_ms, source, received_at) VALUES (${id}, ${duration}, 'online', ${timestamp})`;
      }

      const selection = { range: "custom", start: "2001-02-01", end: "2001-02-02" } as const;
      const full = await getDashboardOverview(database, selection);
      expect(full.periodMetrics.searches).toEqual({ current: 3, previous: 2, difference: 1, percentChange: 50 });
      expect(full.periodMetrics.newUsers).toMatchObject({ current: 2, previous: 1 });
      expect(full.periodMetrics.submittedRequests).toMatchObject({ current: 2, previous: 2 });
      expect(full.periodMetrics.resolvedRequests).toMatchObject({ current: 1, previous: 2 });
      expect(full.searchAnalytics.dailySearches).toEqual([{ date: "2001-02-01", count: 1 }, { date: "2001-02-02", count: 2 }]);
      expect(full.searchAnalytics.actorSplit).toEqual({ total: 3, authenticated: 2, anonymous: 1 });
      expect(full.searchAnalytics.topSearchedWords).toEqual([{ wordId, wordName: identity, count: 3 }]);
      const latency = await getWordQueryLatency(database, full.generatedAt, selection);
      expect(latency.window).toEqual(full.window);
      expect(latency.summary.sampleCount).toBe(3);
      expect(latency.summary.p95Ms).toBeCloseTo(902);
      expect(latency.previous).toMatchObject({ sampleCount: 2, averageMs: 150, p95Ms: 195 });
      expect(latency.summary.averageMs).toBeCloseTo(343.333333);
      // The whole-window p95 must not be an average of the two daily p95s.
      expect(latency.summary.p95Ms).not.toBeCloseTo((19.5 + 1000) / 2);
      const partialTime = new Date("2001-02-02T12:00:00Z");
      const partial = await getDashboardOverview(database, selection, partialTime);
      expect(partial.periodMetrics.searches).toMatchObject({ current: 1, previous: 1 });
      expect(partial.periodMetrics.resolvedRequests).toMatchObject({ current: 0, previous: 1 });
      const partialLatency = await getWordQueryLatency(database, partialTime, selection);
      expect(partialLatency.window).toEqual(partial.window);
      expect(partialLatency.summary).toMatchObject({ sampleCount: 2, averageMs: 15, p95Ms: 19.5 });
      expect(partialLatency.previous.sampleCount).toBe(1);

      await page.goto(customUrl);
      await expect(page.getByTestId("period-searches").locator("dd")).toHaveText("3");
      await expect(page.getByTestId("period-newUsers").locator("dd")).toHaveText("2");
      await expect(page.getByTestId("period-resolvedRequests").locator("dd")).toHaveText("1");
      await expect(page.getByRole("img", { name: copy.queryLatency.chartLabel, exact: true })).toBeVisible();
      await expect(page.getByText("902 ms", { exact: true })).toBeVisible();
      const details = page.locator("details").filter({ hasText: copy.queryLatency.viewData });
      await details.locator("summary").click();
      await expect(details.locator("tbody tr")).toHaveCount(2);
      await details.locator("summary").click();
      const filter = page.getByRole("region", { name: copy.range.title, exact: true });
      const choose = async (label: string) => {
        const trigger = filter.getByRole("button", { name: copy.range.period, exact: true });
        await trigger.scrollIntoViewIfNeeded();
        if (testInfo.project.name === "mobile") await trigger.tap();
        else await trigger.click();
        await page.getByRole("option", { name: label, exact: true }).click({ timeout: 10_000 });
      };
      const apply = () => filter.getByRole("button", { name: copy.range.apply, exact: true }).click();
      // The visible wrappers, trigger and submit button must share a 40px height.
      const sizes = await filter.locator('[data-slot="input-wrapper"], [data-slot="trigger"], button[type="submit"]').evaluateAll(elements => elements.map(element => element.getBoundingClientRect().height));
      expect(sizes).toHaveLength(4);
      expect(sizes.every(height => Math.abs(height - 40) < 1)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await filter.screenshot({ path: testInfo.outputPath("date-filters.png") });
      await page.screenshot({ path: testInfo.outputPath("dashboard-analytics.png"), fullPage: true });

      await choose(copy.range.last7Days); await apply();
      await expect(page).toHaveURL(`${path}?range=7d`);
      await expect(page.getByTestId("dashboard-window")).toContainText("UTC");
      await choose(copy.range.last90Days); await apply();
      await expect(page).toHaveURL(`${path}?range=90d`);
      await page.goBack();
      await expect(page).toHaveURL(`${path}?range=7d`);
      await expect(filter.getByRole("button", { name: copy.range.period, exact: true })).toContainText(copy.range.last7Days);
      await page.reload();
      await expect(filter.getByRole("button", { name: copy.range.period, exact: true })).toContainText(copy.range.last7Days);

      await page.goto(customUrl);
      await filter.getByLabel(copy.range.start, { exact: true }).fill("2001-02-04");
      await apply();
      await expect(filter.getByRole("alert")).toContainText(copy.range.errors.reversedRange);
      await expect(page).toHaveURL(customUrl);
      await filter.getByLabel(copy.range.start, { exact: true }).fill("2000-01-01");
      await apply();
      await expect(filter.getByRole("alert")).toContainText(copy.range.errors.rangeTooLong);

      await page.goto(`${path}?range=custom&start=1980-01-01&end=1980-01-01`);
      await expect(page.getByTestId("period-searches")).toContainText(copy.comparison.noActivity);
      await expect(page.getByText(copy.queryLatency.empty, { exact: true })).toBeVisible();
      await page.goto(`${path}?range=custom&start=2001-01-30&end=2001-01-30`);
      await expect(page.getByTestId("period-searches")).toContainText(copy.comparison.newActivity);
      await expect(page.getByText(copy.comparison.noBaseline, { exact: true })).toHaveCount(2);
      await page.goto(`${path}?range=custom&start=bad&end=2001-02-02`);
      await expect(filter.getByRole("alert")).toContainText(copy.range.errors.invalidRange);
      await expect(filter.getByRole("button", { name: copy.range.period, exact: true })).toContainText(copy.range.last30Days);
      expect(errors).toEqual([]);
    } finally {
      if (requestIds.length) await sql`DELETE FROM requests WHERE id IN ${sql(requestIds)}`;
      if (sampleIds.length) await sql`DELETE FROM word_query_latencies WHERE event_id IN ${sql(sampleIds)}`;
      if (wordId) await sql`DELETE FROM words WHERE id = ${wordId}`;
      if (userIds.length) await sql`DELETE FROM users WHERE id IN ${sql(userIds)}`;
      await sql`SELECT pg_advisory_unlock(20261015, 1)`;
      await sql.end({ timeout: 5 });
    }
  });
}
