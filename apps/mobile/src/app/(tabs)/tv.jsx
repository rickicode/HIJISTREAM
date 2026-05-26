import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import TabBar from '../../components/TabBar';
import ContentGrid from '../../components/ContentGrid';

const TABS = [
  { id: 'latest', label: 'Latest' },
  { id: 'trending', label: 'Trending' },
  { id: 'top-rated', label: 'Top Rated' },
];

function fetchTV(tab, page) {
  switch (tab) {
    case 'latest':
      return api.getLatestTV(page);
    case 'trending':
      return api.getTrendingTV(page);
    case 'top-rated':
      return api.getTopRatedTV(page);
    default:
      return api.getLatestTV(page);
  }
}

export default function TVScreen() {
  const [activeTab, setActiveTab] = useState('latest');

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['tv', activeTab],
    queryFn: ({ pageParam }) => fetchTV(activeTab, pageParam),
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
        type="tv"
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
    backgroundColor: '#0F0F0F',
  },
});
