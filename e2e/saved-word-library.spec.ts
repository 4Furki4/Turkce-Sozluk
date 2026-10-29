import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import postgres from "postgres";
import { ciEnvironment } from "../scripts/ci/env.mjs";
import trMessages from "../messages/tr.json";
import enMessages from "../messages/en.json";

for (const locale of ["tr", "en"] as const) {
  test(`${locale}: collections, scoped reviews, preview and Undo work together`, async ({ page }, testInfo) => {
    test.setTimeout(60_000);
    const messages = locale === "tr" ? trMessages : enMessages;
    const copy = messages.SavedWords.Library;
    const database = postgres(ciEnvironment().DATABASE_URL, { max: 1 });
    const identity = `library_${randomUUID().replaceAll("-", "")}`;
    const libraryPath = locale === "tr" ? "/tr/kaydedilen-kelimeler" : "/en/saved-words";
    const collectionName = locale === "tr" ? "Kitaplardan kelimeler" : "Words from books";
    const ip = `10.62.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    let userId: string | undefined;
    let extraWordId: number | undefined;
    await page.route(/^https:\/\//, route => route.abort());
    await page.context().setExtraHTTPHeaders({ "x-forwarded-for": ip });
    await page.emulateMedia({ reducedMotion: "reduce", colorScheme: locale === "tr" ? "dark" : "light" });

    try {
      const signup = await page.request.post("/api/auth/sign-up/email", {
        maxRetries: 2,
        headers: { origin: "http://localhost:3100", "x-forwarded-for": ip },
        data: { email: `${identity}@example.invalid`, name: "Library Test", username: identity, password: "ci-only-library-test-password" },
      });
      expect(signup.ok(), await signup.text()).toBe(true);
      userId = (await signup.json()).user.id;
      const [book] = await database`SELECT w.id, m.id AS meaning_id FROM words w JOIN meanings m ON m.word_id=w.id WHERE w.name='kitap' ORDER BY m."order", m.id LIMIT 1`;
      expect(book).toBeDefined();
      const [extra] = await database`INSERT INTO words (name,variant) VALUES (${`tefekkür-${identity}`},0) RETURNING id`;
      extraWordId = extra!.id;
      const [extraMeaning] = await database`INSERT INTO meanings (word_id,meaning,"order") VALUES (${extraWordId!},'Bir konu üzerinde derin düşünme.',1) RETURNING id`;
      const originalDate = "2026-10-05T10:11:12.123456Z";
      // Cast through text so postgres-js's default Date serializer cannot round
      // the test fixture to milliseconds before Undo is exercised.
      await database`INSERT INTO saved_words (user_id,word_id,"createdAt") VALUES (${userId!},${book!.id},${originalDate}::text::timestamptz),(${userId!},${extraWordId!},now())`;
      for (const meaningId of [book!.meaning_id, extraMeaning!.id]) {
        await database`INSERT INTO flashcard_review_states (user_id,meaning_id,direction,due_at,last_reviewed_at)
          VALUES (${userId!},${meaningId},'word',now()-interval '1 hour',now()-interval '1 day')`;
      }

      await page.goto(libraryPath);
      await expect(page.getByRole("heading", { name: copy.title, exact: true })).toBeVisible();
      await expect(page.locator("[data-library-ready]")).toHaveAttribute("data-library-ready", "true");
      expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe("auto");
      if (testInfo.project.name === "desktop") {
        const searchBox = await page.getByRole("searchbox", { name: copy.searchLabel, exact: true }).evaluate(input => {
          const rectangle = input.closest('[data-slot="input-wrapper"]')!.getBoundingClientRect();
          return { y: rectangle.y, height: rectangle.height };
        });
        const sortBox = (await page.getByRole("button", { name: new RegExp(copy.sortLabel) }).boundingBox())!;
        expect(searchBox.height).toBe(48);
        expect(sortBox.height).toBe(48);
        expect(Math.abs(searchBox.y - sortBox.y)).toBeLessThan(1);
      }
      const previewName = copy.previewWord.replace("{word}", "kitap");
      await expect(page.getByRole("button", { name: previewName, exact: true })).toBeVisible();
      await page.getByRole("button", { name: copy.newCollection, exact: true }).click();
      await page.getByRole("textbox", { name: new RegExp(`^${copy.collectionName}`) }).fill(collectionName);
      await page.getByRole("button", { name: copy.saveCollection, exact: true }).click();
      await expect.poll(async () => (await database`SELECT id FROM saved_word_collections WHERE user_id=${userId!} AND name=${collectionName}`).length).toBe(1);
      const [collection] = await database`SELECT id FROM saved_word_collections WHERE user_id=${userId!} AND name=${collectionName}`;

      await page.getByRole("button", { name: copy.allWords, exact: true }).click();
      await page.getByRole("button", { name: copy.selectWords, exact: true }).click();
      await page.getByRole("checkbox", { name: copy.selectWord.replace("{word}", "kitap"), exact: true }).check();
      await page.getByRole("button", { name: new RegExp(copy.targetCollection) }).click();
      await page.getByRole("option", { name: collectionName, exact: true }).click();
      await page.getByRole("button", { name: copy.addToCollection, exact: true }).click();
      await expect.poll(async () => (await database`SELECT word_id FROM saved_word_collection_members WHERE collection_id=${collection!.id}`).length).toBe(1);
      const finishSelection = page.getByRole("button", { name: copy.finishSelection, exact: true });
      if (await finishSelection.isVisible()) await finishSelection.click();
      await page.getByRole("button", { name: new RegExp(`^${collectionName}`) }).click();
      await expect(page.getByRole("button", { name: previewName, exact: true })).toBeVisible();
      if (testInfo.project.name === "desktop") {
        await expect(page.getByRole("link", { name: new RegExp(messages.Navbar.ariaLanguages) }))
          .toHaveAttribute("href", new RegExp(`collectionId=${collection!.id}`));
      }
      await expect(page.getByRole("button", { name: copy.previewWord.replace("{word}", `tefekkür-${identity}`), exact: true })).toHaveCount(0);

      await page.getByRole("button", { name: previewName, exact: true }).click();
      const detail = testInfo.project.name === "mobile"
        ? page.getByRole("dialog")
        : page.getByRole("complementary", { name: copy.previewTitle, exact: true });
      await expect(detail.getByRole("link", { name: copy.fullEntry, exact: true })).toBeVisible();
      if (testInfo.project.name === "desktop") {
        const row = (await page.getByRole("button", { name: previewName, exact: true }).boundingBox())!;
        const panel = (await detail.boundingBox())!;
        expect(panel.x).toBeGreaterThan(row.x + row.width);
      }
      if (testInfo.project.name === "mobile") {
        await page.keyboard.press("Escape");
        await expect(page.getByRole("button", { name: previewName, exact: true })).toBeFocused();
      }
      await expect(page.getByRole("button", { name: new RegExp(copy.wordsPerPage) })).toBeVisible();
      const pageSizeLabel = (await page.getByText(copy.perPage, { exact: true }).boundingBox())!;
      const libraryRow = (await page.getByRole("button", { name: previewName, exact: true }).locator("..").boundingBox())!;
      expect(pageSizeLabel.y).toBeGreaterThanOrEqual(libraryRow.y + libraryRow.height);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath("library.png"), fullPage: true });

      const practice = page.getByRole("link", { name: copy.practiceCollection, exact: true });
      await expect(practice).toHaveAttribute("href", new RegExp(`collectionId=${collection!.id}`));
      const playScripts = /\/_next\/static\/chunks\/app\/play\/.*\.js(?:\?.*)?$/;
      let releasePlayScripts!: () => void;
      const playScriptsReleased = new Promise<void>(resolve => { releasePlayScripts = resolve; });
      await page.route(playScripts, async route => { await playScriptsReleased; await route.continue(); });
      try {
        await practice.click({ noWaitAfter: true });
        await expect(page.locator("[data-practice-ready]")).toHaveAttribute("data-practice-ready", "false");
        await expect(page.getByRole("button", { name: messages.Play.flashcards.reviewDue.replace("{count}", "1"), exact: true })).toBeDisabled();
      } finally { releasePlayScripts(); }
      await expect(page.locator("[data-practice-ready]")).toHaveAttribute("data-practice-ready", "true");
      await page.unroute(playScripts);
      await expect(page).toHaveURL(new RegExp(`source=saved.*collectionId=${collection!.id}`));
      await expect(page.getByText(messages.Play.flashcards.collectionScope.replace("{name}", collectionName), { exact: true })).toBeVisible();
      await page.getByRole("button", { name: messages.Play.flashcards.reviewDue.replace("{count}", "1"), exact: true }).click();
      const card = page.locator("button[data-flashcard-trigger]");
      await expect(card).toContainText("kitap");
      await card.click();
      await page.getByRole("button", { name: messages.Play.flashcards.ratingGood, exact: true }).click();
      await expect(page.getByRole("heading", { name: messages.Play.flashcards.dueQueueCompleteTitle, exact: true })).toBeVisible();
      const [stillDue] = await database`SELECT count(*)::int AS count FROM flashcard_review_states WHERE user_id=${userId!} AND due_at<=now()`;
      expect(stillDue!.count).toBe(1);
      await page.getByRole("link", { name: messages.Play.flashcards.backToSavedWords, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`collectionId=${collection!.id}`));
      await expect(page.locator("[data-library-ready]")).toHaveAttribute("data-library-ready", "true");
      if (testInfo.project.name === "desktop") {
        // The preview placeholder is mounted after the client media-query
        // effect; waiting for it avoids clicking server HTML before hydration.
        await expect(page.getByRole("complementary", { name: copy.previewTitle, exact: true }).getByText(copy.previewHint, { exact: true })).toBeVisible();
      }

      await page.getByRole("button", { name: copy.unsaveWord.replace("{word}", "kitap"), exact: true }).click();
      await expect(page.getByRole("heading", { name: copy.emptyCollectionTitle, exact: true })).toBeVisible();
      await page.getByRole("button", { name: copy.undo, exact: true }).click();
      await expect(page.getByRole("button", { name: previewName, exact: true })).toBeVisible();
      const [saved] = await database`SELECT "createdAt"::text AS saved_at FROM saved_words WHERE user_id=${userId!} AND word_id=${book!.id}`;
      expect(saved!.saved_at).toBe("2026-10-05 10:11:12.123456+00");

      await page.getByRole("button", { name: copy.selectWords, exact: true }).click();
      await page.getByRole("checkbox", { name: copy.selectWord.replace("{word}", "kitap"), exact: true }).check();
      await page.getByRole("button", { name: copy.removeFromCollection, exact: true }).click();
      await expect(page.getByRole("heading", { name: copy.emptyCollectionTitle, exact: true })).toBeVisible();
      await page.getByRole("button", { name: copy.finishSelection, exact: true }).click();
      await expect(page.getByRole("button", { name: copy.selectWords, exact: true })).toBeDisabled();
      const [savedCount] = await database`SELECT count(*)::int AS count FROM saved_words WHERE user_id=${userId!} AND word_id=${book!.id}`;
      expect(savedCount!.count).toBe(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

      const longName = (locale === "tr" ? "Ç" : "W").repeat(80);
      await page.getByRole("button", { name: copy.renameCollection, exact: true }).click();
      await page.getByRole("textbox", { name: new RegExp(`^${copy.collectionName}`) }).fill(longName);
      await page.getByRole("button", { name: copy.saveCollection, exact: true }).click();
      await expect(page.getByRole("button", { name: longName, exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath("collection-long-name.png"), fullPage: true });
      await page.getByRole("button", { name: copy.deleteCollection, exact: true }).click();
      await expect(page.getByText(copy.deleteCollectionHint, { exact: true })).toBeVisible();
      await page.getByRole("button", { name: copy.confirmDelete, exact: true }).click();
      await expect(page.getByRole("button", { name: copy.allWords, exact: true })).toHaveAttribute("aria-pressed", "true");
      await expect(page.getByRole("button", { name: previewName, exact: true })).toBeVisible();
    } finally {
      if (userId) await database`DELETE FROM users WHERE id=${userId}`;
      if (extraWordId) await database`DELETE FROM words WHERE id=${extraWordId}`;
      await database.end({ timeout: 5 });
    }
  });
}
