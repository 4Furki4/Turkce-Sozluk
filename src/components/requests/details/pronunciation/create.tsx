import { FC } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/src/i18n/routing";
import { RequestDetailComponentProps } from "../registry";
import { api } from "@/src/trpc/react";
import { Spinner } from "@heroui/react";
import { RawDataViewer } from "../RawDataViewer";

export const CreatePronunciation: FC<RequestDetailComponentProps> = ({ newData, oldData, entityId }) => {
  const t = useTranslations("RequestDetails");
  const { data: word, isLoading } = api.word.getWordById.useQuery({ id: entityId! }, { enabled: !!entityId });
  const name = word?.name || oldData?.name;
  const audioUrl = typeof newData?.audio_url === "string" && newData.audio_url.trim() ? newData.audio_url : null;
  if (isLoading) return <Spinner />;
  return <div className="min-w-0 space-y-4">
    <h3 className="text-lg font-semibold">{t("Pronunciation.title")}</h3>
    <div className="min-w-0">
      <p className="text-sm text-muted-foreground">{t("Pronunciation.relatedWord")}</p>
      {name ? <Link href={{ pathname: "/search/[word]", params: { word: name } }}
        className="inline-flex min-h-11 items-center rounded-md text-lg font-medium text-primary underline-offset-4 [overflow-wrap:anywhere] hover:underline focus-visible:outline-2 focus-visible:outline-primary"><bdi>{name}</bdi></Link>
        : <p className="mt-2">{entityId ? `ID: ${entityId}` : t("unknownWord")}</p>}
    </div>
    <div className="min-w-0">
      <p className="text-sm text-muted-foreground">{t("Pronunciation.audioRecording")}</p>
      {audioUrl ? <audio controls preload="none" src={audioUrl} aria-label={t("Pronunciation.audioRecording")} className="mt-2 w-full min-w-0 max-w-full">
        {t("Pronunciation.unsupportedAudio")}
      </audio> : <p className="mt-2">{t("Pronunciation.missingRecording")}</p>}
    </div>
    <RawDataViewer data={newData} />
  </div>;
};
export default CreatePronunciation;
