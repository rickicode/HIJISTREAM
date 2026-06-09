/**
 * TVShowDetailScreen - Netflix-style TV show detail for Android TV
 *
 * Features:
 * - Full-bleed backdrop hero with info overlay
 * - Season selector (horizontal scroll)
 * - Episode list per season with thumbnails
 * - "More Like This" recommendations
 * - Full TV remote control with D-pad
 * - Back button handling
 */

import { useEffect, useState, useCallback } from 'react';
import { View, Text, Image, FlatList, ScrollView, StyleSheet, Dimensions, BackHandler } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Play, Plus, Check, Star, ArrowLeft } from 'lucide-react-native';
import api from '@hijistream/shared/utils/api';
import useMyList from '@hijistream/shared/hooks/useMyList';
import { getAllWatchProgress } from '@hijistream/shared/utils/player';
import { colors } from '@hijistream/shared/theme';
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
  const [episodeProgress, setEpisodeProgress] = useState({}); // { episodeKey: time }
  const { inList, toggle } = useMyList(show, 'tv');

  // Handle TV remote back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      router.back();
      return true;
    });
    return () => backHandler.remove();
  }, [router]);

  useEffect(() => {
    loadShow();
  }, [id]);

  useEffect(() => {
    if (show) loadSeasonEpisodes(selectedSeason);
  }, [selectedSeason, show]);

  const loadShow = useCallback(async () => {
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
        if (filteredSeasons.length > 0) {
          setSelectedSeason(filteredSeasons[0].season_number);
        }
      }
    } catch (err) {
      console.error('Failed to load show:', err);
    }
  }, [id]);

  const loadSeasonEpisodes = useCallback(async (season) => {
    try {
      const data = await api.getTVSeason(id, season);
      setEpisodes(data?.episodes || []);
      
      // Load watch progress for episodes
      const progress = await getAllWatchProgress();
      const progressMap = {};
      progress.forEach(p => {
        // p.id format: tv_{tmdbId}_s{season}e{episode}
        const match = p.id.match(/tv_\d+_s(\d+)e(\d+)/);
        if (match) {
          const s = parseInt(match[1], 10);
          const e = parseInt(match[2], 10);
          progressMap[`${s}_${e}`] = p.time;
        }
      });
      setEpisodeProgress(progressMap);
    } catch (err) {
      console.error('Failed to load episodes:', err);
    }
  }, [id]);

  const handlePlayEpisode = useCallback((episode) => {
    const seasonNum = episode.season_number || selectedSeason;
    const episodeNum = episode.episode_number;
    const progressKey = `${seasonNum}_${episodeNum}`;
    const resumeTime = episodeProgress[progressKey] || 0;
    
    router.push({
      pathname: '/player',
      params: {
        id,
        type: 'tv',
        title: show?.title || show?.name || 'TV Show',
        season: seasonNum,
        episode: episodeNum,
        resumeAt: resumeTime,
        imdbId: show?.imdb_id || undefined,
        tmdbId: show?.id ? String(show.id) : String(id),
      },
    });
  }, [id, show, selectedSeason, episodeProgress, router]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  if (!show) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const backdrop = show.backdrop_url || show.poster_url || (show.backdrop_path
    ? `https://image.tmdb.org/t/p/w1280${show.backdrop_path}`
    : null);
  const year = show.first_air_date ? show.first_air_date.split('-')[0] : '';
  const rating = show.vote_average ? (Math.round(show.vote_average * 10) / 10).toFixed(1) : '';
  const genres = show.genres
    ? show.genres.map(g => typeof g === 'string' ? g : g.name).join(', ')
    : '';
  const title = show.title || show.name || 'Untitled';

  return (
    <View style={styles.container}>
      {/* ── Fixed Top Header Bar ── */}
      <View style={styles.topBar}>
        <TVFocusable
          onPress={handleBack}
          style={styles.backButton}
          focusStyle={styles.backButtonFocused}
          focusScale={1.05}
          showFocusRing={true}
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={24} color="#fff" />
        </TVFocusable>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
      {/* Hero */}
      <View style={styles.heroSection}>
        {backdrop && (
          <Image source={{ uri: backdrop }} style={styles.backdrop} resizeMode="cover" />
        )}
        <LinearGradient
          colors={['transparent', 'rgba(20,20,20,0.4)', colors.background]}
          locations={[0, 0.5, 1]}
          style={styles.gradient}
        />
        <LinearGradient
          colors={['rgba(20,20,20,0.6)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.2, y: 0 }}
          style={styles.leftGradient}
        />

        {/* Info */}
        <View style={styles.infoOverlay}>
          <Text style={styles.title}>{title}</Text>

          <View style={styles.metaRow}>
            {year ? <Text style={styles.metaText}>{year}</Text> : null}
            {rating ? (
              <View style={styles.ratingBadge}>
                <Star size={16} color={colors.rating} fill={colors.rating} />
                <Text style={styles.ratingText}>{rating}</Text>
              </View>
            ) : null}
            {show.number_of_seasons ? (
              <Text style={styles.metaText}>{show.number_of_seasons} Seasons</Text>
            ) : null}
          </View>

          {genres ? <Text style={styles.genres}>{genres}</Text> : null}

          {show.overview ? (
            <Text style={styles.overview} numberOfLines={4}>{show.overview}</Text>
          ) : null}

          {/* Actions */}
          <View style={styles.actions}>
            <TVFocusable
              onPress={() => handlePlayEpisode({ season_number: selectedSeason, episode_number: 1 })}
              style={styles.playButton}
              focusStyle={styles.playButtonFocused}
              focusScale={1.08}
              hasTVPreferredFocus
              accessibilityLabel={`Play season ${selectedSeason}`}
            >
              <Play size={24} color="#000" fill="#000" />
              <Text style={styles.playText}>Play S{selectedSeason}:E1</Text>
            </TVFocusable>

            <TVFocusable
              onPress={toggle}
              style={styles.listButton}
              focusStyle={styles.listButtonFocused}
              focusScale={1.08}
              accessibilityLabel={inList ? 'Remove from My List' : 'Add to My List'}
            >
              {inList ? <Check size={24} color="#fff" /> : <Plus size={24} color="#fff" />}
              <Text style={styles.listText}>{inList ? 'In My List' : 'My List'}</Text>
            </TVFocusable>
          </View>
        </View>
      </View>

      {/* Season Selector */}
      {seasons.length > 1 && (
        <View style={styles.seasonSection}>
          <Text style={styles.sectionTitle}>Seasons</Text>
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
                  focusStyle={styles.seasonButtonFocused}
                  focusScale={1.08}
                >
                  <Text
                    style={[
                      styles.seasonButtonText,
                      selectedSeason === item.season_number && styles.seasonButtonTextActive,
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
              ItemSeparatorComponent={() => <View style={{ width: 10 }} />}
            />
          </View>
        </View>
      )}

      {/* Episodes */}
      {episodes.length > 0 && (
        <View style={styles.episodeSection}>
          <Text style={styles.sectionTitle}>Episodes</Text>
          <View style={styles.episodeList}>
            {episodes.map((ep) => (
              <TVFocusable
                key={ep.episode_number}
                onPress={() => handlePlayEpisode(ep)}
                style={styles.episodeItem}
                focusStyle={styles.episodeItemFocused}
                focusScale={1.03}
              >
                <View style={styles.episodeThumb}>
                  {ep.still_path ? (
                    <Image
                      source={{ uri: `https://image.tmdb.org/t/p/w300${ep.still_path}` }}
                      style={styles.episodeImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.episodeImage, styles.episodePlaceholder]}>
                      <Play size={24} color="#666" />
                    </View>
                  )}
                </View>
                <View style={styles.episodeInfo}>
                  <Text style={styles.episodeNumber}>
                    Episode {ep.episode_number}
                  </Text>
                  <Text style={styles.episodeName} numberOfLines={1}>
                    {ep.name || `Episode ${ep.episode_number}`}
                  </Text>
                  {ep.overview ? (
                    <Text style={styles.episodeOverview} numberOfLines={2}>
                      {ep.overview}
                    </Text>
                  ) : null}
                  {ep.vote_average ? (
                    <View style={styles.episodeRating}>
                      <Star size={12} color={colors.rating} fill={colors.rating} />
                      <Text style={styles.episodeRatingText}>
                        {ep.vote_average.toFixed(1)}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </TVFocusable>
            ))}
          </View>
        </View>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <View style={styles.recSection}>
          <Text style={styles.sectionTitle}>More Like This</Text>
          <FlatList
            data={recommendations}
            renderItem={({ item }) => <ContentCard item={item} type="tv" />}
            keyExtractor={(item) => String(item.id)}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recList}
            ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
          />
        </View>
      )}
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 48,
  },
  loading: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 20,
    color: '#999',
  },
  heroSection: {
    height: SCREEN_HEIGHT * 0.7,
    width: SCREEN_WIDTH,
    justifyContent: 'flex-end',
    marginTop: -56,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  leftGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: SCREEN_WIDTH * 0.35,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    height: 56,
    backgroundColor: 'transparent',
    zIndex: 200,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  backButtonFocused: {
    backgroundColor: 'rgba(229, 9, 20, 0.85)',
  },
  infoOverlay: {
    position: 'absolute',
    bottom: 60,
    left: 56,
    maxWidth: '55%',
    zIndex: 10,
  },
  title: {
    fontSize: 48,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 10,
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 8,
  },
  metaText: {
    fontSize: 17,
    color: '#b3b3b3',
    fontWeight: '500',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  ratingText: {
    fontSize: 15,
    color: colors.rating,
    fontWeight: '700',
  },
  genres: {
    fontSize: 16,
    color: '#b3b3b3',
    marginBottom: 12,
  },
  overview: {
    fontSize: 17,
    color: '#ccc',
    lineHeight: 26,
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 14,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 4,
    gap: 10,
  },
  playButtonFocused: {
    backgroundColor: '#e5e5e5',
  },
  playText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
  },
  listButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(109,109,110,0.7)',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 4,
    gap: 8,
  },
  listButtonFocused: {
    backgroundColor: 'rgba(109,109,110,0.9)',
  },
  listText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  seasonSection: {
    paddingLeft: 56,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  seasonRow: {
    marginBottom: 16,
  },
  seasonList: {
    paddingRight: 56,
    paddingVertical: 4,
  },
  seasonButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  seasonButtonActive: {
    backgroundColor: '#E50914',
    borderColor: '#E50914',
  },
  seasonButtonFocused: {
    borderColor: '#fff',
  },
  seasonButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#b3b3b3',
  },
  seasonButtonTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  episodeSection: {
    paddingLeft: 56,
    marginTop: 8,
    paddingRight: 56,
  },
  episodeList: {
    gap: 8,
  },
  episodeItem: {
    flexDirection: 'row',
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.04)',
    gap: 16,
  },
  episodeItemFocused: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  episodeThumb: {
    width: 240,
    height: 135,
    borderRadius: 4,
    overflow: 'hidden',
  },
  episodeImage: {
    width: '100%',
    height: '100%',
  },
  episodePlaceholder: {
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
  },
  episodeInfo: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 24,
  },
  episodeNumber: {
    fontSize: 14,
    color: '#888',
    marginBottom: 4,
  },
  episodeName: {
    fontSize: 19,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 6,
  },
  episodeOverview: {
    fontSize: 15,
    color: '#b3b3b3',
    lineHeight: 22,
  },
  episodeRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  episodeRatingText: {
    fontSize: 13,
    color: colors.rating,
    fontWeight: '600',
  },
  recSection: {
    marginTop: 24,
    paddingLeft: 56,
  },
  recList: {
    paddingRight: 56,
    paddingBottom: 8,
  },
});
