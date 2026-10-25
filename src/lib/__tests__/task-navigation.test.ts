import { getSafeAuthReturnUrl } from "../play-url";
import { taskPathnames } from "@/src/i18n/task-pathnames";
import {
  canReturnThroughHistory,
  isTaskPath,
  readTaskDraft,
  recordTaskLocation,
  resolveTaskReturn,
  TASK_DRAFT_MAX_AGE,
  textDraftValues,
  withTaskReturn,
} from "../task-navigation";

const origin = "https://dictionary.test";
const fallback = "/en/word-list";

describe("task navigation boundaries", () => {
  it.each([
    "//outside.test",
    "https://outside.test/path",
    "javascript:alert(1)",
    "/\\outside.test",
    "/en/\npath",
    "/en/feedback/new",
    "/tr/panel/kelimeler/7/duzenle",
  ])("rejects unsafe or task return target %s", (target) => {
    expect(resolveTaskReturn(target, fallback, origin)).toBe(fallback);
  });

  it.each([
    "/en/search/new",
    "/tr/arama/yeni",
    "/en/search/edit",
    "/tr/panel/rozetler",
    "/en/dashboard/badges",
    "/en/search/a%26b?word=a%2Bb#word-2",
  ])("preserves reading/list target %s", (target) => {
    expect(resolveTaskReturn(target, fallback, origin)).toBe(target);
  });

  it("round-trips nested auth and task returns without decoding word data twice", () => {
    const source = "/tr/arama/y%C3%BCz%25?query=a%26b%2Bc#word-7";
    const task = withTaskReturn("/tr/kelime-katkisi/7/duzenle", source);
    const auth = new URLSearchParams({ backTo: task });
    const resumed = getSafeAuthReturnUrl(auth.get("backTo"), origin)!;
    expect(resumed).toBe(task);
    expect(new URL(resumed, origin).searchParams.get("returnTo")).toBe(source);
    expect(
      getSafeAuthReturnUrl(encodeURIComponent("/en/saved-words"), origin),
    ).toBe("/en/saved-words");
  });

  it.each(["/en/contribute-word/7", "/tr/kelime-katkisi/7"])(
    "preserves the immediate chooser and its original source: %s",
    (chooser) => {
      const source = "/en/search/a%26b?entry=7#word-7";
      const previous = withTaskReturn(chooser, source);
      expect(
        resolveTaskReturn(previous, chooser, origin, chooser + "/edit"),
      ).toBe(previous);
      expect(
        resolveTaskReturn(source, chooser, origin, chooser + "/edit"),
      ).toBe(previous);
      expect(new URL(previous, origin).searchParams.get("returnTo")).toBe(
        source,
      );
    },
  );

  it("keeps direct entry on the parent step and rejects self loops or unfinished editors", () => {
    const chooser = "/en/contribute-word/7";
    expect(resolveTaskReturn(null, chooser, origin, chooser + "/edit")).toBe(
      chooser,
    );
    expect(resolveTaskReturn(chooser, fallback, origin, chooser)).toBe(
      fallback,
    );
    expect(
      resolveTaskReturn(chooser + "/edit", chooser, origin, chooser + "/edit"),
    ).toBe(chooser);
    expect(resolveTaskReturn("//outside.test", chooser, origin)).toBe(chooser);
  });

  it("recognizes every new localized task route while accepting ordinary word names", () => {
    for (const route of Object.values(taskPathnames)) {
      for (const locale of ["en", "tr"] as const) {
        const path = route[locale].replace(/\[[^\]]+\]/g, "7");
        expect(isTaskPath(`/${locale}${path}`)).toBe(true);
        expect(isTaskPath(encodeURI(`/${locale}${path}`))).toBe(true);
      }
    }
    expect(isTaskPath("/en/search/remove")).toBe(false);
  });

  it("uses history only for an observed immediate source in this document", () => {
    recordTaskLocation("/initial");
    expect(canReturnThroughHistory("/initial", "/unknown")).toBe(false);
    recordTaskLocation("/en/words?page=2");
    recordTaskLocation("/en/dashboard/word-list/7/edit");
    expect(
      canReturnThroughHistory(
        "/en/dashboard/word-list/7/edit",
        "/en/words?page=2",
      ),
    ).toBe(true);
    expect(canReturnThroughHistory("/other", "/en/words?page=2")).toBe(false);
  });
});

describe("recoverable text drafts", () => {
  it("expires stale data and rejects malformed and future-dated drafts", () => {
    const now = 10 * TASK_DRAFT_MAX_AGE;
    const valid = {
      version: 1,
      savedAt: now - 1,
      revision: "original",
      values: { reason: "a useful correction" },
    };
    expect(readTaskDraft(JSON.stringify(valid), now)).toEqual(valid);
    expect(readTaskDraft("broken", now)).toBeNull();
    expect(
      readTaskDraft(JSON.stringify({ ...valid, version: 0 }), now),
    ).toBeNull();
    expect(
      readTaskDraft(JSON.stringify({ ...valid, savedAt: now + 1 }), now),
    ).toBeNull();
    expect(
      readTaskDraft(
        JSON.stringify({ ...valid, savedAt: now - TASK_DRAFT_MAX_AGE }),
        now,
      ),
    ).toBeNull();
  });

  it("preserves text and IDs while removing media placeholders", () => {
    const values = {
      name: "kitap",
      meanings: [{ meaning: "a book", image: [new File(["x"], "photo.png")] }],
      audio: new Blob(["x"]),
      ids: [2, 3],
    };
    const serialized = JSON.parse(JSON.stringify(textDraftValues(values)));
    expect(serialized).toEqual({
      name: "kitap",
      meanings: [{ meaning: "a book", image: [] }],
      ids: [2, 3],
    });
  });
});
