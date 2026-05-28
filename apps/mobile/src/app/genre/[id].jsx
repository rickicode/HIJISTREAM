import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import api, { GENRE_IDS } from '../../utils/api';
import { useTranslation } from '../../i18n';
import { colors, spacing, typography } from '../../theme';
import ContentGrid from '../../components/ContentGrid';

export default function GenreDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { t, getApiLocale } = useTranslation();

  const genreKey = Object.keys(GENRE_IDS).find(
    (key) => String(GENRE_IDS[key]) === String(id)
  );
  const genreName = genreKey ? t(`genres.${genreKey}`) : '';
  const language = getApiLocale();

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['genre-detail', id, language],
    queryFn: ({ pageParam }) =>
      api.getDiscoverByGenre('movie', id, language, pageParam),
    getNextPageParam: (lastPage) =>
      lastPage?.items?.length && lastPage.page < lastPage.total_pages
        ? lastPage.page + 1
        : undefined,
    initialPageParam: 1,
  });

  const items = data?.pages?.flatMap((page) => page.items || []) || [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft color={colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>{genreName}</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  backButton: {
    marginRight: spacing.sm,
    padding: spacing.xs,
  },
  title: {
    color: colors.text,
    ...typography.title,
  },
});
