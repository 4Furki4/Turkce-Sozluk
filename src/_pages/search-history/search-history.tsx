'use client';

import { useLocale, useTranslations } from 'next-intl';
import { api } from '@/src/trpc/react';
import { Alert, Button } from '@heroui/react';
import { Clock, AlertTriangle, RefreshCw, Trash2, ArrowRight } from 'lucide-react';
import { format, formatDate, formatRelative } from 'date-fns';
import { Link } from '@/src/i18n/routing';
import { useSnapshot } from 'valtio';
import { preferencesState } from '@/src/store/preferences';
import { useDisclosure } from '@heroui/react'
import ClearSearchHistory from '@/src/components/customs/modals/clear-search-history';
import { enUS, tr } from 'date-fns/locale';

interface SearchHistoryProps {
  userId: string;
}

export default function SearchHistory({ userId }: SearchHistoryProps) {
  const t = useTranslations('SearchHistory');
  const navT = useTranslations('Navbar');
  const { isOpen, onOpen, onClose } = useDisclosure();
  const locale = useLocale()
  const { isBlurEnabled } = useSnapshot(preferencesState);

  const [searchHistory, { error, refetch, isRefetching, isSuccess }] = api.user.getUserSearchHistory.useSuspenseQuery(
    { limit: 50 },
    {
      refetchOnWindowFocus: true,
    }
  );
  const { mutateAsync: clearUserSearchHistory } = api.user.clearUserSearchHistory.useMutation();

  const handleRefresh = () => {
    void refetch();
  };

  const clearHistory = async () => {
    await clearUserSearchHistory();
    await refetch();
    onClose()
  };

  // Error state
  if (error) {
    return (
      <div className="container mx-auto py-12 px-4">
        <h1 className="text-3xl font-bold mb-6 font-serif text-foreground">{navT('SearchHistory')}</h1>
        <Alert color="danger" variant="flat">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <div className="flex flex-col">
              <span className="font-semibold">Error</span>
              <span className="text-sm">{t('error')}</span>
            </div>
          </div>
        </Alert>
      </div>
    );
  }

  // Empty history state
  if (isSuccess && (!searchHistory || searchHistory.length === 0)) {
    return (
      <div className="container mx-auto py-12 px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold font-serif text-foreground">{navT('SearchHistory')}</h1>
        </div>

        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-zinc-800 rounded-lg bg-zinc-900/20">
          <div className="w-16 h-16 bg-zinc-800/50 rounded-full flex items-center justify-center mb-4">
            <Clock className="w-8 h-8 text-zinc-500" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">{t('emptyHistory')}</h3>
          <p className="text-muted-foreground max-w-xs mb-6 text-balance">{t('startSearching')}</p>
          <Button
            as={Link}
            href="/"
            color="primary"
            variant="flat"
            startContent={<RefreshCw className="w-4 h-4" />}
          >
            {navT('Home')}
          </Button>
        </div>
      </div>
    );
  }

  // Render search history
  return (
    <div className="container mx-auto py-12 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold font-serif text-foreground">{navT('SearchHistory')}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {searchHistory?.length} {searchHistory?.length === 1 ? t('item') : t('items')}
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onPress={handleRefresh}
            variant="light"
            isIconOnly
            aria-label={t('refresh')}
            isLoading={isRefetching}
            className="text-zinc-400 hover:text-foreground"
          >
            <RefreshCw className={`w-5 h-5 ${isRefetching ? 'animate-spin' : ''}`} />
          </Button>

          <Button
            onPress={onOpen}
            variant="flat"
            color="danger"
            startContent={<Trash2 className="w-4 h-4" />}
            className="px-4"
          >
            {t('clearHistory')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {searchHistory?.map((item, index) => (
          <Link
            href={{
              pathname: '/search/[word]',
              params: {
                word: item.wordName
              }
            }}
            key={`${item.wordId}-${index}`}
            className="group relative flex flex-col justify-between p-4 bg-background/60 border border-border rounded-xl hover:bg-background/90 hover:border-border transition-all duration-300"
          >
            <div className="flex items-start justify-between mb-3">
              <p

                className="text-lg font-serif font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1"
              >
                {String(item.wordName)}
              </p>
              <ArrowRight className="w-4 h-4 text-zinc-700 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300 shrink-0" />
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-auto pt-2 border-t border-zinc-800/50">
              <Clock className="w-3 h-3" />
              <span className="opacity-80">
                {formatRelative(item.searchedAt, new Date(), {
                  locale: locale === 'tr' ? tr : enUS,
                })}
              </span>
            </div>
          </Link>
        ))}
      </div>

      <ClearSearchHistory isOpen={isOpen} onClose={onClose} onClear={clearHistory} />
    </div>
  );
}
