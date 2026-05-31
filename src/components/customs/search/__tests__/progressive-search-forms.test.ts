/** @jest-environment node */

import { readFileSync } from "fs";
import { join } from "path";

const root = process.cwd();

describe("progressive search forms", () => {
    it("keeps the main search form submittable without JavaScript", () => {
        const source = readFileSync(join(root, "src/components/customs/search/search-container.tsx"), "utf8");

        expect(source).toContain("action={getPlainSearchAction(locale)}");
        expect(source).toContain('method="get"');
        expect(source).toContain('name="word"');
        expect(source).toContain("getWordSearchHref(locale, input)");
        expect(source).not.toContain('name="offlineWord"');
    });

    it("keeps the navbar search form submittable without JavaScript", () => {
        const source = readFileSync(join(root, "src/components/customs/navbar.tsx"), "utf8");

        expect(source).toContain("action={getPlainSearchAction(locale)}");
        expect(source).toContain('method="get"');
        expect(source).toContain('name="word"');
        expect(source).toContain("getWordSearchHref(locale, input)");
        expect(source).not.toContain('name="offlineWord"');
    });
});
