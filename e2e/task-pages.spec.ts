import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { ciEnvironment } from "../scripts/ci/env.mjs";
import { taskPathnames } from "../src/i18n/task-pathnames";
import en from "../messages/en.json";
import tr from "../messages/tr.json";

let database: ReturnType<typeof postgres>;
const db = {
  async query(statement: string, parameters: (string | number)[] = []) {
    return { rows: Array.from(await database.unsafe(statement, parameters)) };
  },
};
let wordId: number;
let meaningId: number;
let otherMeaningId: number;
let otherWordId: number;
let dailyId: number;
let correctionId: number;
let galatiId: number;
let replacementWordId: number;
let replacementName: string;
let attributeId: number;
let attributeLabel: string;
let wordName: string;
let userId: string;
let cookies: Awaited<ReturnType<APIRequestContext["storageState"]>>["cookies"];

test.beforeAll(async ({ playwright }, worker) => {
  database = postgres(ciEnvironment().DATABASE_URL, { max: 1 });
  const workerIndex = worker.workerIndex;
  const identity = `task_${randomUUID().replaceAll("-", "")}`;
  const api = await playwright.request.newContext({
    baseURL: "http://localhost:3100",
    extraHTTPHeaders: {
      "x-forwarded-for": `10.91.${workerIndex % 255}.${Math.floor(Math.random() * 200) + 1}`,
    },
  });
  const response = await api.post("/api/auth/sign-up/email", {
    headers: { origin: "http://localhost:3100" },
    data: {
      email: `${identity}@example.invalid`,
      name: "Task Page Test",
      username: identity,
      password: "ci-only-task-test-password",
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
  userId = (await response.json()).user.id;
  await db.query("UPDATE users SET role='admin' WHERE id=$1", [userId]);
  await api.post("/api/auth/sign-out", {
    headers: { origin: "http://localhost:3100" },
  });
  const signin = await api.post("/api/auth/sign-in/email", {
    headers: { origin: "http://localhost:3100" },
    data: {
      email: `${identity}@example.invalid`,
      password: "ci-only-task-test-password",
    },
  });
  expect(signin.ok(), await signin.text()).toBe(true);
  cookies = (await api.storageState()).cookies;
  await api.dispose();
  // Keep stable menu rows until the disposable database is reset; other suites
  // create and delete their own temporary accounts while this list is open.
  for (let index = 0; index < 5; index++) {
    const id = `0000-task_${identity}_${index}`;
    await db.query("INSERT INTO users(id,email,name,role) VALUES($1,$2,$3,'user')", [id, `${id}@example.invalid`, "Task Menu Fixture"]);
  }
  attributeLabel = `Attribute ${identity}`;
  attributeId = (
    await db.query(
      "INSERT INTO word_attributes(attribute) VALUES($1) RETURNING id",
      [attributeLabel],
    )
  ).rows[0].id;
  wordName = `görev_${identity}`;
  wordId = (
    await db.query(
      "INSERT INTO words(name,variant) VALUES($1,0) RETURNING id",
      [wordName],
    )
  ).rows[0].id;
  otherWordId = (
    await db.query(
      "INSERT INTO words(name,variant) VALUES($1,1) RETURNING id",
      [wordName],
    )
  ).rows[0].id;
  meaningId = (
    await db.query(
      'INSERT INTO meanings(word_id,meaning,"order") VALUES($1,$2,1) RETURNING id',
      [wordId, "Bir görev sayfasını doğrulayan açıklama."],
    )
  ).rows[0].id;
  otherMeaningId = (
    await db.query(
      'INSERT INTO meanings(word_id,meaning,"order") VALUES($1,$2,1) RETURNING id',
      [otherWordId, "Aynı yazılışın farklı kimlikli anlamı."],
    )
  ).rows[0].id;
  replacementName = `replacement_${identity}`;
  replacementWordId = (await db.query("INSERT INTO words(name,variant) VALUES($1,0) RETURNING id", [replacementName])).rows[0].id;
  correctionId = (await db.query("INSERT INTO misspellings(correct_word_id,incorrect_spelling) VALUES($1,$2) RETURNING id", [wordId, `wrong_${identity}`])).rows[0].id;
  galatiId = (await db.query("INSERT INTO galatimeshur(word_id,explanation,correct_usage) VALUES($1,$2,$3) RETURNING id", [wordId, "Test explanation", "Test usage"])).rows[0].id;
  for (let index = 1; index <= 31; index++) {
    const date = `${2200 + workerIndex}-01-${String(index).padStart(2, "0")}`;
    const row = await db.query(
      "INSERT INTO daily_words(word_id,date) VALUES($1,$2) ON CONFLICT(date) DO UPDATE SET word_id=EXCLUDED.word_id RETURNING id",
      [wordId, date],
    );
    if (index === 1) dailyId = row.rows[0].id;
  }
});
test.afterAll(async () => {
  await database?.end({ timeout: 5 });
});

test.beforeEach(async ({ page, context }) => {
  // Isolate browser journeys from Better Auth's shared per-IP request window.
  await context.setExtraHTTPHeaders({
    "x-forwarded-for": `10.92.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 254) + 1}`,
  });
  await context.addCookies(cookies);
  // Third-party captcha is a boundary fixture; app routes, auth, and DB are real.
  await context.route(/^https:\/\//, async (route) => {
    const url = new URL(route.request().url());
    if (
      url.hostname === "www.google.com" &&
      url.pathname === "/recaptcha/api.js"
    ) {
      const callback = JSON.stringify(url.searchParams.get("onload"));
      await route.fulfill({
        contentType: "application/javascript",
        body: `window.grecaptcha={ready:f=>f(),render:()=>0,execute:(_,{action})=>Promise.resolve('ci-modal-qa-'+action)}; if (${callback}) window[${callback}]?.();`,
      });
    } else await route.abort();
  });
  page.on("dialog", (dialog) => dialog.accept());
});

for (const locale of ["en", "tr"] as const) {
  const messages = locale === "en" ? en : tr;
  const daily = `/${locale}/${locale === "en" ? "dashboard/daily-words" : "panel/gundelik-kelimeler"}`;
  const contribution = `/${locale}/${locale === "en" ? "contribute-word" : "kelime-katkisi"}`;
  const editSuffix = locale === "en" ? "edit" : "duzenle";

  test(`${locale}: dashboard search retains fast typing during delayed route transitions`, async ({ page }) => {
    await page.route(url => url.searchParams.has("_rsc"), async route => {
      await new Promise(resolve => setTimeout(resolve, 300));
      await route.continue();
    });
    const lists = [
      { path: locale === "en" ? "dashboard/word-list" : "panel/kelimeler", label: messages.SearchWord },
      { path: locale === "en" ? "dashboard/dynamic-parameters/authors" : "panel/dinamik-parametreler/yazarlar", label: messages.TaskPage.search },
    ];
    for (const list of lists) {
      await page.goto(`/${locale}/${list.path}`);
      const search = page.locator("main").getByPlaceholder(list.label, { exact: true });
      await search.pressSequentially("kitap", { delay: 20 });
      await expect(search).toHaveValue("kitap");
      await page.reload();
      await expect(page.locator("main").getByPlaceholder(list.label, { exact: true })).toHaveValue("kitap");
    }
  });

  test(`${locale}: choosing a pronunciation word opens the recorder without a discard prompt`, async ({ page }) => {
    const chooser = `/${locale}/${locale === "en" ? "pronunciation-voting/new" : "telaffuz-oylama/yeni"}`;
    await page.goto(chooser);
    const input = page.getByRole("combobox", { name: messages.TaskPage.word, exact: true });
    await input.fill(wordName.slice(0, -6));
    await page.getByRole("option", { name: wordName, exact: true }).first().click();
    await input.press("Tab");
    await expect(input).toHaveValue(wordName);
    await input.fill(replacementName.slice(0, -6));
    await expect(page.locator('main a[id^="task-link-"]')).toHaveCount(0);
    await page.getByRole("option", { name: replacementName, exact: true }).click();
    await input.press("Tab");
    await expect(input).toHaveValue(replacementName);
    await page.getByRole("link", { name: messages.TaskPage.pronunciation, exact: true }).last().click();
    await expect(page).toHaveURL(new RegExp(`${contribution}/\\d+/${locale === "en" ? "pronunciations/new" : "telaffuzlar/yeni"}\\?`));
    await expect(page.getByRole("button", { name: messages.TaskPage.discard, exact: true })).toHaveCount(0);
    await expect(page.locator("[data-task-back]")).toHaveAttribute("href", chooser);
  });

  for (const family of ["daily-words", "misspellings", "galatimeshur"] as const) {
    test(`${locale}: ${family} saves only the word explicitly selected in the picker`, async ({ page }) => {
      const config = family === "daily-words"
        ? { id: dailyId, path: locale === "en" ? "dashboard/daily-words" : "panel/gundelik-kelimeler", label: messages.Dashboard.DailyWords.word, save: messages.Dashboard.DailyWords.save, required: messages.Dashboard.DailyWords.required, table: "daily_words", column: "word_id" }
        : family === "misspellings"
          ? { id: correctionId, path: locale === "en" ? "dashboard/misspellings" : "panel/yazim-yanlislari", label: messages.Dashboard.Misspellings.correctWordLabel, save: messages.Dashboard.Misspellings.save, required: messages.Dashboard.Misspellings.toasts.fillAllFields, table: "misspellings", column: "correct_word_id" }
          : { id: galatiId, path: locale === "en" ? "dashboard/galatimeshur" : "panel/galatimeshur", label: messages.Dashboard.GalatiMeshur.wordLabel, save: messages.Dashboard.GalatiMeshur.save, required: messages.Dashboard.GalatiMeshur.toasts.fillAllFields, table: "galatimeshur", column: "word_id" };
      const mutations: string[] = [];
      page.on("request", request => {
        if (request.method() === "POST" && request.url().includes("admin.")) mutations.push(request.url());
      });
      await page.goto(`/${locale}/${config.path}/${config.id}/${editSuffix}`);
      const input = page.getByRole("combobox", { name: config.label + "*", exact: true });
      await expect(input).toHaveValue(wordName);
      await input.fill(replacementName + " absent");
      await input.press("Tab");
      await page.getByRole("button", { name: config.save, exact: true }).click();
      await expect(page.getByText(config.required, { exact: true })).toBeVisible();
      expect(mutations).toHaveLength(0);
      await input.fill(replacementName.slice(0, -6));
      await page.getByRole("option", { name: replacementName, exact: true }).click();
      await input.press("Tab");
      await expect(input).toHaveValue(replacementName);
      await page.getByRole("button", { name: config.save, exact: true }).click();
      await expect.poll(async () => (await db.query(`SELECT ${config.column} AS id FROM ${config.table} WHERE id=$1`, [config.id])).rows[0]?.id).toBe(replacementWordId);
      expect(mutations).toHaveLength(1);
      await db.query(`UPDATE ${config.table} SET ${config.column}=$1 WHERE id=$2`, [wordId, config.id]);
    });
  }

  test(`${locale}: independent daily edit saves durably and retains its source page`, async ({
    page,
  }) => {
    const source = `${daily}?page=2`;
    await page.goto(source);
    await expect(
      page.getByRole("heading", {
        name: messages.Dashboard.DailyWords.title,
        exact: true,
      }),
    ).toBeVisible();
    await page.goto(
      `${daily}/${dailyId}/${editSuffix}?${new URLSearchParams({ returnTo: source })}`,
    );
    await expect(page.locator("input[type=date]")).toHaveValue(/\d{4}-01-01/);
    const date = new Date(Date.UTC(2300, 0, 1) + wordId * 86400000)
      .toISOString()
      .slice(0, 10);
    await page.locator("input[type=date]").fill(date);
    await page
      .getByRole("button", {
        name: messages.Dashboard.DailyWords.save,
        exact: true,
      })
      .click();
    await expect(page).toHaveURL(source);
    expect(
      (
        await db.query("SELECT date::text FROM daily_words WHERE id=$1", [
          dailyId,
        ])
      ).rows[0].date,
    ).toBe(date);
    expect(await page.locator('[role="dialog"]').count()).toBe(0);
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe(
      "hidden",
    );
  });

  test(`${locale}: text drafts survive refresh and Cancel offers an inline discard`, async ({
    page,
  }) => {
    const source = `${daily}?page=2`;
    await page.goto(
      `${daily}/${dailyId}/${editSuffix}?${new URLSearchParams({ returnTo: source })}`,
    );
    const date = `${2450 + test.info().workerIndex}-08-10`;
    await page.locator("input[type=date]").fill(date);
    await page.reload();
    await page
      .getByRole("button", {
        name: messages.TaskPage.restoreDraft,
        exact: true,
      })
      .click();
    await expect(page.locator("input[type=date]")).toHaveValue(date);
    await page
      .getByRole("button", {
        name: messages.Dashboard.DailyWords.cancel,
        exact: true,
      })
      .click();
    await expect(page.locator("main [role=alert]")).toContainText(
      messages.TaskPage.leave,
    );
    await page
      .getByRole("button", { name: messages.TaskPage.discard, exact: true })
      .click();
    await expect(page).toHaveURL(source);
  });

  test(`${locale}: word contribution is moderated and never changes its homonym directly`, async ({
    page,
  }) => {
    const source = `/${locale}/${locale === "en" ? "search" : "arama"}/${encodeURIComponent(wordName)}`;
    await page.goto(
      `${contribution}/${wordId}/${editSuffix}?${new URLSearchParams({ returnTo: source })}`,
    );
    await expect(page.locator('input[name="name"]')).toHaveValue(wordName);
    const proposed = `${wordName}_öneri_${locale}`;
    await page.locator('input[name="name"]').fill(proposed);
    await page
      .locator('textarea[name="reason"]')
      .fill("Bu önerinin gerekçesini açıkça açıklıyoruz.");
    await page
      .getByRole("button", {
        name: messages.Requests.SubmitRequest,
        exact: true,
      })
      .click();
    const chooser = `${contribution}/${wordId}?${new URLSearchParams({ returnTo: source })}`;
    await expect(page).toHaveURL(chooser);
    const result = await db.query(
      "SELECT status,new_data FROM requests WHERE user_id=$1 AND entity_type='words' AND entity_id=$2 AND action='update' ORDER BY id DESC LIMIT 1",
      [userId, wordId],
    );
    expect(result.rows[0].status).toBe("pending");
    expect(JSON.parse(result.rows[0].new_data)).toMatchObject({
      wordName: proposed,
    });
    expect(
      (
        await db.query("SELECT name FROM words WHERE id IN ($1,$2)", [
          wordId,
          otherWordId,
        ])
      ).rows.every((row) => row.name === wordName),
    ).toBe(true);
  });

  test(`${locale}: wrong parent-child IDs show a navigable missing state`, async ({
    page,
  }) => {
    const meanings = locale === "en" ? "meanings" : "anlamlar";
    await page.goto(
      `${contribution}/${wordId}/${meanings}/${otherMeaningId}/${editSuffix}`,
    );
    await expect(page.locator("main [role=alert]")).toContainText(
      messages.TaskPage.missing,
    );
    await expect(
      page.getByRole("navigation", { name: messages.TaskPage.breadcrumbs }),
    ).toBeVisible();
    await page.goto(
      `${contribution}/${wordId}/${meanings}/${meaningId}/${editSuffix}`,
    );
    await expect(page.locator('textarea[name="meaning"]')).toHaveValue(
      "Bir görev sayfasını doğrulayan açıklama.",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });

  test(`${locale}: restored word attributes match the visible selection`, async ({
    page,
  }) => {
    const task = `/${locale}${taskPathnames["/dashboard/word-list/[wordId]/edit"][locale].replace("[wordId]", String(wordId))}`;
    await page.goto(task);
    const attributes = page.locator('main select[name="attributes"]');
    await expect(
      attributes.locator(`option[value="${attributeId}"]`),
    ).toHaveCount(1);
    await attributes.selectOption([String(attributeId)], { force: true });
    await expect(
      page
        .locator('main [data-slot="value"]')
        .filter({ hasText: attributeLabel }),
    ).toBeVisible();
    await page.reload();
    await page
      .getByRole("button", {
        name: messages.TaskPage.restoreDraft,
        exact: true,
      })
      .click();
    await expect(
      page
        .locator('main [data-slot="value"]')
        .filter({ hasText: attributeLabel }),
    ).toBeVisible();
  });

  test(`${locale}: changing contribution mode guards unsaved work`, async ({
    page,
  }) => {
    await page.goto(`${contribution}?word=deneme`);
    await page.locator('main input[name="name"]').fill("Taslak denemesi");
    await page
      .getByRole("tab", {
        name: messages.ContributeWord.simpleTab,
        exact: true,
      })
      .click();
    await expect(page.locator("main [role=alert]")).toContainText(
      messages.TaskPage.leave,
    );
    await page
      .getByRole("button", { name: messages.TaskPage.keepEditing, exact: true })
      .click();
    await expect(page.locator('main input[name="name"]')).toHaveValue(
      "Taslak denemesi",
    );
    await page
      .getByRole("tab", {
        name: messages.ContributeWord.simpleTab,
        exact: true,
      })
      .click();
    await page
      .getByRole("button", { name: messages.TaskPage.discard, exact: true })
      .click();
    await expect(page).toHaveURL(/mode=simple/);
  });

  test(`${locale}: microphone denial is inline and the task can be left`, async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "mediaDevices", {
        configurable: true,
        value: {
          getUserMedia: () =>
            Promise.reject(new DOMException("Denied", "NotAllowedError")),
        },
      });
    });
    const task = `${contribution}/${wordId}/${locale === "en" ? "pronunciations/new" : "telaffuzlar/yeni"}`;
    await page.goto(task);
    await page
      .getByRole("button", { name: messages.Pronunciation.record, exact: true })
      .click();
    await expect(page.locator("main [role=alert]")).toContainText(
      messages.Pronunciation.recordingError,
    );
    await page
      .getByRole("button", { name: messages.TaskPage.cancel, exact: true })
      .click();
    await expect(page).not.toHaveURL(
      new RegExp(
        `/${locale === "en" ? "pronunciations/new" : "telaffuzlar/yeni"}`,
      ),
    );
  });

  test(`${locale}: contribution breadcrumbs and Back retain each navigation step`, async ({
    page,
  }) => {
    const source = `/${locale}/${locale === "en" ? "search" : "arama"}/${encodeURIComponent(wordName)}?entry=${wordId}#word-${wordId}`;
    const chooser = `${contribution}/${wordId}?${new URLSearchParams({ returnTo: source })}`;
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    await page.goto(chooser);
    await expect(
      page.getByRole("heading", {
        name: messages.TaskPage.wordTasks.replace("{word}", wordName),
        exact: true,
      }),
    ).toBeVisible();
    await page.locator("main").screenshot({
      path: test.info().outputPath(`${locale}-contribution-chooser-dark.png`),
    });
    const edit = page
      .locator(`main a[href*="/${wordId}/${editSuffix}?"]`)
      .first();
    const target = await edit.getAttribute("href");
    expect(
      new URL(target!, "http://localhost:3100").searchParams.get("returnTo"),
    ).toBe(chooser);
    await edit.click();
    const breadcrumbs = page.getByRole("navigation", {
      name: messages.TaskPage.breadcrumbs,
    });
    await expect(
      breadcrumbs.getByRole("link", { name: wordName, exact: true }),
    ).toBeVisible();
    await expect(
      breadcrumbs.getByRole("link", {
        name: messages.TaskPage.contribute,
        exact: true,
      }),
    ).toHaveAttribute("href", chooser);
    await expect(breadcrumbs.locator('[aria-current="page"]')).toHaveText(
      messages.TaskPage.edit,
    );
    await expect(page.locator('input[name="name"]')).toHaveValue(wordName);
    await page.locator("main").screenshot({
      path: test.info().outputPath(`${locale}-contribution-editor-dark.png`),
    });
    await page.emulateMedia({ colorScheme: "light" });
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    await page.locator("main").screenshot({
      path: test.info().outputPath(`${locale}-contribution-editor-light.png`),
    });
    expect(
      await page
        .locator("main")
        .evaluate((element) => element.scrollWidth <= element.clientWidth),
    ).toBe(true);
    await page.locator("main [data-task-back]").click();
    await expect(page).toHaveURL(chooser);
    await page.locator("main").screenshot({
      path: test.info().outputPath(`${locale}-contribution-chooser-light.png`),
    });
    await page.locator("main [data-task-back]").click();
    await expect(page).toHaveURL(source);
  });

  test(`${locale}: direct and reloaded editors return to Contribute before the original source`, async ({
    page,
    context,
  }) => {
    const source = `${daily}?page=2`;
    const task = `${contribution}/${wordId}/${editSuffix}?${new URLSearchParams({ returnTo: source })}`;
    const chooser = `${contribution}/${wordId}?${new URLSearchParams({ returnTo: source })}`;
    await page.goto(task);
    await expect(page.locator('input[name="name"]')).toHaveValue(wordName);
    await page.reload();
    await expect(page.locator("main [data-task-back]")).toHaveAttribute(
      "href",
      chooser,
    );
    const tab = await context.newPage();
    await tab.goto(task);
    await expect(tab.locator('input[name="name"]')).toHaveValue(wordName);
    await tab.locator("main [data-task-back]").click();
    await expect(tab).toHaveURL(chooser);
    await tab.locator("main [data-task-back]").click();
    await expect(tab).toHaveURL(source);
    await tab.close();
  });

  test(`${locale}: switching language preserves task and return identities`, async ({
    page,
    isMobile,
  }) => {
    const source = `${daily}?page=2`;
    const key = "/contribute-word/[wordId]/meanings/[meaningId]/edit";
    const path = (language: "en" | "tr") =>
      `/${language}${taskPathnames[key][language].replace("[wordId]", String(wordId)).replace("[meaningId]", String(meaningId))}?${new URLSearchParams({ returnTo: source })}`;
    await page.goto(path(locale));
    await expect(page.locator("main form")).toBeVisible();
    if (isMobile)
      await page
        .getByRole("button", { name: messages.Navbar.ariaMenu, exact: true })
        .click();
    const destination = path(locale === "en" ? "tr" : "en");
    const switcher = page
      .locator(`a[href="${destination}"]`)
      .filter({ visible: true });
    await expect(switcher).toHaveCount(1);
    await switcher.click();
    await expect(page).toHaveURL(destination);
    await expect(page.locator("main form")).toBeVisible();
  });

  test(`${locale}: related-word drafts retain their visible target and invalidate edited searches`, async ({
    page,
  }) => {
    await page.goto(
      `${contribution}/${wordId}/${locale === "en" ? "related-words/new" : "iliskili-kelimeler/yeni"}`,
    );
    const target = page.locator('main input[role="combobox"]');
    await target.fill(wordName);
    await page
      .getByRole("listbox")
      .getByRole("option", { name: wordName, exact: true })
      .first()
      .click();
    await page
      .locator('textarea[name="reason"]')
      .fill("İlişki için açıklayıcı bir gerekçe yazıyoruz.");
    await page.reload();
    await page
      .getByRole("button", {
        name: messages.TaskPage.restoreDraft,
        exact: true,
      })
      .click();
    await expect(target).toHaveValue(wordName);
    await target.focus();
    await page.locator('textarea[name="reason"]').focus();
    await expect(target).toHaveValue(wordName);
    const searched = page.waitForResponse(
      (response) =>
        response.url().includes("word.getRecommendations") &&
        decodeURIComponent(response.url()).includes("unselected target"),
    );
    await target.fill("unselected target");
    await searched;
    await expect(page.getByRole("listbox")).toContainText(
      messages.SharedUI.NoRows,
    );
    await target.press("Escape");
    await expect(page.locator('[role="dialog"]')).toHaveCount(0);
    await expect(target).toHaveValue("unselected target");
    await page
      .getByRole("button", { name: messages.Submit, exact: true })
      .click();
    await expect(
      page.getByText(messages.Requests.Forms.RelatedWord.Required, {
        exact: true,
      }),
    ).toBeVisible();
  });

  test(`${locale}: existing-word suggestion drafts keep their selected word after blur`, async ({
    page,
  }) => {
    await page.goto(
      `/${locale}${taskPathnames["/foreign-term-suggestions/new"][locale]}`,
    );
    await page
      .getByRole("checkbox", {
        name: messages.ForeignTermSuggestions.form.isNewWord,
        exact: true,
      })
      .uncheck();
    const target = page.locator('main input[role="combobox"]').last();
    await target.evaluate(async (element) => {
      element.scrollIntoView({ block: "center", behavior: "instant" });
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
    });
    const searched = page.waitForResponse(
      (response) =>
        response.url().includes("word.searchWordsSimple") &&
        decodeURIComponent(response.url()).includes(wordName),
    );
    await target.fill(wordName);
    await searched;
    await target.press("ArrowDown");
    await expect(
      page
        .getByRole("listbox")
        .getByRole("option", { name: wordName, exact: true })
        .first(),
    ).toBeVisible();
    await target.press("ArrowDown");
    await target.press("Enter");
    await expect(target).toHaveValue(wordName);
    await page.locator('input[name="foreignTerm"]').fill("example term");
    await page.reload();
    await page
      .getByRole("button", {
        name: messages.TaskPage.restoreDraft,
        exact: true,
      })
      .click();
    await expect(target).toHaveValue(wordName);
    await target.focus();
    await page.locator('input[name="foreignTerm"]').focus();
    await expect(target).toHaveValue(wordName);
  });

  test(`${locale}: dashboard menu items are localized links and support Enter`, async ({
    page,
  }) => {
    const source = `/${locale}/${locale === "en" ? "dashboard/user-list" : "panel/kullanicilar"}?${new URLSearchParams({ list: JSON.stringify({ page: 1, size: 5 }) })}`;
    const loaded = page.waitForResponse((response) =>
      response.url().includes("user.getUsers"),
    );
    await page.goto(source);
    await loaded;
    await expect(page.locator("main tbody tr")).toHaveCount(5);
    const trigger = page
      .locator("main table")
      .getByRole("button", {
        name: messages.Dashboard.Columns.Actions,
        exact: true,
      })
      .first();
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click();
    const entry = page.getByRole("menuitem", {
      name: "Edit Role",
      exact: true,
    });
    const target = await entry.getAttribute("href");
    expect(target).toContain(
      locale === "en" ? "/en/dashboard/user-list/" : "/tr/panel/kullanicilar/",
    );
    expect(
      new URL(target!, "http://localhost:3100").searchParams.get("returnTo"),
    ).toBe(source);
    await entry.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(target!);
    await expect(page.locator("main form")).toBeVisible();
  });

  test(`${locale}: ordinary task links support new tabs and browser Back/Forward`, async ({
    page,
    context,
  }) => {
    const source = `${daily}?page=2`;
    await page.goto(source);
    const entry = page.locator(`main a[href*="/${editSuffix}?"]`).first();
    await expect(entry).toBeVisible();
    const target = await entry.getAttribute("href");
    expect(
      new URL(target!, "http://localhost:3100").searchParams.get("returnTo"),
    ).toBe(source);
    const tab = await context.newPage();
    await tab.goto(target!);
    await expect(tab.locator("input[type=date]")).toBeVisible();
    await tab.locator("main [data-task-back]").click();
    await expect(tab).toHaveURL(source);
    await tab.close();
    await entry.click();
    await expect(page.locator("input[type=date]")).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(source);
    await page.goForward();
    await expect(page.locator("input[type=date]")).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: messages.TaskPage.restoreDraft,
        exact: true,
      }),
    ).toHaveCount(0);
  });

  test(`${locale}: failed saves keep input and permit a corrected retry`, async ({
    page,
  }) => {
    const source = `${daily}?page=2`;
    const duplicate = (
      await db.query(
        "SELECT date::text FROM daily_words WHERE id<>$1 LIMIT 1",
        [dailyId],
      )
    ).rows[0].date;
    await page.goto(
      `${daily}/${dailyId}/${editSuffix}?${new URLSearchParams({ returnTo: source })}`,
    );
    await page.locator("input[type=date]").fill(duplicate);
    await page
      .getByRole("button", {
        name: messages.Dashboard.DailyWords.save,
        exact: true,
      })
      .click();
    await expect(
      page.getByText(messages.Dashboard.DailyWords.saveFailed, { exact: true }),
    ).toBeVisible();
    await expect(page.locator("input[type=date]")).toHaveValue(duplicate);
    const validDate = new Date(Date.UTC(2600, 0, 1) + wordId * 86400000)
      .toISOString()
      .slice(0, 10);
    await page.locator("input[type=date]").fill(validDate);
    await page
      .getByRole("button", {
        name: messages.Dashboard.DailyWords.save,
        exact: true,
      })
      .click();
    await expect(page).toHaveURL(source);
  });

  test(`${locale}: signing in preserves the complete task and source URL`, async ({
    page,
    context,
  }) => {
    await context.clearCookies();
    const source = `${daily}?page=2`;
    const task = `${daily}/${dailyId}/${editSuffix}?${new URLSearchParams({ returnTo: source })}`;
    await page.goto(task);
    await expect(page).toHaveURL(/\/(signin|giris)/);
    expect(new URL(page.url()).searchParams.get("backTo")).toBe(task);
    await context.addCookies(cookies);
    await page.goto(new URL(page.url()).searchParams.get("backTo")!);
    await expect(page.locator("input[type=date]")).toBeVisible();
  });

  test(`${locale}: forms remain usable at 320px with enlarged text and reduced motion`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    await page.goto(
      `/${locale}${taskPathnames["/dashboard/badges/new"][locale]}`,
    );
    await expect(page.locator("main form")).toBeVisible();
    await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
    await expect(page.locator("main h1")).toBeVisible();
    expect(
      await page
        .locator("main")
        .evaluate((element) => element.scrollWidth <= element.clientWidth),
    ).toBe(true);
    await page
      .getByRole("button", { name: messages.TaskPage.save, exact: true })
      .scrollIntoViewIfNeeded();
    await expect(
      page.getByRole("button", { name: messages.TaskPage.save, exact: true }),
    ).toBeInViewport();
    await page.screenshot({
      path: test.info().outputPath(`${locale}-320-text.png`),
      fullPage: true,
    });
  });

  test(`${locale}: standalone forms have mobile-safe headings, breadcrumbs, and no overlay`, async ({
    page,
  }) => {
    for (const key of [
      "/feedback/new",
      "/foreign-term-suggestions/new",
      "/dashboard/badges/new",
      "/dashboard/daily-words/new",
      "/dashboard/misspellings/new",
      "/dashboard/galatimeshur/new",
      "/dashboard/dynamic-parameters/authors/new",
    ] as const) {
      const route =
        key === "/feedback/new"
          ? locale === "en"
            ? "/feedback/new"
            : "/geri-bildirim/yeni"
          : taskPathnames[key][locale];
      await page.goto(`/${locale}${route}`);
      await expect(page.locator("main h1")).toBeVisible();
      await expect(
        page.getByRole("navigation", { name: messages.TaskPage.breadcrumbs }),
      ).toBeVisible();
      await expect(page.locator("main form")).toBeVisible();
      if (
        key === "/dashboard/badges/new" ||
        key === "/dashboard/daily-words/new"
      )
        await page.screenshot({
          path: test.info().outputPath(`${locale}-${key.split("/")[2]}.png`),
          fullPage: true,
        });
      expect(await page.locator('[role="dialog"]').count()).toBe(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  });
}
