"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button, CardBody, CardFooter } from "@heroui/react";

import { Progress } from "@heroui/react";
import { Alert } from "@heroui/react";
import {
    getLocalVersion,
    setLocalVersion,
    clearOfflineData,
} from "@/src/lib/offline-db";
import { Download, Trash2, RefreshCw } from "lucide-react";

type Status =
    | "idle"
    | "checking"
    | "up-to-date"
    | "update-available"
    | "not-downloaded"
    | "downloading"
    | "deleting"
    | "error";

type Metadata = {
    version: number;
    files: string[];
    totalSize?: number;
    fileSizes?: { [filename: string]: number };
};

// The base URL for your dictionary data is now read from environment variables.
const DATA_BASE_URL = process.env.NEXT_PUBLIC_R2_CUSTOM_URL;
const FOLDER_NAME = "turkce-sozluk/offline-data";

// Utility function to format file sizes
const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Function to fetch file size from HEAD request
const getFileSize = async (url: string): Promise<number> => {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        const contentLength = response.headers.get('content-length');
        return contentLength ? parseInt(contentLength, 10) : 0;
    } catch {
        return 0;
    }
};

export default function OfflineDictionaryClient() {
    const t = useTranslations("OfflineDictionary");
    const [status, setStatus] = useState<Status>("idle");
    const [localVersion, setLocalVersionState] = useState<number | null>(null);
    const [remoteVersion, setRemoteVersion] = useState<number | null>(null);
    const [metadata, setMetadata] = useState<Metadata | null>(null);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [totalDownloadSize, setTotalDownloadSize] = useState<number | null>(null);
    const [isCalculatingSize, setIsCalculatingSize] = useState(false);

    const calculateDownloadSize = useCallback(async (files: string[]) => {
        if (!DATA_BASE_URL) return;

        setIsCalculatingSize(true);
        try {
            let totalSize = 0;
            const sizePromises = files.map(async (file) => {
                const fileUrl = `${DATA_BASE_URL}/${FOLDER_NAME}/${file}`;
                return await getFileSize(fileUrl);
            });

            const sizes = await Promise.all(sizePromises);
            totalSize = sizes.reduce((sum, size) => sum + size, 0);
            setTotalDownloadSize(totalSize);
        } catch (error) {
            console.error('Error calculating download size:', error);
        } finally {
            setIsCalculatingSize(false);
        }
    }, []);

    const checkStatus = useCallback(async () => {
        setStatus("checking");
        setError(null);

        if (!DATA_BASE_URL) {
            setError(t("error.r2_url_missing"));
            setStatus("error");
            return;
        }

        try {
            // Fetch remote metadata from the R2 public URL
            const response = await fetch(`${DATA_BASE_URL}/${FOLDER_NAME}/metadata.json`);
            if (!response.ok) throw new Error(t("error.metadata_fetch_failed"));
            const remoteMeta: Metadata = await response.json();
            setRemoteVersion(remoteMeta.version);
            setMetadata(remoteMeta);

            // Get local version
            const localV = await getLocalVersion();
            setLocalVersionState(localV);

            // Calculate total download size if metadata includes file sizes
            if (remoteMeta.totalSize) {
                setTotalDownloadSize(remoteMeta.totalSize);
            } else {
                // Calculate file sizes if not included in metadata
                await calculateDownloadSize(remoteMeta.files);
            }

            if (!localV) {
                setStatus("not-downloaded");
            } else if (localV === remoteMeta.version) {
                setStatus("up-to-date");
            } else {
                setStatus("update-available");
            }
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : String(err));
            setStatus("error");
        }
    }, [t, calculateDownloadSize]);

    useEffect(() => {
        checkStatus();
    }, [checkStatus]);

    const handleDownloadOrUpdate = async () => {
        if (!metadata || !DATA_BASE_URL) {
            setError(t("error.no_metadata"));
            setStatus("error");
            return;
        }

        setStatus("downloading");
        setProgress(0);
        setError(null);

        try {
            await clearOfflineData();

            const worker = new Worker(new URL('@/src/lib/workers/offline-download.worker.ts', import.meta.url));

            worker.onmessage = async (event) => {
                const { type } = event.data;
                if (type === 'PROGRESS') {
                    setProgress(event.data.progress);
                } else if (type === 'COMPLETE') {
                    await setLocalVersion(metadata.version);
                    await checkStatus();
                    worker.terminate();
                } else if (type === 'ERROR') {
                    setError(event.data.error);
                    setStatus("error");
                    worker.terminate();
                }
            };

            worker.postMessage({
                type: 'START_DOWNLOAD',
                files: metadata.files,
                baseUrl: `${DATA_BASE_URL}/${FOLDER_NAME}`
            });

        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : String(err));
            setStatus("error");
        }
    };

    const handleDelete = async () => {
        setStatus("deleting");
        setError(null);
        try {
            await clearOfflineData();
            await checkStatus();
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : String(err));
            setStatus("error");
        }
    };

    const renderStatus = () => {
        // ... (The renderStatus function remains the same)
        switch (status) {
            case "checking":
                return (
                    <Alert color="default" title={t("status.checking")} description={t("status.checking_desc")} />
                );
            case "up-to-date":
                return (
                    <Alert color="success" title={t("status.up_to_date_title")} description={t("status.up_to_date_desc")} />
                );
            case "update-available":
                return (
                    <Alert color="warning" title={t("status.update_available_title")} description={t("status.update_available_desc", { local: new Date(localVersion!).toLocaleString(), remote: new Date(remoteVersion!).toLocaleString() })} />
                );
            case "not-downloaded":
                return (
                    <Alert color="warning" title={t("status.not_downloaded_title")} description={t("status.not_downloaded_desc")} />
                );
            case "downloading":
                return (
                    <>
                        <div>
                            <p>{t("status.downloading")}...</p>
                            <Progress value={progress} className="w-full mt-2" />
                            <p className="text-sm text-center mt-1">{Math.round(progress)}%</p>
                        </div>
                        <Alert color="default" title={t("status.downloading_title")} description={t("status.downloading_desc")} />
                    </>
                );
            case "deleting":
                return (
                    <Alert color="default" title={t("status.deleting_title")} description={t("status.deleting_desc")} />
                );
            case "error":
                return (
                    <Alert color="danger" title={t("status.error_title")} description={error} />
                );
            default:
                return null
        }
    };

    const isLoading = status === 'checking' || status === 'downloading' || status === 'deleting';

    return (
        <>
            <CardBody className="space-y-4">
                <div>
                    {renderStatus()}
                </div>

                {/* File Size Information */}
                {(status === "not-downloaded" || status === "update-available") && (
                    <div className="p-4 bg-background-50 rounded-lg border ">
                        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                            <Download className="h-4 w-4" />
                            {t("download_info.title")}
                        </h3>
                        <div className="space-y-2 text-sm">
                            {metadata && (
                                <div className="flex justify-between">
                                    <span>{t("download_info.files_count")}:</span>
                                    <span className="font-medium">{metadata.files.length} {t("download_info.files")}</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span>{t("download_info.estimated_size")}:</span>
                                <span className="font-medium">
                                    {isCalculatingSize ? (
                                        <span className="flex items-center gap-1">
                                            <RefreshCw className="h-3 w-3 animate-spin" />
                                            {t("download_info.calculating")}
                                        </span>
                                    ) : totalDownloadSize ? (
                                        formatFileSize(totalDownloadSize)
                                    ) : (
                                        t("download_info.unknown")
                                    )}
                                </span>
                            </div>
                            {totalDownloadSize && totalDownloadSize > 50 * 1024 * 1024 && (
                                <div className="mt-2 p-2 bg-warning-50 border border-warning-200 text-warning-800 text-xs">
                                    ⚠️ {t("download_info.large_download_warning")}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </CardBody>
            <CardFooter className="flex flex-col sm:grid-cols-2  justify-between items-center gap-2">
                {(status === "not-downloaded" || status === "update-available") && (
                    <Button onPress={handleDownloadOrUpdate} disabled={isLoading} color="primary" className="w-full" startContent={<Download className="mr-2 h-4 w-4" />}>
                        {status === "not-downloaded" ? t("buttons.download") : t("buttons.update")}
                    </Button>
                )}


                <div className="w-full flex flex-col sm:flex-row items-center gap-2">
                    <Button
                        onPress={handleDelete}
                        color="danger"
                        variant="flat"
                        className="w-full"
                        disabled={isLoading || !localVersion}
                        startContent={<Trash2 className="mr-2 h-4 w-4" />}
                    >
                        {t("buttons.delete")}
                    </Button>
                    <Button onPress={checkStatus} variant="ghost" disabled={isLoading} className="w-full" startContent={<RefreshCw className="mr-2 h-4 w-4" />}>
                        {t("buttons.check_status")}
                    </Button>
                </div>
            </CardFooter>
        </>
    );
}
