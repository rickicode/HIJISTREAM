import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import api from '../utils/api';
import TabNavigation from '../components/TabNavigation';
import ContentGrid from '../components/ContentGrid';

const tabs = [
  { id: 'latest', label: 'Latest' },
  { id: 'trending', label: 'Trending' },
  { id: 'top-rated', label: 'Top Rated' },
];

const apiFns = {
  latest: (page) => api.getLatestTV(page),
  trending: (page) => api.getTrendingTV(page),
  'top-rated': (page) => api.getTopRatedTV(page),
};

export default function TV() {
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
    queryKey: ['tv', activeTab],
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">TV Shows</h1>
      <TabNavigation tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="mt-6">
        <ContentGrid
          items={items}
          type="tv"
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
