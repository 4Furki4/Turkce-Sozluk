import type { ReactNode } from "react";

type NoScriptNoticeProps = {
    children: ReactNode;
};

export function NoScriptNotice({ children }: NoScriptNoticeProps) {
    return (
        <noscript>
            <div className="mb-4 rounded-md border border-primary/30 bg-background/40 p-4 text-sm text-muted-foreground">
                {children}
            </div>
        </noscript>
    );
}
