// src/components/requests/details/related-phrase/create.tsx
import { FC } from "react";
import { RequestDetailComponentProps } from "../registry";
import { DataDisplay } from "../DataDisplay";
import { CreateRelatedPhraseRequestSchema } from "@/src/server/api/schemas/requests";
import { RawDataViewer } from "../RawDataViewer";
import SchemaErrorDisplay from "../SchemaErrorDisplay";
import { useTranslations } from "next-intl";
import { Spinner } from "@heroui/react";
import { api } from "@/src/trpc/react";

export const CreateRelatedPhrase: FC<RequestDetailComponentProps> = ({ newData, entityId }) => {
  const t = useTranslations("RequestDetails");
  const safeParsedData = CreateRelatedPhraseRequestSchema.safeParse(newData);
  
  // Fetch the main word name using entityId (wordId)
  const { data: wordData, isLoading: isWordLoading } = api.word.getWordById.useQuery(
    { id: entityId! },
    { enabled: !!entityId }
  );
  
  // Fetch the phrase content using phraseId (phrases are stored as words)
  const { data: phraseData, isLoading: isPhraseLoading } = api.word.getWordById.useQuery(
    { id: safeParsedData.data?.phraseId! },
    { enabled: !!safeParsedData.data?.phraseId }
  );
  
  if (!safeParsedData.success) {
    return <SchemaErrorDisplay error={safeParsedData.error} />;
  }

  if (isWordLoading || isPhraseLoading) {
    return <Spinner />;
  }

  // Combine the word and phrase information with the resolved data
  const displayData = {
    wordName: wordData?.name || (entityId ? `ID: ${entityId}` : t("unknownWord")),
    phrase: phraseData?.name || `ID: ${safeParsedData.data.phraseId}`,
    ...(safeParsedData.data.description ? { description: safeParsedData.data.description } : {}),
  };

  return (
    <div className="space-y-4">
      <DataDisplay data={displayData} title={t("RelatedPhrase.newRelatedPhrase")} />
      <RawDataViewer data={{ 
        wordName: wordData?.name, 
        phrase: phraseData?.name,
        originalData: newData 
      }} />
    </div>
  );
};
