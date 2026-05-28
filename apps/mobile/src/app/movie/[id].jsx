import { ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import { colors } from '../../theme';
import PlayerBox from '../../components/PlayerBox';
import DetailHero from '../../components/DetailHero';
import ContentRail from '../../components/ContentRail';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';

export default function MovieDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

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
      },
    });
  };

  return (
    <ScrollView style={styles.container}>
      <PlayerBox item={movie} onPlay={handlePlay} />
      <DetailHero item={movie} type="movie" onPlay={handlePlay} />
      {recommendedItems.length > 0 && (
        <ContentRail
          title="More Like This"
          items={recommendedItems}
          type="movie"
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
