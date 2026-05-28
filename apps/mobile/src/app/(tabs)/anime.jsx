import { View, FlatList, StyleSheet, Text } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import { colors, spacing, typography } from '../../theme';
import ContentRail from '../../components/ContentRail';

export default function AnimeScreen() {
  const { data: trending, isLoading: trendingLoading } = useQuery({
    queryKey: ['anime-trending'],
    queryFn: () => api.getAnimeTrending(1),
  });

  const { data: ongoing, isLoading: ongoingLoading } = useQuery({
    queryKey: ['anime-ongoing'],
    queryFn: () => api.getAnimeOngoing(1),
  });

  const { data: topRated, isLoading: topRatedLoading } = useQuery({
    queryKey: ['anime-top-rated'],
    queryFn: () => api.getAnimeTopRated(1),
  });

  const trendingItems = trending?.items?.slice(0, 10) || [];
  const ongoingItems = ongoing?.items?.slice(0, 10) || [];
  const topRatedItems = topRated?.items?.slice(0, 10) || [];

  const sections = [
    { key: 'trending', title: 'Trending Anime', items: trendingItems, isLoading: trendingLoading },
    { key: 'ongoing', title: 'Ongoing Anime', items: ongoingItems, isLoading: ongoingLoading },
    { key: 'top-rated', title: 'Top Rated Anime', items: topRatedItems, isLoading: topRatedLoading },
  ];

  const renderSection = ({ item: section }) => (
    <ContentRail
      title={section.title}
      items={section.items}
      type="tv"
      isLoading={section.isLoading}
    />
  );

  return (
    <FlatList
      data={sections}
      keyExtractor={(item) => item.key}
      renderItem={renderSection}
      style={styles.container}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.title}>Anime</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.md,
  },
  title: {
    color: colors.text,
    ...typography.hero,
    fontSize: 28,
  },
});
