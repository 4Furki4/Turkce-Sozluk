jest.mock("@/db", () => ({
  db: {},
}));
jest.mock("next/cache", () => ({
  cacheLife: jest.fn(),
}));

import {
  findPublishedAnnouncementBySlug,
} from "@/src/server/announcement-queries";
import fs from "node:fs";
import path from "node:path";

function createSelectDatabase(rows: unknown[]) {
  const limit = jest.fn().mockResolvedValue(rows);
  const where = jest.fn(() => ({ limit }));
  const leftJoin = jest.fn(() => ({ where }));
  const from = jest.fn(() => ({ leftJoin, where }));
  const select = jest.fn(() => ({ from }));

  return {
    database: { select },
    select,
    from,
    leftJoin,
    where,
    limit,
  };
}

describe("announcement queries", () => {
  it("defines a one-hour Cache Components revalidation contract", () => {
    const querySource = fs.readFileSync(
      path.join(__dirname, "..", "announcement-queries.ts"),
      "utf8",
    );

    expect(querySource).toMatch(/["']use cache["']/);
    expect(querySource).toMatch(/revalidate:\s*3600/);
    expect(querySource).toMatch(/expire:\s*86400/);
  });

  it("returns the localized eligible announcement row", async () => {
    const announcement = {
      id: "announcement-id",
      slug: "sozluk-hakkinda",
      status: "published",
      title: "Sözlük Hakkında",
      content: "İçerik",
      excerpt: "Özet",
      imageUrl: null,
      actionUrl: null,
      actionTextKey: null,
      publishedAt: new Date("2026-01-01T00:00:00.000Z"),
      createdAt: new Date("2025-12-01T00:00:00.000Z"),
    };
    const { database } = createSelectDatabase([announcement]);

    await expect(
      findPublishedAnnouncementBySlug(
        { slug: announcement.slug, locale: "tr" },
        database as never,
      ),
    ).resolves.toBe(announcement);
  });

  it("returns null when no published, non-future row is eligible", async () => {
    const { database } = createSelectDatabase([]);

    await expect(
      findPublishedAnnouncementBySlug(
        { slug: "scheduled-announcement", locale: "en" },
        database as never,
      ),
    ).resolves.toBeNull();
  });

  it("does not convert database failures into missing rows", async () => {
    const failure = new Error("database unavailable");
    const select = jest.fn(() => {
      throw failure;
    });

    await expect(
      findPublishedAnnouncementBySlug(
        { slug: "sozluk-hakkinda", locale: "tr" },
        { select } as never,
      ),
    ).rejects.toBe(failure);
  });
});
