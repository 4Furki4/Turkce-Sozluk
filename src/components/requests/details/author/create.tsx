// src/components/requests/details/author/create.tsx
import { FC } from "react";
import { RequestDetailComponentProps } from "../registry";
import { useRequestResolver } from "../useRequestResolver";
import { DataDisplay } from "../DataDisplay";
import { RawDataViewer } from "../RawDataViewer";
import { Spinner } from "@heroui/react";
import { useTranslations } from "next-intl";
import { CreateAuthorRequestSchema } from "@/src/server/api/schemas/requests";

export const CreateAuthor: FC<RequestDetailComponentProps> = ({ newData }) => {
  const t = useTranslations("RequestDetails.Author");
  const { resolvedData, isLoading } = useRequestResolver({
    entityType: "authors", // Assuming 'authors' is the entityType for author requests
    action: "create",
    newData: CreateAuthorRequestSchema.parse(newData),
  });

  if (isLoading) {
    return <Spinner />;
  }

  return (
    <>
      <DataDisplay data={resolvedData.new} title={t('title')} />
      <RawDataViewer data={{ newData }} />
    </>
  );
};
