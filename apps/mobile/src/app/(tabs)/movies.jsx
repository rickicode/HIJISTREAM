import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import { colors } from '../../theme';
import TabBar from '../../components/TabBar';
import ContentGrid from '../../components/ContentGrid';

const TABS = [
  { id: 'popular', label: 'Popular' },
  { id: 'trending', label: 'Trending' },
  { id: 'top-rated', label: 'Top Rated' },
  { id: 'upcoming', label: 'Upcoming' },
];

function fetchMovies(tab, page) {
  switch (tab) {
    case 'popular':
      return api.getPopularMovies(page);
    case 'trending':
      return api.getTrendingMovies(page);
    case 'top-rated':
      return api.getTopRatedMovies(page);
    case 'upcoming':
      return api.getUpcomingMovies(page);
    default:
      return api.getPopularMovies(page);
  }
}

export default function MoviesScreen() {
  const [activeTab, setActiveTab] = useState('popular');

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['movies', activeTab],
    queryFn: ({ pageParam }) => fetchMovies(activeTab, pageParam),
    getNextPageParam: (lastPage) =>
      lastPage?.items?.length && lastPage.page < lastPage.total_pages
        ? lastPage.page + 1
        : undefined,
    initialPageParam: 1,
  });

  const items = data?.pages?.flatMap((page) => page.items || []) || [];

  return (
    <View style={styles.container}>
      <ContentGrid
        items={items}
        type="movie"
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        onEndReached={fetchNextPage}
        ListHeaderComponent={
          <TabBar tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
