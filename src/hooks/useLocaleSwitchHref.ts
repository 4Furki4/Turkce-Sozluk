"use client";

import { useMemo } from "react";
import {
    useParams,
    usePathname as useRawPathname,
    useSearchParams,
} from "next/navigation";
import { usePathname as useIntlPathname } from "@/src/i18n/routing";
import {
    extractSearchWordFromPathname,
    toSingleRouteParam,
} from "@/src/lib/search-route";

type LocaleSwitchHref = {
    pathname: string;
    query?: string;
    params?: Record<string, string>;
};

export function useLocaleSwitchHref(): LocaleSwitchHref {
    const intlPathname = useIntlPathname();
    const rawPathname = useRawPathname();
    const searchParams = useSearchParams();
    const params = useParams();

    return useMemo(() => {
        const resolvedParams: Record<string, string> = {};
        const resolvedWordFromPath = extractSearchWordFromPathname(rawPathname);
        const wordParam = toSingleRouteParam(params.word);
        const idParam = toSingleRouteParam(params.id);
        const slugParam = toSingleRouteParam(params.slug);

        if (idParam) {
            resolvedParams.id = idParam;
        }

        if (slugParam) {
            resolvedParams.slug = slugParam;
        }

        if (wordParam) {
            resolvedParams.word = wordParam;
        } else if (resolvedWordFromPath) {
            resolvedParams.word = resolvedWordFromPath;
        }

        const query = searchParams.toString();
        const href: LocaleSwitchHref = {
            pathname: resolvedWordFromPath ? "/search/[word]" : intlPathname,
        };

        if (query) {
            href.query = query;
        }

        if (Object.keys(resolvedParams).length > 0) {
            href.params = resolvedParams;
        }

        return href;
    }, [intlPathname, params, rawPathname, searchParams]);
}
