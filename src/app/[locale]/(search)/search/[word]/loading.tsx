import WordDetailShell from "./word-detail-shell";
import WordRouteLoadingClient from "./word-route-loading-client";

export default function Loading() {
    return (
        <WordDetailShell>
            <WordRouteLoadingClient />
        </WordDetailShell>
    );
}
