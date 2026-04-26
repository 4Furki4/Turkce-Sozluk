import { useTranslations } from "next-intl";

interface DiffTableProps {
  oldData?: Record<string, any>;
  newData?: Record<string, any>;
}

const DiffTable: React.FC<DiffTableProps> = ({ oldData, newData }) => {
  const t = useTranslations("RequestDetails.DiffTable");
  const tDb = useTranslations("DbFieldLabels");

  if (!newData) {
    return <div>{t("noData")}</div>;
  }

  const allKeys = Object.keys(newData);

  const renderValue = (value: any) => {
    if (value === undefined || value === null) {
      return <span className="text-muted-foreground">N/A</span>;
    }
    if (Array.isArray(value)) {
      return value.length > 0 ? value.join(', ') : <span className="text-muted-foreground">-</span>;
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  };

  return (
    <div className="border rounded-md">
      {/* Desktop Header */}
      <div className="hidden md:grid md:grid-cols-3 gap-4 px-4 py-2 bg-muted/50 font-semibold text-sm border-b border-border">
        <div>{t("field")}</div>
        <div>{t("oldValue")}</div>
        <div>{t("newValue")}</div>
      </div>

      {/* Data Rows */}
      <div className="divide-y divide-border">
        {allKeys.map((key) => {
          const oldValue = oldData?.[key];
          const newValue = newData?.[key];
          const isChanged = JSON.stringify(oldValue) !== JSON.stringify(newValue);
          const isNewField = oldValue === undefined;

          return (
            <div key={key} className="grid grid-cols-1 md:grid-cols-3 gap-x-4 px-4 py-3 text-sm items-start">
              {/* Field Label */}
              <div className="font-semibold md:font-medium mb-1 md:mb-0">{tDb(key as any)}</div>

              {/* Values */}
              <div className="col-span-2 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                {/* Old Value */}
                <div className={isChanged && !isNewField ? "p-2 rounded bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400" : ""}>
                  <span className="font-bold text-xs text-muted-foreground md:hidden">OLD: </span>
                  <span className={isChanged && !isNewField ? "line-through" : ""}>
                    {isNewField ? <span className="text-muted-foreground">-</span> : renderValue(oldValue)}
                  </span>
                </div>

                {/* New Value */}
                <div className={isChanged ? "p-2 rounded bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400" : ""}>
                  <span className="font-bold text-xs text-muted-foreground md:hidden">NEW: </span>
                  {isChanged ? renderValue(newValue) : <span className="text-muted-foreground">-</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export { DiffTable };