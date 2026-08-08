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

    it("uses client-side, non-prefetched links for trending words", () => {
        const source = readFileSync(join(root, "src/components/customs/search/search-container.tsx"), "utf8");

        expect(source).toMatch(
            /trendingWords\?\.map\(\(tag: any\) => \(\s*<Link[\s\S]*?pathname: "\/search\/\[word\]",[\s\S]*?params: \{ word: tag\.name \}/,
        );
        expect(source).toMatch(
            /trendingWords\?\.map\(\(tag: any\) => \(\s*<Link[\s\S]*?prefetch=\{false\}/,
        );
        expect(source).not.toContain("onClick={() => handleRecommendationClick(tag.name)}");
    });

    it("opts dictionary-entry routes out of route-level prefetching", () => {
        const source = readFileSync(
            join(root, "src/app/[locale]/(search)/search/[word]/page.tsx"),
            "utf8",
        );

        expect(source).toContain('export const prefetch = "force-disabled";');
    });

    it("uses locale-aware client navigation for online word searches", () => {
        const source = readFileSync(join(root, "src/components/customs/search/search-container.tsx"), "utf8");

        expect(source).toContain('import { Link, useRouter } from "@/src/i18n/routing";');
        expect(source).toContain("const router = useRouter();");
        expect(source).toMatch(
            /if \(!isOnline\) \{\s*window\.location\.assign\(dynamicWordHref\);\s*return;\s*\}\s*router\.push\(\{\s*pathname: "\/search\/\[word\]",\s*params: \{ word: input \},\s*\}\);/,
        );
    });
});
