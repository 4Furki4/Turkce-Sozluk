
// src/components/requests/details/meaning/update.tsx
import { FC } from "react";
import { RequestDetailComponentProps } from "../registry";
import { useRequestResolver } from "../useRequestResolver";
import { DiffTable } from "../DiffTable";
import { UpdateMeaningRequestSchema } from "@/src/server/api/schemas/requests";
import { RawDataViewer } from "../RawDataViewer";
import SchemaErrorDisplay from "../SchemaErrorDisplay";
import { useLocale, useTranslations } from "next-intl";
import { Spinner } from "@heroui/react";

export const UpdateMeaning: FC<RequestDetailComponentProps> = ({ newData, oldData }) => {
  const t = useTranslations("RequestDetails");
  const locale = useLocale() as "en" | "tr";
  const safeParsedNewData = UpdateMeaningRequestSchema.safeParse(newData);
  const safeParsedOldData = UpdateMeaningRequestSchema.safeParse(oldData);

  const { resolvedData, isLoading } = useRequestResolver({
    entityType: "meanings",
    action: "update",
    locale,
    newData: safeParsedNewData.data,
    oldData: safeParsedOldData.data,
  });
  if (!safeParsedNewData.success) {
    return <SchemaErrorDisplay error={safeParsedNewData.error} title={t("DiffTable.newValue")} />;
  }

  if (!safeParsedOldData.success) {
    return <SchemaErrorDisplay error={safeParsedOldData.error} title={t("DiffTable.oldValue")} />;
  }


  if (isLoading) {
    return <Spinner />;
  }

  return (
    <div className="space-y-4">
      <DiffTable oldData={resolvedData.old} newData={resolvedData.new} />
      <RawDataViewer data={{ newData, oldData }} />
    </div>
  );
};
