import { useState, useEffect, useRef } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import api from '../utils/api';
import TabNavigation from '../components/TabNavigation';
import ContentGrid from '../components/ContentGrid';

const tabs = [
  { id: 'trending', label: 'Trending' },
  { id: 'ongoing', label: 'Ongoing' },
  { id: 'top-rated', label: 'Top Rated' },
];

const apiFns = {
  trending: (page) => api.getAnimeTrending(page),
  ongoing: (page) => api.getAnimeOngoing(page),
  'top-rated': (page) => api.getAnimeTopRated(page),
};

export default function Anime() {
  const [activeTab, setActiveTab] = useState('trending');
  const observerRef = useRef(null);

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['anime', activeTab],
    queryFn: ({ pageParam = 1 }) => apiFns[activeTab](pageParam),
    getNextPageParam: (lastPage) => {
      if (lastPage?.items?.length && lastPage.page < lastPage.total_pages) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
  });

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );
    if (observerRef.current) observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    document.title = 'Anime - HIJISTREAM';
  }, []);

  const items = data?.pages?.flatMap((page) => page.items || []) || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8">
      <h1 className="text-2xl font-bold text-white mb-6">Anime</h1>
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
          <div ref={observerRef} className="flex justify-center py-8">
            {isFetchingNextPage && (
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
