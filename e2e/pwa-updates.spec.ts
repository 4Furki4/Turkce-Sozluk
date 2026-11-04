import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import enMessages from "../messages/en.json";
import trMessages from "../messages/tr.json";
import { DB_NAME, DB_VERSION, METADATA_STORE } from "../src/lib/db-config";

test.use({ serviceWorkers: "allow" });
test.setTimeout(90_000);

test("serves the update script without HTTP caching", async ({ request }) => {
  const response = await request.get("/sw.js", { headers: { "Service-Worker": "script" } });
  expect(response.ok()).toBe(true);
  expect(response.headers()["cache-control"]).toBe("no-store");
});

// Serve real production pages and the compiled worker on an isolated origin.
// Only the build revision and a test HTML marker change between releases;
// generated files on disk are never modified.
async function releaseFixture(upstream: string) {
  const worker = readFileSync("public/sw.js", "utf8");
  const rootEntry = worker.match(/\{[^{}]*["']?url["']?\s*:\s*["']\/tr["'][^{}]*\}/)?.[0];
  const revision = rootEntry?.match(/["']?revision["']?\s*:\s*["']([^"']+)["']/)?.[1];
  if (!revision) throw new Error("Production worker has no /tr build revision");
  let release = "A";
  const server = createServer(async (request, response) => {
    // An in-flight response belongs to the release that accepted the request,
    // even if deploy() runs while the upstream page is rendering.
    const requestedRelease = release;
    try {
      if (request.url === "/sw.js") {
        response.writeHead(200, { "content-type": "application/javascript", "cache-control": "no-store" });
        response.end(worker.replaceAll(revision, `${revision}-${requestedRelease}`));
        return;
      }
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(Buffer.from(chunk));
      const headers = new Headers();
      for (const [name, value] of Object.entries(request.headers)) {
        if (value && !["host", "connection", "content-length", "accept-encoding"].includes(name)) {
          headers.set(name, Array.isArray(value) ? value.join(", ") : value);
        }
      }
      const result = await fetch(new URL(request.url ?? "/", upstream), {
        method: request.method,
        headers,
        redirect: "manual",
        ...(chunks.length ? { body: Buffer.concat(chunks) } : {}),
      });
      const html = result.headers.get("content-type")?.includes("text/html");
      for (const [name, value] of result.headers) {
        if (!["content-encoding", "content-length", "transfer-encoding"].includes(name)) {
          response.setHeader(name, value);
        }
      }
      response.statusCode = result.status;
      if (html) {
        response.end((await result.text()).replace("</head>", `<meta name="pwa-test-release" content="${requestedRelease}"></head>`));
      } else {
        response.end(Buffer.from(await result.arrayBuffer()));
      }
    } catch (error) {
      response.writeHead(502).end(String(error));
    }
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing fixture port");
  return {
    origin: `http://127.0.0.1:${address.port}`,
    deploy: (nextRelease = "B") => { release = nextRelease; },
    close: () => new Promise<void>((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
      server.closeAllConnections();
    }),
  };
}

for (const locale of ["tr", "en"] as const) {
  const messages = locale === "tr" ? trMessages : enMessages;

  test(`${locale}: accept a downloaded release without losing another tab's work or offline data`, async ({ page, context, baseURL }, testInfo) => {
    const fixture = await releaseFixture(baseURL!);
    try {
      await context.route(/^https:\/\//, route => route.abort());
      const url = `${fixture.origin}/${locale}?pwa-test=1#update`;
      const prompt = page.getByRole("complementary", { name: messages.PwaUpdate.title });
      const marker = page.locator('meta[name="pwa-test-release"]');
      expect((await page.goto(url))?.ok()).toBe(true);
      await page.evaluate(async () => { await navigator.serviceWorker.ready; });
      await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
      await expect(prompt).toBeHidden();
      await expect(marker).toHaveAttribute("content", "A");

      await expect.poll(() => page.evaluate(async name =>
        (await indexedDB.databases()).some(database => database.name === name), DB_NAME,
      )).toBe(true);
      await page.evaluate(async ({ name, version, store }) => {
        const database = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open(name, version);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        await new Promise<void>((resolve, reject) => {
          const transaction = database.transaction(store, "readwrite");
          transaction.objectStore(store).put("preserved", "pwa-update-sentinel");
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
        });
        database.close();
        await caches.open("document-pages");
        await caches.open("document-pages-retired");
        await caches.open("pwa-unrelated-cache");
        for (const cacheName of ["pages-rsc", "pages-rsc-prefetch"]) {
          const cache = await caches.open(cacheName);
          await cache.put("/__pwa_stale_component?_rsc=stale", new Response("older-release-component"));
        }
        const expiration = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open("serwist-expiration", 1);
          request.onupgradeneeded = () => {
            const entries = request.result.createObjectStore("cache-entries", { keyPath: "id" });
            entries.createIndex("cacheName", "cacheName");
            entries.createIndex("timestamp", "timestamp");
          };
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        await new Promise<void>((resolve, reject) => {
          const transaction = expiration.transaction("cache-entries", "readwrite");
          const url = `${location.origin}/__pwa_expiration_sentinel`;
          for (const cacheName of ["pages-rsc", "pages-rsc-prefetch", "pwa-unrelated-cache"]) {
            transaction.objectStore("cache-entries").put({
              id: `${cacheName}|${url}`, cacheName, url, timestamp: Date.now(),
            });
          }
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
        });
        expiration.close();
      }, { name: DB_NAME, version: DB_VERSION, store: METADATA_STORE });

      const other = await context.newPage();
      expect((await other.goto(url))?.ok()).toBe(true);
      const otherPrompt = other.getByRole("complementary", { name: messages.PwaUpdate.title });
      const search = other.getByRole("searchbox", { name: messages.Home.hero.searchPlaceholder, exact: true });
      await search.fill("unfinished note");
      let otherNavigations = 0;
      other.on("request", request => {
        if (request.isNavigationRequest() && request.frame() === other.mainFrame()) otherNavigations++;
      });

      fixture.deploy();
      await page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration())!.update(); });
      await expect(prompt).toBeVisible();
      await expect(otherPrompt).toBeVisible();
      expect(await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.waiting?.state)).toBe("installed");

      await context.setOffline(true);
      await expect(prompt.getByRole("button", { name: messages.PwaUpdate.update, exact: true })).toBeDisabled();
      await expect(prompt.getByText(messages.PwaUpdate.offline)).toBeVisible();
      await context.setOffline(false);
      await expect(prompt.getByRole("button", { name: messages.PwaUpdate.update, exact: true })).toBeEnabled();
      await expect(marker).toHaveAttribute("content", "A");
      expect(otherNavigations).toBe(0);

      await prompt.getByRole("button", { name: messages.PwaUpdate.later }).click();
      await expect(prompt).toBeHidden();
      expect(await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.waiting?.state)).toBe("installed");
      await page.reload();
      await expect(prompt).toBeVisible();
      await expect(marker).toHaveAttribute("content", "A");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath("update-prompt.png") });

      let navigations = 0;
      page.on("request", request => {
        if (request.isNavigationRequest() && request.frame() === page.mainFrame()) navigations++;
      });
      const update = prompt.getByRole("button", { name: messages.PwaUpdate.update, exact: true });
      await update.focus();
      await expect(update).toBeFocused();
      await update.press("Enter");
      await expect(marker).toHaveAttribute("content", "B");
      await expect(prompt).toBeHidden();
      await expect(page).toHaveURL(url);
      expect(navigations).toBe(1);
      expect(otherNavigations).toBe(0);
      await expect(search).toHaveValue("unfinished note");
      await expect(otherPrompt).toBeVisible();

      expect(await page.evaluate(async ({ name, version, store }) => {
        const database = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open(name, version);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        const value = await new Promise((resolve, reject) => {
          const request = database.transaction(store).objectStore(store).get("pwa-update-sentinel");
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        database.close();
        return value;
      }, { name: DB_NAME, version: DB_VERSION, store: METADATA_STORE })).toBe("preserved");
      const cacheNames = await page.evaluate(() => caches.keys());
      expect(cacheNames).not.toContain("document-pages");
      expect(cacheNames).not.toContain("document-pages-retired");
      expect(cacheNames).toContain("pwa-unrelated-cache");
      expect(cacheNames).not.toContain("pages-rsc");
      expect(cacheNames).not.toContain("pages-rsc-prefetch");
      expect(await page.evaluate(async () => {
        const database = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open("serwist-expiration", 1);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        const names = await new Promise<string[]>((resolve, reject) => {
          const request = database.transaction("cache-entries").objectStore("cache-entries").getAll();
          request.onsuccess = () => resolve(request.result
            .filter(entry => entry.url.endsWith("/__pwa_expiration_sentinel"))
            .map(entry => entry.cacheName));
          request.onerror = () => reject(request.error);
        });
        database.close();
        return names;
      })).toEqual(["pwa-unrelated-cache"]);

      await context.setOffline(true);
      for (const prefetch of [false, true]) {
        const cachedComponent = await page.evaluate(async isPrefetch => {
          const headers: Record<string, string> = { RSC: "1" };
          if (isPrefetch) headers["Next-Router-Prefetch"] = "1";
          return fetch("/__pwa_stale_component?_rsc=stale", { headers })
            .then(response => response.text()).catch(() => null);
        }, prefetch);
        expect(cachedComponent).not.toBe("older-release-component");
      }
      await context.setOffline(false);

      // Keep the original second tab alive across repeated releases. Serwist
      // stops forwarding some later external installations; native observation
      // must still find their waiting workers without replacing this tab's work.
      for (const release of ["C", "D"]) {
        fixture.deploy(release);
        await page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration())!.update(); });
        await expect(prompt).toBeVisible();
        await expect(otherPrompt).toBeVisible();
        await prompt.getByRole("button", { name: messages.PwaUpdate.update, exact: true }).click();
        await expect(marker).toHaveAttribute("content", release);
        await expect(prompt).toBeHidden();
        await expect(search).toHaveValue("unfinished note");
        expect(otherNavigations).toBe(0);
      }

      await otherPrompt.getByRole("button", { name: messages.PwaUpdate.update, exact: true }).click();
      await expect(other.locator('meta[name="pwa-test-release"]')).toHaveAttribute("content", "D");
      expect(otherNavigations).toBe(1);
      await other.close();
    } finally {
      await fixture.close();
    }
  });

  test(`${locale}: the separate games root offers updates`, async ({ page, context, baseURL }, testInfo) => {
    const fixture = await releaseFixture(baseURL!);
    try {
      await context.route(/^https:\/\//, route => route.abort());
      const url = `${fixture.origin}/${locale}/${locale === "tr" ? "oyna" : "play"}?pwa-test=1#update`;
      expect((await page.goto(url))?.ok()).toBe(true);
      await page.evaluate(async () => { await navigator.serviceWorker.ready; });
      await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
      const prompt = page.getByRole("complementary", { name: messages.PwaUpdate.title });
      await expect(prompt).toBeHidden();
      fixture.deploy();
      await page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration())!.update(); });
      await expect(prompt).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath("games-update-prompt.png") });
      await prompt.getByRole("button", { name: messages.PwaUpdate.update, exact: true }).click();
      await expect(page.locator('meta[name="pwa-test-release"]')).toHaveAttribute("content", "B");
      await expect(prompt).toBeHidden();
      await expect(page).toHaveURL(url);
    } finally {
      await fixture.close();
    }
  });
}
