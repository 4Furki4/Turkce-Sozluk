
// src/components/requests/details/RequestDetails.tsx
import { FC } from "react";
import { getRequestDetailComponent } from "./registry";
import { EntityTypes, Actions } from "@/db/schema/requests";
import { useTranslations } from "next-intl";
import { DataDisplay } from "./DataDisplay";
import { RawDataViewer } from "./RawDataViewer";

interface RequestDetailsProps {
  entityType: EntityTypes;
  action: Actions;
  newData?: any;
  oldData?: any;
  entityId?: number;
}

const RequestDetails: FC<RequestDetailsProps> = ({ entityType, action, newData, oldData, entityId }) => {
  const t = useTranslations("RequestDetails");
  const Component = getRequestDetailComponent(entityType, action);

  if (!Component) {
    return <div className="min-w-0 space-y-4">
      <p>{t("errors.unsupportedType")}</p>
      {oldData && <DataDisplay data={oldData} title={t("DiffTable.oldValue")} />}
      {newData && <DataDisplay data={newData} title={t("DiffTable.newValue")} />}
      <RawDataViewer data={{ oldData, newData }} />
    </div>;
  }

  return <Component newData={newData} oldData={oldData} entityId={entityId} />;
};

export default RequestDetails;
