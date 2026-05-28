import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import api, { GENRE_IDS, SORT_OPTIONS } from '../../utils/api';
import { useTranslation } from '../../i18n';
import { colors, spacing, typography } from '../../theme';
import TabBar from '../../components/TabBar';
import ContentGrid from '../../components/ContentGrid';

export default function GenreDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { t, locale } = useTranslation();
  const [sortBy, setSortBy] = useState('popularity.desc');

  const genreKey = Object.keys(GENRE_IDS).find(
    (key) => String(GENRE_IDS[key]) === String(id)
  );
  const genreName = genreKey ? t(`genres.${genreKey}`) : '';

  const sortTabs = SORT_OPTIONS.map((opt) => ({ id: opt.id, label: t(opt.label) }));

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['genre-detail', id, locale, sortBy],
    queryFn: ({ pageParam }) =>
      api.getDiscoverByGenre('movie', id, pageParam, sortBy),
    getNextPageParam: (lastPage) =>
      lastPage?.items?.length && lastPage.page < lastPage.total_pages
        ? lastPage.page + 1
        : undefined,
    initialPageParam: 1,
  });

  const items = data?.pages?.flatMap((page) => page.items || []) || [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.heroHeader}>
        <View style={styles.heroBackground} />
        <View style={styles.heroOverlay} />
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft color={colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.heroTitle}>{genreName}</Text>
      </View>
      <View style={styles.filterSection}>
        <TabBar tabs={sortTabs} activeTab={sortBy} onTabChange={setSortBy} variant="pill" />
      </View>
      <ContentGrid
        items={items}
        type="movie"
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        onEndReached={fetchNextPage}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  heroHeader: {
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  heroBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.primary,
    opacity: 0.15,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20,20,20,0.6)',
  },
  backButton: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    padding: spacing.xs,
  },
  heroTitle: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
  },
  filterSection: {
    paddingVertical: spacing.sm,
  },
});
