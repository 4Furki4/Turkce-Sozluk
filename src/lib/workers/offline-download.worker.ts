import {
    clearOfflineData,
    installOfflineDatasetFromFiles,
    type OfflineDatasetManifest,
} from "../offline-db";

type WorkerMessage =
    | {
        type: "START_DOWNLOAD";
        manifest: OfflineDatasetManifest;
        baseUrl: string;
    }
    | { type: "CLEAR_DATA" };

type WorkerResponse =
    | {
        type: "PROGRESS";
        progress: number;
        completedFiles: number;
        totalFiles: number;
        wordCount: number;
    }
    | { type: "COMPLETE" }
    | { type: "ERROR"; error: string }
    | { type: "CLEARED" };

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
    const { type } = event.data;

    try {
        if (type === "START_DOWNLOAD") {
            const { manifest, baseUrl } = event.data;

            await installOfflineDatasetFromFiles({
                manifest,
                baseUrl,
                onProgress: (progress) => {
                    self.postMessage({
                        type: "PROGRESS",
                        ...progress,
                    } satisfies WorkerResponse);
                },
            });

            self.postMessage({ type: "COMPLETE" } satisfies WorkerResponse);
            return;
        }

        if (type === "CLEAR_DATA") {
            await clearOfflineData();
            self.postMessage({ type: "CLEARED" } satisfies WorkerResponse);
        }
    } catch (error) {
        self.postMessage({
            type: "ERROR",
            error: error instanceof Error ? error.message : String(error),
        } satisfies WorkerResponse);
    }
};
