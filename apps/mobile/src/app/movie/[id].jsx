import { ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import DetailHero from '../../components/DetailHero';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';

export default function MovieDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const { data: movie, isLoading, error, refetch } = useQuery({
    queryKey: ['movie', id],
    queryFn: () => api.getMovieDetails(id),
  });

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
      <DetailHero item={movie} type="movie" onPlay={handlePlay} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
});
