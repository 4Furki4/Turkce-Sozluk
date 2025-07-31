// src/components/requests/details/related-phrase/create.tsx
import { FC } from "react";
import { RequestDetailComponentProps } from "../registry";
import { useRequestResolver } from "../useRequestResolver";
import { DataDisplay } from "../DataDisplay";
import { CreateRelatedPhraseRequestSchema } from "@/src/server/api/schemas/requests";
import { RawDataViewer } from "../RawDataViewer";
import SchemaErrorDisplay from "../SchemaErrorDisplay";
import { useLocale, useTranslations } from "next-intl";
import { Spinner } from "@heroui/react";
import { api } from "@/src/trpc/react";

export const CreateRelatedPhrase: FC<RequestDetailComponentProps> = ({ newData, entityId }) => {
  const t = useTranslations("RequestDetails");
  const locale = useLocale() as "en" | "tr";
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
  
  const { resolvedData, isLoading } = useRequestResolver({
    entityType: "related_phrases",
    action: "create",
    locale,
    newData: safeParsedData.data,
  });

  if (!safeParsedData.success) {
    return <SchemaErrorDisplay error={safeParsedData.error} />;
  }

  if (isLoading || isWordLoading || isPhraseLoading) {
    return <Spinner />;
  }

  // Combine the word and phrase information with the resolved data
  const displayData = {
    wordName: wordData?.name || 'Unknown Word',
    phrase: phraseData?.name || 'Unknown Phrase',
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
