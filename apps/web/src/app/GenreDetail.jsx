import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useTranslation } from '../i18n';
import api, { GENRE_IDS, SORT_OPTIONS } from '../utils/api';
import ContentGrid from '../components/ContentGrid';

export default function GenreDetail() {
  const { id } = useParams();
  const { t, locale } = useTranslation();
  const [sortBy, setSortBy] = useState('popularity.desc');

  const genreKey = Object.keys(GENRE_IDS).find(
    (key) => GENRE_IDS[key] === parseInt(id)
  );

  const genreName = genreKey ? t(`genres.${genreKey}`) : id;

  useEffect(() => {
    document.title = `${genreName} - HIJISTREAM`;
  }, [genreName]);

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['genre-detail', id, locale, sortBy],
    queryFn: ({ pageParam }) => api.getDiscoverByGenre('movie', id, pageParam, sortBy),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage?.items?.length > 0) return allPages.length + 1;
      return undefined;
    },
  });

  const items = data?.pages?.flatMap((page) => page?.items || []) || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-white mb-4">{genreName}</h1>

      <div className="flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-hide">
        {SORT_OPTIONS.map((option) => (
          <button
            key={option.id}
            onClick={() => setSortBy(option.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              sortBy === option.id
                ? 'bg-primary text-white'
                : 'bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700'
            }`}
          >
            {t(option.label)}
          </button>
        ))}
      </div>

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
  );
}
