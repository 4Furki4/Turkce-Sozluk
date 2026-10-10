import { useTranslations } from "next-intl";
import { RequestDataValue } from "./DataDisplay";

interface DiffTableProps {
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
}

export function DiffTable({ oldData, newData }: DiffTableProps) {
  const t = useTranslations("RequestDetails.DiffTable");
  const tDb = useTranslations("DbFieldLabels");
  if (!newData || Object.keys(newData).length === 0) return <p>{t("noData")}</p>;
  return <div className="min-w-0 max-w-full rounded-md border border-border">
    <div className="hidden grid-cols-3 gap-4 border-b border-border bg-muted/50 px-4 py-3 text-sm font-semibold md:grid">
      <div>{t("field")}</div><div>{t("oldValue")}</div><div>{t("newValue")}</div>
    </div>
    <div className="divide-y divide-border">
      {Object.keys(newData).map(key => {
        const oldValue = oldData?.[key];
        const newValue = newData[key];
        const changed = JSON.stringify(oldValue) !== JSON.stringify(newValue);
        const existing = oldValue !== undefined;
        return <div key={key} className="grid min-w-0 grid-cols-1 items-start gap-x-4 gap-y-2 px-4 py-3 text-base md:grid-cols-3">
          <div className="min-w-0 font-medium [overflow-wrap:anywhere]">{tDb.has(key) ? tDb(key) : key}</div>
          <div className="grid min-w-0 grid-cols-1 gap-3 md:col-span-2 md:grid-cols-2">
            <div className={`min-w-0 [overflow-wrap:anywhere] ${changed && existing ? "rounded-md bg-danger/10 p-2 text-danger-700 dark:text-danger-300" : ""}`}>
              <p className="mb-1 text-sm font-medium md:hidden">{t("oldValue")}</p>
              <div className={changed && existing ? "line-through" : ""}><RequestDataValue value={oldValue} field={key} /></div>
            </div>
            <div className={`min-w-0 [overflow-wrap:anywhere] ${changed ? "rounded-md bg-success/10 p-2 text-success-800 dark:text-success-300" : ""}`}>
              <p className="mb-1 text-sm font-medium md:hidden">{t("newValue")}</p>
              <RequestDataValue value={newValue} field={key} />
            </div>
          </div>
        </div>;
      })}
    </div>
  </div>;
}
