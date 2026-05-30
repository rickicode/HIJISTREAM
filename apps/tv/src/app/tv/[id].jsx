import { useEffect, useState } from 'react';
import { View, Text, Image, FlatList, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Play, Plus, Check } from 'lucide-react-native';
import api from '@hijistream/shared/utils/api';
import { loadWatchProgress } from '@hijistream/shared/utils/player';
import useMyList from '@hijistream/shared/hooks/useMyList';
import { colors, spacing, borderRadius } from '@hijistream/shared/theme';
import TVFocusable from '../../components/TVFocusable';
import ContentCard from '../../components/ContentCard';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function TVShowDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [show, setShow] = useState(null);
  const [seasons, setSeasons] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [episodes, setEpisodes] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const { inList, toggle } = useMyList(show, 'tv');

  useEffect(() => {
    loadShow();
  }, [id]);

  useEffect(() => {
    if (show) loadSeasonEpisodes(selectedSeason);
  }, [selectedSeason, show]);

  async function loadShow() {
    try {
      const [detail, recs] = await Promise.all([
        api.getTVDetails(id),
        api.getTVRecommendations(id),
      ]);
      setShow(detail);
      setRecommendations(recs?.items || []);
      if (detail.seasons) {
        const filteredSeasons = detail.seasons.filter(s => s.season_number > 0);
        setSeasons(filteredSeasons);
      }
    } catch (err) {
      console.error('Failed to load show:', err);
    }
  }

  async function loadSeasonEpisodes(season) {
    try {
      const data = await api.getTVSeason(id, season);
      setEpisodes(data?.episodes || []);
    } catch (err) {
      console.error('Failed to load episodes:', err);
    }
  }

  const handlePlayEpisode = (episode) => {
    router.push({
      pathname: '/player',
      params: {
        id,
        type: 'tv',
        title: show.title || show.name,
        season: episode.season_number || selectedSeason,
        episode: episode.episode_number,
      },
    });
  };

  if (!show) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const backdrop = show.backdrop_url || show.poster_url;
  const year = show.first_air_date ? show.first_air_date.split('-')[0] : '';
  const rating = show.vote_average ? (Math.round(show.vote_average * 10) / 10).toFixed(1) : '';
  const genres = show.genres
    ? show.genres.map(g => typeof g === 'string' ? g : g.name).join(', ')
    : '';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heroSection}>
        {backdrop && (
          <Image source={{ uri: backdrop }} style={styles.backdrop} resizeMode="cover" />
        )}
        <LinearGradient
          colors={['transparent', colors.background]}
          style={styles.gradient}
        />
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.title}>{show.title || show.name}</Text>
        <View style={styles.metaRow}>
          {year ? <Text style={styles.metaText}>{year}</Text> : null}
          {rating ? <Text style={styles.ratingText}>{rating}/10</Text> : null}
          {show.number_of_seasons ? (
            <Text style={styles.metaText}>{show.number_of_seasons} Seasons</Text>
          ) : null}
        </View>
        {genres ? <Text style={styles.genres}>{genres}</Text> : null}
        {show.overview ? (
          <Text style={styles.overview}>{show.overview}</Text>
        ) : null}

        <View style={styles.actions}>
          <TVFocusable
            onPress={() => handlePlayEpisode({ season_number: 1, episode_number: 1 })}
            style={styles.playButton}
            focusScale={1.08}
            hasTVPreferredFocus
          >
            <Play size={22} color="#000" fill="#000" />
            <Text style={styles.playText}>Play S1:E1</Text>
          </TVFocusable>
          <TVFocusable
            onPress={toggle}
            style={styles.listButton}
            focusScale={1.08}
          >
            {inList ? <Check size={22} color={colors.text} /> : <Plus size={22} color={colors.text} />}
            <Text style={styles.listText}>{inList ? 'In My List' : 'My List'}</Text>
          </TVFocusable>
        </View>
      </View>

      {/* Season Selector */}
      {seasons.length > 1 && (
        <View style={styles.seasonRow}>
          <FlatList
            data={seasons}
            renderItem={({ item }) => (
              <TVFocusable
                onPress={() => setSelectedSeason(item.season_number)}
                style={[
                  styles.seasonButton,
                  selectedSeason === item.season_number && styles.seasonButtonActive,
                ]}
                focusScale={1.05}
              >
                <Text
                  style={[
                    styles.seasonText,
                    selectedSeason === item.season_number && styles.seasonTextActive,
                  ]}
                >
                  Season {item.season_number}
                </Text>
              </TVFocusable>
            )}
            keyExtractor={(item) => String(item.season_number)}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.seasonList}
            ItemSeparatorComponent={() => <View style={{ width: spacing.sm }} />}
          />
        </View>
      )}

      {/* Episode List */}
      {episodes.length > 0 && (
        <View style={styles.episodeSection}>
          <Text style={styles.sectionTitle}>Episodes</Text>
          {episodes.map((ep) => (
            <TVFocusable
              key={ep.episode_number}
              onPress={() => handlePlayEpisode(ep)}
              style={styles.episodeItem}
              focusScale={1.02}
            >
              <View style={styles.episodeThumb}>
                {ep.still_path ? (
                  <Image
                    source={{ uri: `https://image.tmdb.org/t/p/w300${ep.still_path}` }}
                    style={styles.episodeImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.episodeImage, { backgroundColor: colors.card }]} />
                )}
              </View>
              <View style={styles.episodeInfo}>
                <Text style={styles.episodeNumber}>Episode {ep.episode_number}</Text>
                <Text style={styles.episodeName} numberOfLines={1}>{ep.name || `Episode ${ep.episode_number}`}</Text>
                {ep.overview ? (
                  <Text style={styles.episodeOverview} numberOfLines={2}>{ep.overview}</Text>
                ) : null}
              </View>
            </TVFocusable>
          ))}
        </View>
      )}

      {recommendations.length > 0 && (
        <View style={styles.recommendations}>
          <Text style={styles.sectionTitle}>Recommendations</Text>
          <FlatList
            data={recommendations}
            renderItem={({ item }) => <ContentCard item={item} type="tv" />}
            keyExtractor={(item) => String(item.id)}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recList}
            ItemSeparatorComponent={() => <View style={{ width: spacing.md }} />}
          />
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
  content: {
    paddingBottom: spacing.xl,
  },
  loading: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 20,
    color: colors.textSecondary,
  },
  heroSection: {
    height: SCREEN_HEIGHT * 0.6,
    width: SCREEN_WIDTH,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.6,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  infoSection: {
    paddingHorizontal: spacing.xl,
    marginTop: -spacing.xxl,
  },
  title: {
    fontSize: 42,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  metaText: {
    fontSize: 18,
    color: colors.textSecondary,
  },
  ratingText: {
    fontSize: 18,
    color: colors.rating,
    fontWeight: '600',
  },
  genres: {
    fontSize: 16,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  overview: {
    fontSize: 18,
    color: colors.textSecondary,
    lineHeight: 26,
    marginBottom: spacing.lg,
    maxWidth: '70%',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 6,
    gap: spacing.sm,
  },
  playText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  listButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(109,109,110,0.7)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 6,
    gap: spacing.sm,
  },
  listText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  seasonRow: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  seasonList: {
    paddingVertical: spacing.sm,
  },
  seasonButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 6,
    backgroundColor: colors.card,
  },
  seasonButtonActive: {
    backgroundColor: colors.primary,
  },
  seasonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  seasonTextActive: {
    color: colors.text,
  },
  episodeSection: {
    paddingHorizontal: spacing.xl,
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  episodeItem: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundElevated,
  },
  episodeThumb: {
    width: 200,
    height: 112,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    marginRight: spacing.md,
  },
  episodeImage: {
    width: '100%',
    height: '100%',
  },
  episodeInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  episodeNumber: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 4,
  },
  episodeName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  episodeOverview: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  recommendations: {
    paddingLeft: spacing.xl,
    marginTop: spacing.xl,
  },
  recList: {
    paddingRight: spacing.xl,
  },
});
