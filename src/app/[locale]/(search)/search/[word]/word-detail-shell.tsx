import type { ReactNode } from "react";

import SearchContainer from "@/src/components/customs/search/search-container";

export default function WordDetailShell({ children }: { children: ReactNode }) {
    return (
        <div className="w-full px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
            <div className="mx-auto max-w-3xl">
                <SearchContainer showTrending={false} className="mb-6" />
            </div>
            <div className="mx-auto max-w-7xl">
                {children}
            </div>
        </div>
    );
}
