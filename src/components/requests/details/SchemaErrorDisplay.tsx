// src/components/requests/details/SchemaErrorDisplay.tsx
import { FC } from "react";
import { ZodError } from "zod";
import { useTranslations } from "next-intl";

interface SchemaErrorDisplayProps {
  error: ZodError;
  title?: string;
}

const SchemaErrorDisplay: FC<SchemaErrorDisplayProps> = ({ error, title }) => {
  const t = useTranslations("RequestDetails");

  return (
    <div className="p-4 border border-danger-500 bg-danger-50 rounded-sm text-danger-700">
      <h3 className="font-bold text-lg mb-2">{title || t("SchemaError.title")}</h3>
      <p className="mb-3">{t("SchemaError.description")}</p>
      <ul className="list-disc list-inside space-y-1">
        {error.issues.map((issue, index) => (
          <li key={index}>
            <span className="font-semibold">{issue.path.join(".")}</span>: {issue.message}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SchemaErrorDisplay;
