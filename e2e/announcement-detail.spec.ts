import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import postgres from "postgres";
import { ciEnvironment } from "../scripts/ci/env.mjs";

const turkish = {
  title: "Sözlük duyurusu",
  body: "Bu duyuru derlemeden sonra yayımlandı.",
};

const english = {
  title: "Dictionary announcement",
  body: "This announcement was published after the build.",
};

test("announcements published after the build open in both languages", async ({ page, request }) => {
  const slug = `ci-announcement-${randomUUID()}`;
  const sql = postgres(ciEnvironment().DATABASE_URL, { max: 1 });

  try {
    await sql.begin(async tx => {
      const [announcement] = await tx<{ id: number }[]>`
        INSERT INTO announcements (slug, status, published_at)
        VALUES (${slug}, 'published', now())
        RETURNING id
      `;
      await tx`
        INSERT INTO announcement_translations (announcement_id, locale, title, content)
        VALUES
          (${announcement!.id}, 'tr', ${turkish.title}, ${turkish.body}),
          (${announcement!.id}, 'en', ${english.title}, ${english.body})
      `;
    });

    await page.route(/^https:\/\//, route => route.abort());
    for (const { path, title, body } of [
      { path: "/tr/duyurular", ...turkish },
      { path: "/en/announcements", ...english },
    ]) {
      const response = await page.goto(`${path}/${slug}`);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
      await expect(page.getByText(body, { exact: true })).toBeVisible();
      await expect(page).toHaveTitle(new RegExp(title));
    }

    // An HTML-only crawler waits for the not-found status before streaming starts.
    const missing = await request.get(`/tr/duyurular/${slug}-missing`, {
      headers: { "user-agent": "Twitterbot" },
    });
    expect(missing.status()).toBe(404);
  } finally {
    try {
      await sql`DELETE FROM announcements WHERE slug = ${slug}`;
    } finally {
      await sql.end({ timeout: 5 });
    }
  }
});
