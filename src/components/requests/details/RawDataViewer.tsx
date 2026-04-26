// src/components/requests/details/RawDataViewer.tsx
import { FC } from 'react';
import { useTranslations } from 'next-intl';

interface RawDataViewerProps {
  data: any;
}

export const RawDataViewer: FC<RawDataViewerProps> = ({ data }) => {
  const t = useTranslations("RequestDetails.RawDataViewer");

  return (
    <details className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-md">
      <summary className="cursor-pointer font-semibold text-gray-700 dark:text-gray-300">
        {t('viewRawData')}
      </summary>
      <pre className="mt-2 p-2 bg-gray-200 dark:bg-gray-900 rounded-md overflow-auto text-sm text-gray-800 dark:text-gray-200">
        {JSON.stringify(data, null, 2)}
      </pre>
    </details>
  );
};
