import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import { useTranslation } from '../../i18n';
import { colors, spacing } from '../../theme';
import PlayerBox from '../../components/PlayerBox';
import DetailHero from '../../components/DetailHero';
import EpisodeList from '../../components/EpisodeList';
import ContentCard from '../../components/ContentCard';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';

export default function TVDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { t } = useTranslation();
  const { width: screenWidth } = useWindowDimensions();
  const [selectedSeason, setSelectedSeason] = useState(1);

  const { data: show, isLoading, error, refetch } = useQuery({
    queryKey: ['tv', id],
    queryFn: () => api.getTVDetails(id),
  });

  const { data: seasonData } = useQuery({
    queryKey: ['tv-season', id, selectedSeason],
    queryFn: () => api.getTVSeason(id, selectedSeason),
    enabled: !!show?.number_of_seasons,
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
        backdrop_url: show.backdrop_url || '',
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
        backdrop_url: show.backdrop_url || '',
      },
    });
  };

  return (
    <ScrollView style={styles.container}>
      <PlayerBox item={show} onPlay={handlePlay} />
      <DetailHero item={show} type="tv" />
      <EpisodeList
        episodes={seasonData?.episodes || []}
        seasons={show.number_of_seasons || 1}
        tmdbId={id}
        onPlayEpisode={handlePlayEpisode}
        onSeasonChange={setSelectedSeason}
      />
      {recommendedItems.length > 0 && (
        <View style={styles.recommendSection}>
          <Text style={styles.recommendTitle}>
            {t('common.moreLikeThis')}
          </Text>
          <View style={styles.recommendGrid}>
            {recommendedItems.map((item) => (
              <View key={String(item.id || item.tmdb_id)} style={{ width: (screenWidth - 52) / 3 }}>
                <ContentCard item={item} type="tv" />
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
    gap: 10,
  },
});
