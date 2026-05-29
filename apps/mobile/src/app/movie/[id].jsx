import { View, Text, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import { useTranslation } from '../../i18n';
import { colors, spacing } from '../../theme';
import DetailHero from '../../components/DetailHero';
import ContentCard from '../../components/ContentCard';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';

export default function MovieDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { t } = useTranslation();
  const { width: screenWidth } = useWindowDimensions();

  const gap = spacing.sm; // 8
  const padding = spacing.md; // 16
  const numColumns = screenWidth < 600 ? 3 : screenWidth < 900 ? 4 : 5;
  const cardWidth = (screenWidth - padding * 2 - gap * (numColumns - 1)) / numColumns;

  const { data: movie, isLoading, error, refetch } = useQuery({
    queryKey: ['movie', id],
    queryFn: () => api.getMovieDetails(id),
  });

  const { data: recommendations } = useQuery({
    queryKey: ['movie-recommendations', id],
    queryFn: () => api.getMovieRecommendations(id),
    enabled: !!movie,
  });

  const recommendedItems = recommendations?.items?.slice(0, 12) || [];

  if (isLoading) {
    return <LoadingState type="detail" />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={refetch} />;
  }

  const handlePlay = () => {
    router.push({
      pathname: '/player',
      params: {
        type: 'movie',
        id: movie.imdb_id || id,
        title: movie.title,
        poster_url: movie.poster_url || '',
        backdrop_url: movie.backdrop_url || '',
      },
    });
  };

  return (
    <ScrollView style={styles.container}>
      <DetailHero item={movie} type="movie" onPlay={handlePlay} />
      {recommendedItems.length > 0 && (
        <View style={styles.recommendSection}>
          <Text style={styles.recommendTitle}>
            {t('common.moreLikeThis')}
          </Text>
          <View style={styles.recommendGrid}>
            {recommendedItems.map((item) => (
              <View key={String(item.id || item.tmdb_id)} style={{ width: cardWidth }}>
                <ContentCard item={item} type="movie" />
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  recommendSection: {
    padding: spacing.md,
  },
  recommendTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  recommendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
