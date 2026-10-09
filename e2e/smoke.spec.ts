import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

const definition = "Okumak için yazılmış veya basılmış yaprakların bir araya getirilmiş biçimi.";

test.beforeEach(async ({ page }) => {
  // Third-party providers are outside this suite. Never contact them with CI data.
  await page.route(/^https:\/\//, route => route.abort());
});

for (const locale of ["tr", "en"] as const) {
  const searchPath = `/${locale}/${locale === "tr" ? "arama" : "search"}`;

  test(`${locale}: search by keyboard, render database result, and go Back`, async ({ page }) => {
    await page.goto(`/${locale}`);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    const input = page.getByRole("searchbox", { name: "search words" });
    await input.fill("kitap");
    await input.press("Enter");
    await expect(page).toHaveURL(`${searchPath}/kitap`);
    await expect(page.getByText(definition, { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "kitap", exact: true })).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(`/${locale}`);
    await expect(input).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });

  test(`${locale}: query search resolves to the localized word URL`, async ({ page }) => {
    await page.goto(`${searchPath}?word=kitap`);
    await expect(page).toHaveURL(`${searchPath}/kitap`);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.getByText(definition, { exact: true })).toBeVisible();
    if (locale === "en") {
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    }
  });

  test(`${locale}: an authenticated user can save and unsave a word durably`, async ({ page }) => {
    const identity = `ci_${randomUUID().replaceAll("-", "")}`;
    // Each virtual user has a separate IP; repeated tests must not share the
    // production signup quota. Better Auth's limiter itself stays enabled.
    const octets = randomUUID().replaceAll("-", "").match(/../g)!;
    const ip = `10.${octets.slice(0, 3).map(octet => Number.parseInt(octet, 16)).join(".")}`;
    await page.context().setExtraHTTPHeaders({ "x-forwarded-for": ip });
    // Real Better Auth session creation; no mocked auth cookies or tRPC responses.
    const signup = await page.request.post("/api/auth/sign-up/email", {
      headers: { origin: "http://localhost:3100", "x-forwarded-for": ip },
      data: {
        email: `${identity}@example.invalid`,
        name: "CI Smoke User",
        username: identity,
        password: "ci-only-smoke-test-password",
      },
    });
    expect(signup.ok(), await signup.text()).toBe(true);
    const session = await page.request.get("/api/auth/get-session", { headers: { "x-forwarded-for": ip } });
    expect((await session.json()).user.email).toBe(`${identity}@example.invalid`);

    await page.goto(`${searchPath}/kitap`);
    await expect(page.getByText(definition, { exact: true })).toBeVisible();
    const save = page.getByRole("button", { name: "save word" });
    const [savedResponse] = await Promise.all([
      page.waitForResponse(response => response.url().includes("user.saveWord") && response.request().method() === "POST"),
      save.click(),
    ]);
    expect(savedResponse.ok()).toBe(true);
    await expect(save.locator("svg")).toHaveClass(/fill-primary/);
    await page.reload();
    await expect(save.locator("svg")).toHaveClass(/fill-primary/);
    const [unsavedResponse] = await Promise.all([
      page.waitForResponse(response => response.url().includes("user.saveWord") && response.request().method() === "POST"),
      save.click(),
    ]);
    expect(unsavedResponse.ok()).toBe(true);
    await expect(save.locator("svg")).toHaveClass(/fill-transparent/);
    await page.reload();
    await expect(save.locator("svg")).toHaveClass(/fill-transparent/);
  });
}
