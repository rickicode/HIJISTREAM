import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import api from '../utils/api';
import TabNavigation from '../components/TabNavigation';
import ContentGrid from '../components/ContentGrid';

const tabs = [
  { id: 'latest', label: 'Latest' },
  { id: 'trending', label: 'Trending' },
  { id: 'top-rated', label: 'Top Rated' },
  { id: 'upcoming', label: 'Upcoming' },
];

const apiFns = {
  latest: (page) => api.getLatestMovies(page),
  trending: (page) => api.getTrendingMovies(page),
  'top-rated': (page) => api.getTopRatedMovies(page),
  upcoming: (page) => api.getUpcomingMovies(page),
};

export default function Movies() {
  const [activeTab, setActiveTab] = useState('latest');

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['movies', activeTab],
    queryFn: ({ pageParam = 1 }) => apiFns[activeTab](pageParam),
    getNextPageParam: (lastPage) => {
      if (lastPage?.items?.length && lastPage.page < lastPage.total_pages) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
  });

  const items = data?.pages?.flatMap((page) => page.items || []) || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Movies</h1>
      <TabNavigation tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
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
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isFetchingNextPage ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
