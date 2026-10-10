import { useTranslations } from "next-intl";

interface DataDisplayProps {
  data: Record<string, unknown>;
  title?: string;
  isNested?: boolean;
}

const RELATION_TYPE_KEYS = ['relationType', 'newRelationType', 'originalRelationType'];

export function RequestDataValue({ value, field }: { value: unknown; field?: string }) {
  const t = useTranslations("RequestDetails");
  const tRelations = useTranslations("RelationTypes");
  if (value === null || value === undefined || value === '') return <span className="text-muted-foreground italic">{t("empty")}</span>;
  if (Array.isArray(value)) return value.length === 0
    ? <span className="text-muted-foreground italic">{t("emptyArray")}</span>
    : <ul className="min-w-0 space-y-2">{value.map((item, index) => <li key={index} className="min-w-0"><RequestDataValue value={item} /></li>)}</ul>;
  if (typeof value === 'object') return <DataDisplay data={value as Record<string, unknown>} isNested />;
  const text = field && RELATION_TYPE_KEYS.includes(field) && typeof value === 'string' && tRelations.has(value)
    ? tRelations(value) : String(value);
  return <bdi className="whitespace-pre-wrap [overflow-wrap:anywhere]">{text}</bdi>;
}

export function DataDisplay({ data, title, isNested = false }: DataDisplayProps) {
  const tDb = useTranslations("DbFieldLabels");
  const t = useTranslations("RequestDetails");
  const keys = Object.keys(data);
  return <div className={`min-w-0 max-w-full ${isNested ? "" : "rounded-md border border-border"}`}>
    {title && !isNested && <div className="border-b border-border bg-muted/50 px-4 py-3"><h3 className="text-lg font-semibold [overflow-wrap:anywhere]">{title}</h3></div>}
    <dl className={isNested ? "" : "divide-y divide-border"}>
      {keys.length === 0 && <div className="px-4 py-3 text-muted-foreground">{t("empty")}</div>}
      {keys.map(key => <div key={key} className={`grid min-w-0 grid-cols-1 gap-x-4 gap-y-1 py-3 text-base md:grid-cols-3 ${isNested ? 'border-t border-border' : 'px-4'}`}>
        <dt className="min-w-0 font-medium text-foreground [overflow-wrap:anywhere]">{tDb.has(key) ? tDb(key) : key}</dt>
        <dd className="min-w-0 [overflow-wrap:anywhere] md:col-span-2"><RequestDataValue value={data[key]} field={key} /></dd>
      </div>)}
    </dl>
  </div>;
}
