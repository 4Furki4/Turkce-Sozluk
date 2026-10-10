// src/components/requests/details/RawDataViewer.tsx
import { FC } from 'react';
import { useTranslations } from 'next-intl';

interface RawDataViewerProps {
  data: any;
}

export const RawDataViewer: FC<RawDataViewerProps> = ({ data }) => {
  const t = useTranslations("RequestDetails.RawDataViewer");

  return (
    <details className="mt-4 min-w-0 max-w-full rounded-md border border-border bg-background/40 px-4">
      <summary className="min-h-11 cursor-pointer py-3 font-medium text-foreground [overflow-wrap:anywhere] focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2">
        {t('viewRawData')}
      </summary>
      <pre tabIndex={0} className="mb-4 max-h-96 min-w-0 max-w-full overflow-auto rounded-md bg-muted/50 p-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-primary">
        {JSON.stringify(data, null, 2)}
      </pre>
    </details>
  );
};
