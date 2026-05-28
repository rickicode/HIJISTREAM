import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useTranslation } from '../i18n';
import api, { TMDB_COUNTRIES, SORT_OPTIONS } from '../utils/api';
import TabNavigation from '../components/TabNavigation';
import ContentGrid from '../components/ContentGrid';

export default function CountryDetail() {
  const { code } = useParams();
  const { t, locale } = useTranslation();
  const [sortBy, setSortBy] = useState('popularity.desc');

  const country = TMDB_COUNTRIES.find((c) => c.iso === code);
  const countryName = country ? `${country.flag} ${t(`countries.${country.code}`)}` : code;

  useEffect(() => {
    document.title = `${countryName} - HIJISTREAM`;
  }, [countryName]);

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['country-detail', code, locale, sortBy],
    queryFn: ({ pageParam }) =>
      api.getDiscoverByCountry('movie', code, pageParam, sortBy),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage?.items?.length > 0) return allPages.length + 1;
      return undefined;
    },
  });

  const items = data?.pages?.flatMap((page) => page?.items || []) || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-white mb-6">{countryName}</h1>
      <TabNavigation
        tabs={SORT_OPTIONS.map((opt) => ({ id: opt.id, label: t(opt.label) }))}
        activeTab={sortBy}
        onTabChange={setSortBy}
      />
      <div className="mt-6">
        <ContentGrid
          items={items}
          type="movie"
          isLoading={isLoading}
          error={error}
          onRetry={refetch}
        />

        {hasNextPage && (
          <div className="flex justify-center mt-8">
            <button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="px-6 py-3 bg-primary hover:bg-primary/80 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {isFetchingNextPage ? t('common.loading') : t('common.seeAll')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
