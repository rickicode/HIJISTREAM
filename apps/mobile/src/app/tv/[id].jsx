import { ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import { colors } from '../../theme';
import DetailHero from '../../components/DetailHero';
import EpisodeList from '../../components/EpisodeList';
import ContentRail from '../../components/ContentRail';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';

export default function TVDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const { data: show, isLoading, error, refetch } = useQuery({
    queryKey: ['tv', id],
    queryFn: () => api.getTVDetails(id),
  });

  const { data: recommendations } = useQuery({
    queryKey: ['tv-recommendations', id],
    queryFn: () => api.getTVRecommendations(id),
    enabled: !!show,
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
        type: 'tv',
        id,
        season: '1',
        episode: '1',
        title: show.title,
        poster_url: show.poster_url || '',
      },
    });
  };

  const handlePlayEpisode = (season, episode) => {
    router.push({
      pathname: '/player',
      params: {
        type: 'tv',
        id,
        season: String(season),
        episode: String(episode),
        title: show.title,
        poster_url: show.poster_url || '',
      },
    });
  };

  return (
    <ScrollView style={styles.container}>
      <DetailHero item={show} type="tv" onPlay={handlePlay} />
      <EpisodeList
        episodes={show.episodes || []}
        seasons={show.number_of_seasons || 1}
        tmdbId={id}
        onPlayEpisode={handlePlayEpisode}
      />
      {recommendedItems.length > 0 && (
        <ContentRail
          title="Related Series"
          items={recommendedItems}
          type="tv"
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
