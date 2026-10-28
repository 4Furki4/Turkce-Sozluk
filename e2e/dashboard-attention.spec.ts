import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { ciEnvironment } from "../scripts/ci/env.mjs";
import { getDashboardAttention } from "../src/server/dashboard-attention";
import enMessages from "../messages/en.json";
import trMessages from "../messages/tr.json";

const DAY_IN_MS = 86_400_000;

for (const locale of ["tr", "en"] as const) {
  test(`${locale}: attention queues select waiting work and open the exact localized review screen`, async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    // Fixed disposable CI DB only. Serialize fixtures across browser projects.
    const sql = postgres(ciEnvironment().DATABASE_URL, { max: 1 });
    await sql`SELECT pg_advisory_lock(20261015, 1)`;
    const database = drizzle(sql);
    const requestIds: number[] = [];
    const feedbackIds: number[] = [];
    const messages = locale === "tr" ? trMessages : enMessages;
    const copy = messages.Dashboard.overview.attention;
    let userId: string | undefined;
    await page.route(/^https:\/\//, route => route.abort());
    await page.context().setExtraHTTPHeaders({ "x-forwarded-for": `10.53.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}` });
    try {
      const anonymous = await page.request.get("/api/trpc/admin.overview.getNeedsAttention");
      expect(anonymous.status()).toBe(401);
      const identity = `attention_${randomUUID().replaceAll("-", "")}`;
      const email = `${identity}@example.invalid`;
      const password = "ci-only-attention-test-password";
      const signup = await page.request.post("/api/auth/sign-up/email", {
        maxRetries: 2,
        headers: { origin: "http://localhost:3100" },
        data: { email, name: "Attention Test", username: identity, password },
      });
      expect(signup.ok(), await signup.text()).toBe(true);
      userId = (await signup.json()).user.id;
      await sql`UPDATE users SET role = 'admin' WHERE id = ${userId!}`;
      await page.request.post("/api/auth/sign-out", { headers: { origin: "http://localhost:3100" } });
      const signin = await page.request.post("/api/auth/sign-in/email", {
        headers: { origin: "http://localhost:3100" }, data: { email, password },
      });
      expect(signin.ok()).toBe(true);

      const now = new Date();
      const baseline = await getDashboardAttention(database, now);
      const oldest = new Date(Math.min(now.getTime() - 9 * DAY_IN_MS,
        ...baseline.requests.items.map(item => item.createdAt.getTime()),
        ...baseline.feedback.items.map(item => item.createdAt.getTime())) - DAY_IN_MS);
      const cutoff = now.getTime() - 7 * DAY_IN_MS;
      const longTitle = `Uzun bir geri bildirim başlığı / A long feedback title ${"ğüşiöç".repeat(20)}`;
      for (let index = 0; index < 9; index++) {
        const createdAt = index < 6 || index === 8 ? oldest : new Date(cutoff + (index === 7 ? 1 : 0));
        const [request] = await sql`INSERT INTO requests (user_id, entity_type, action, new_data, request_date, status)
          VALUES (${userId!}, 'words', 'create', '{"name":"attention fixture"}', ${createdAt.toISOString()}, ${index === 8 ? "approved" : "pending"}) RETURNING id`;
        requestIds.push(request.id);
        const [feedback] = await sql`INSERT INTO feedbacks (user_id, title, description, type, status, created_at)
          VALUES (${userId!}, ${index === 0 ? longTitle : `Attention fixture ${index}`}, 'CI-only feedback', 'bug', ${index === 8 ? "closed" : "open"}, ${createdAt.toISOString()}) RETURNING id`;
        feedbackIds.push(feedback.id);
      }

      // Exercise real SQL with a fixed response time, including the exact cutoff.
      const attention = await getDashboardAttention(database, now);
      expect(attention.requests.total).toBe(baseline.requests.total + 8);
      expect(attention.feedback.total).toBe(baseline.feedback.total + 8);
      expect(attention.requests.aging).toBe(baseline.requests.aging + 7);
      expect(attention.feedback.aging).toBe(baseline.feedback.aging + 7);
      expect(attention.requests.items.map(item => item.id)).toEqual(requestIds.slice(0, 5));
      expect(attention.feedback.items.map(item => item.id)).toEqual(feedbackIds.slice(0, 5));

      const dashboardPath = locale === "tr" ? "/tr/panel" : "/en/dashboard";
      await page.goto(dashboardPath);
      const section = page.getByRole("region", { name: copy.title, exact: true });
      const requestLinks = section.locator('a[href*="/requests/"] , a[href*="/istekler/"]');
      const feedbackLinks = section.locator('a[href*="feedbackId="]');
      await expect(requestLinks).toHaveCount(5);
      await expect(feedbackLinks).toHaveCount(5);
      await expect(feedbackLinks.first()).toContainText(longTitle);
      const requestPath = locale === "tr" ? `/tr/panel/istekler/${requestIds[0]}` : `/en/dashboard/requests/${requestIds[0]}`;
      await expect(requestLinks.first()).toHaveAttribute("href", requestPath);
      const feedbackPath = locale === "tr" ? "/tr/panel/geri-bildirim" : "/en/dashboard/feedback";
      await expect(feedbackLinks.first()).toHaveAttribute("href", `${feedbackPath}?feedbackId=${feedbackIds[0]}`);
      await requestLinks.first().focus();
      await expect(requestLinks.first()).toBeFocused();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await section.screenshot({ path: testInfo.outputPath("needs-attention.png") });
      await page.screenshot({ path: testInfo.outputPath("dashboard.png"), fullPage: true });

      await requestLinks.first().press("Enter");
      await expect(page).toHaveURL(requestPath);
      await page.goto(dashboardPath);
      await section.locator('a[href*="feedbackId="]').first().click();
      await expect(page).toHaveURL(`${feedbackPath}?feedbackId=${feedbackIds[0]}`);
      await expect(page.getByRole("gridcell", { name: longTitle, exact: true })).toBeVisible();
      await expect(page.getByRole("gridcell", { name: "Attention fixture 1", exact: true })).toHaveCount(0);
      // A stale dashboard link must still locate an item after resolution.
      await sql`UPDATE feedbacks SET status = 'fixed' WHERE id = ${feedbackIds[0]}`;
      await page.reload();
      await expect(page.getByRole("gridcell", { name: longTitle, exact: true })).toBeVisible();
      await expect(page.getByRole("gridcell", { name: messages.Dashboard.feedback.statuses.fixed, exact: true })).toBeVisible();
      await page.getByRole("link", { name: messages.Dashboard.feedback.showAllFeedback, exact: true }).click();
      await expect(page).toHaveURL(feedbackPath);
      await page.goBack();
      await expect(page).toHaveURL(`${feedbackPath}?feedbackId=${feedbackIds[0]}`);
      await expect(page.getByRole("gridcell", { name: longTitle, exact: true })).toBeVisible();
      await sql`DELETE FROM feedbacks WHERE id = ${feedbackIds[0]}`;
      await page.reload();
      await expect(page.getByText(messages.Dashboard.feedback.table.empty, { exact: true })).toBeVisible();
    } finally {
      if (requestIds.length) await sql`DELETE FROM requests WHERE id IN ${sql(requestIds)}`;
      if (feedbackIds.length) await sql`DELETE FROM feedbacks WHERE id IN ${sql(feedbackIds)}`;
      if (userId) await sql`DELETE FROM users WHERE id = ${userId}`;
      await sql`SELECT pg_advisory_unlock(20261015, 1)`;
      await sql.end({ timeout: 5 });
    }
  });
}
