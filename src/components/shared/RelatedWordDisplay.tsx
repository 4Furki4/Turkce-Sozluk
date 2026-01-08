"use client";

import { api } from "@/src/trpc/react";
import { useLocale } from "next-intl";

interface RelatedWordDisplayProps {
  relatedWordId: string | number;
}

export default function RelatedWordDisplay({ relatedWordId }: RelatedWordDisplayProps) {
  const locale = useLocale();
  const numericId = Number(relatedWordId);

  const { data, isLoading, isError, error } = api.word.getWordById.useQuery(
    { id: numericId },
    { enabled: !isNaN(numericId) }
  );

  if (isNaN(numericId)) {
    return <span className="text-danger-500">Invalid ID</span>;
  }

  if (isLoading) {
    return <span className="text-default-500">Loading...</span>;
  }

  if (isError) {
    console.error("Error fetching related word:", error);
    return <span className="text-danger-500">Error</span>;
  }

  if (!data || !data.name) { // Check for name as a proxy for successful data load {
    return <span className="text-default-500">Not found</span>;
  }

  // Assuming the word object has a 'name' field 
  // and potentially 'prefix' and 'suffix' like in request-detail.tsx
  const wordName = data.name;
  const prefix = data.prefix;
  const suffix = data.suffix;

  return (
    <span className="font-medium">
      {prefix ? <span className="text-sm text-default-600">{prefix}-</span> : null}
      {wordName}
      {suffix ? <span className="text-sm text-default-600">-{suffix}</span> : null}
    </span>
  );
}
