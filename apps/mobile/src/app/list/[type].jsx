import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import api from '@hijistream/shared/utils/api';
import { getAllWatchProgress } from '@hijistream/shared/utils/player';
import { useTranslation } from '@hijistream/shared/i18n';
import { colors, spacing } from '@hijistream/shared/theme';
import ContentGrid from '../../components/ContentGrid';

const LIST_CONFIG = {
  'trending-movies': {
    titleKey: ['common.trending', 'nav.movies'],
    contentType: 'movie',
    fetcher: (page) => api.getTrendingMovies(page),
  },
  'trending-tv': {
    titleKey: ['common.trending', 'nav.tvShows'],
    contentType: 'tv',
    fetcher: (page) => api.getTrendingTV(page),
  },
  'on-the-air': {
    titleKey: ['common.ongoing'],
    contentType: 'tv',
    fetcher: (page) => api.getTVOnTheAir(page),
  },
  'anime-trending': {
    titleKey: ['common.trending', 'nav.anime'],
    contentType: 'tv',
    fetcher: (page) => api.getAnimeTrending(page),
  },
  'anime-ongoing': {
    titleKey: ['common.ongoing', 'nav.anime'],
    contentType: 'tv',
    fetcher: (page) => api.getAnimeOngoing(page),
  },
  'anime-top-rated': {
    titleKey: ['common.topRated', 'nav.anime'],
    contentType: 'tv',
    fetcher: (page) => api.getAnimeTopRated(page),
  },
  'popular-movies': {
    titleKey: ['common.popular', 'nav.movies'],
    contentType: 'movie',
    fetcher: (page) => api.getPopularMovies(page),
  },
  'top-rated-movies': {
    titleKey: ['common.topRated', 'nav.movies'],
    contentType: 'movie',
    fetcher: (page) => api.getTopRatedMovies(page),
  },
  'upcoming-movies': {
    titleKey: ['common.upcoming', 'nav.movies'],
    contentType: 'movie',
    fetcher: (page) => api.getUpcomingMovies(page),
  },
  'popular-tv': {
    titleKey: ['common.popular', 'nav.tvShows'],
    contentType: 'tv',
    fetcher: (page) => api.getPopularTV(page),
  },
  'top-rated-tv': {
    titleKey: ['common.topRated', 'nav.tvShows'],
    contentType: 'tv',
    fetcher: (page) => api.getTopRatedTV(page),
  },
};

export default function ListScreen() {
  const { type } = useLocalSearchParams();
  const router = useRouter();
  const { t, locale } = useTranslation();

  const isContinueWatching = type === 'continue-watching';
  const config = LIST_CONFIG[type];

  // ---- Continue Watching branch (read-only from local storage) ----
  const [progressItems, setProgressItems] = useState([]);
  const [progressLoading, setProgressLoading] = useState(isContinueWatching);

  useEffect(() => {
    if (!isContinueWatching) return;
    let alive = true;
    (async () => {
      const data = await getAllWatchProgress();
      if (!alive) return;
      setProgressItems(Array.isArray(data) ? data : []);
      setProgressLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [isContinueWatching]);

  // ---- Paginated API branch ----
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['list-page', type, locale],
    queryFn: ({ pageParam }) => config.fetcher(pageParam),
    enabled: !!config && !isContinueWatching,
    getNextPageParam: (lastPage) =>
      lastPage?.items?.length && lastPage.page < lastPage.total_pages
        ? lastPage.page + 1
        : undefined,
    initialPageParam: 1,
  });

  // ---- Compose title and items based on branch ----
  let title = '';
  let items = [];
  let loading = false;
  let listError = null;
  let onRetry;
  let onEndReached;
  let contentType = 'movie';

  if (isContinueWatching) {
    title = t('common.continueWatching');
    items = progressItems;
    loading = progressLoading;
    contentType = 'movie';
  } else if (config) {
    title = config.titleKey.map((k) => t(k)).filter(Boolean).join(' ');
    items = data?.pages?.flatMap((p) => p.items || []) || [];
    loading = isLoading;
    listError = error;
    onRetry = refetch;
    onEndReached = fetchNextPage;
    contentType = config.contentType;
  } else {
    title = t('common.error');
    listError = new Error('Unknown list type');
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft color={colors.text} size={26} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>
      <ContentGrid
        items={items}
        type={contentType}
        isLoading={loading}
        error={listError}
        onRetry={onRetry}
        onEndReached={onEndReached}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backButton: {
    padding: spacing.xs,
    minWidth: 40,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
  },
});
