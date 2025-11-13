import { FC } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { RequestDetailComponentProps } from "../registry";
import { api } from "@/src/trpc/react";
import { Alert, Spinner } from "@heroui/react";


export const CreatePronunciation: FC<RequestDetailComponentProps> = ({ newData, oldData, entityId }) => {
    const t = useTranslations("RequestDetails");

    // Fetch the word name using entityId (wordId)
    const { data: wordData, isLoading: isWordLoading } = api.word.getWordById.useQuery(
        { id: entityId! },
        { enabled: !!entityId }
    );

    if (isWordLoading) {
        return <Spinner />;
    }

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold">{t("Pronunciation.title")}</h3>

            {/* Display related word using fetched data or fallback to oldData */}
            {(wordData || oldData) && (
                <div>
                    <p className="text-sm text-gray-500">{t("Pronunciation.relatedWord")}</p>
                    {wordData?.name ? (
                        <Link
                            href={`/search/${encodeURIComponent(wordData?.name ?? '') || encodeURIComponent(oldData?.name)}`}
                            className="text-primary hover:underline font-medium text-lg"
                        >
                            {wordData?.name || oldData?.name || 'Unknown Word'}
                        </Link>
                    ) : (
                        <div className="flex items-center justify-center w-full">
                            <Alert description={'Unknown Word'} title={'Error'} />
                        </div>
                    )}

                </div>
            )}

            <div>
                <p className="text-sm text-gray-500">{t("Pronunciation.audioRecording")}</p>
                <audio controls src={newData.audio_url} className="w-full mt-2">
                    Your browser does not support the audio element.
                </audio>
            </div>
        </div>
    );
};

export default CreatePronunciation;
