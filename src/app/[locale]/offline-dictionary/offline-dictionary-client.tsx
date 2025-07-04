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
    processWordFile,
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
};

// The base URL for your dictionary data is now read from environment variables.
const DATA_BASE_URL = process.env.NEXT_PUBLIC_R2_CUSTOM_URL;
const FOLDER_NAME = "turkce-sozluk/offline-data";

export default function OfflineDictionaryClient() {
    const t = useTranslations("OfflineDictionary");
    const [status, setStatus] = useState<Status>("idle");
    const [localVersion, setLocalVersionState] = useState<number | null>(null);
    const [remoteVersion, setRemoteVersion] = useState<number | null>(null);
    const [metadata, setMetadata] = useState<Metadata | null>(null);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

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
    }, [t]);

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

            const filesToDownload = metadata.files;
            for (let i = 0; i < filesToDownload.length; i++) {
                const file = filesToDownload[i];
                // Process each file from its full R2 URL
                await processWordFile(`${DATA_BASE_URL}/${FOLDER_NAME}/${file}`);
                setProgress(((i + 1) / filesToDownload.length) * 100);
            }

            await setLocalVersion(metadata.version);
            await checkStatus();
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
