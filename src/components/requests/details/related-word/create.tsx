// src/components/requests/details/related-word/create.tsx
import { FC } from "react";
import { RequestDetailComponentProps } from "../registry";
import { useRequestResolver } from "../useRequestResolver";
import { DataDisplay } from "../DataDisplay";
import { CreateRelatedWordRequestSchema } from "@/src/server/api/schemas/requests";
import { RawDataViewer } from "../RawDataViewer";
import SchemaErrorDisplay from "../SchemaErrorDisplay";
import { useLocale, useTranslations } from "next-intl";
import { Spinner } from "@heroui/react";
import { api } from "@/src/trpc/react";

export const CreateRelatedWord: FC<RequestDetailComponentProps> = ({ newData, entityId }) => {
  const t = useTranslations("RequestDetails");
  const locale = useLocale() as "en" | "tr";
  const safeParsedData = CreateRelatedWordRequestSchema.safeParse(newData);
  
  // Fetch the main word name using entityId (wordId)
  const { data: wordData, isLoading: isWordLoading } = api.word.getWordById.useQuery(
    { id: entityId! },
    { enabled: !!entityId }
  );
  
  const { resolvedData, isLoading } = useRequestResolver({
    entityType: "related_words",
    action: "create",
    locale,
    newData: safeParsedData.data,
  });

  if (!safeParsedData.success) {
    return <SchemaErrorDisplay error={safeParsedData.error} />;
  }

  if (isLoading || isWordLoading) {
    return <Spinner />;
  }

  // Combine the word information with the resolved data
  const displayData = {
    wordName: wordData?.name || 'Unknown Word',
    relationType: safeParsedData.data?.relationType,
    relatedWord: resolvedData.new?.relatedWord || 'Unknown Related Word',
  };

  return (
    <div className="space-y-4">
      <DataDisplay data={displayData} title={t("RelatedWord.newRelatedWord")} />
      <RawDataViewer data={{ 
        wordName: wordData?.name,
        relationType: safeParsedData.data?.relationType,
        relatedWord: resolvedData.new?.relatedWord,
        originalData: newData 
      }} />
    </div>
  );
};
