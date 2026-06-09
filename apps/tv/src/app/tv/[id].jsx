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

import { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, Image, FlatList, ScrollView, StyleSheet, Dimensions, BackHandler, ActivityIndicator, Animated } from 'react-native';
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
      const detail = await api.getTVDetails(id);
      setShow(detail);

      if (detail.seasons) {
        const filteredSeasons = detail.seasons.filter(s => s.season_number > 0);
        setSeasons(filteredSeasons);
        if (filteredSeasons.length > 0) {
          setSelectedSeason(filteredSeasons[0].season_number);
        }
      }

      // Load recommendations safely without blocking
      api.getTVRecommendations(id)
        .then(recs => {
          if (recs?.items) setRecommendations(recs.items);
        })
        .catch(err => console.warn('Failed to load TV recommendations:', err));

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
        <ActivityIndicator size="large" color="#E50914" />
        <Text style={styles.loadingText}>HIJISTREAM</Text>
      </View>
    );
  }

  const backdrop = show.backdrop_url || show.poster_url || (show.backdrop_path
    ? `https://image.tmdb.org/t/p/w1280${show.backdrop_path}`
    : null);
  const poster = show.poster_url || (show.poster_path
    ? `https://image.tmdb.org/t/p/w342${show.poster_path}`
    : null);
  const year = show.first_air_date ? show.first_air_date.split('-')[0] : '';
  const rating = show.vote_average ? (Math.round(show.vote_average * 10) / 10).toFixed(1) : '';
  const genres = show.genres
    ? show.genres.map(g => typeof g === 'string' ? g : g.name).join(', ')
    : '';
  const title = show.title || show.name || 'Untitled';

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
      {/* Hero */}
      <View style={styles.heroSection}>
        {/* Floating Back Button directly on Hero */}
        <TVFocusable
          onPress={handleBack}
          style={styles.backButton}
          focusStyle={styles.backButtonFocused}
          focusScale={1.05}
          showFocusRing={false}
          accessibilityLabel="Go back"
        >
          {({ isFocused }) => (
            <>
              <ArrowLeft size={16} color={isFocused ? '#000' : '#fff'} />
              <Text style={[styles.backText, isFocused && styles.backTextFocused]}>
                Back
              </Text>
            </>
          )}
        </TVFocusable>
        {backdrop && (
          <Image source={{ uri: backdrop }} style={styles.backdrop} resizeMode="cover" />
        )}
        <LinearGradient
          colors={['transparent', 'rgba(20,20,20,0.6)', colors.background]}
          locations={[0, 0.5, 1]}
          style={styles.gradient}
        />
        <LinearGradient
          colors={['rgba(20,20,20,0.85)', 'rgba(20,20,20,0.4)', 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.leftGradient}
        />

        {/* Info */}
        <View style={styles.infoOverlay}>
          <View style={styles.detailRow}>
            {/* Poster */}
            {poster && (
              <Image source={{ uri: poster }} style={styles.poster} resizeMode="cover" />
            )}

            {/* Detail text */}
            <View style={styles.detailTextContainer}>
              <Text style={styles.title} numberOfLines={2}>{title}</Text>

              <View style={styles.metaRow}>
                {year ? <Text style={styles.metaText}>{year}</Text> : null}
                {rating ? (
                  <View style={styles.ratingBadge}>
                    <Star size={14} color={colors.rating} fill={colors.rating} />
                    <Text style={styles.ratingText}>{rating}</Text>
                  </View>
                ) : null}
                {show.number_of_seasons ? (
                  <Text style={styles.metaText}>{show.number_of_seasons} Seasons</Text>
                ) : null}
                <View style={styles.qualityBadge}>
                  <Text style={styles.qualityText}>Ultra HD 4K</Text>
                </View>
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
                  focusScale={1.05}
                  hasTVPreferredFocus
                  accessibilityLabel={`Play season ${selectedSeason}`}
                >
                  {({ isFocused }) => (
                    <>
                      <Play size={18} color={isFocused ? '#fff' : '#000'} fill={isFocused ? '#fff' : '#000'} />
                      <Text style={[styles.playText, { color: isFocused ? '#fff' : '#000' }]}>
                        Play S{selectedSeason}:E1
                      </Text>
                    </>
                  )}
                </TVFocusable>

                <TVFocusable
                  onPress={toggle}
                  style={styles.listButton}
                  focusStyle={styles.listButtonFocused}
                  focusScale={1.05}
                  accessibilityLabel={inList ? 'Remove from My List' : 'Add to My List'}
                >
                  {({ isFocused }) => (
                    <>
                      {inList ? (
                        <Check size={18} color={isFocused ? '#000' : '#fff'} />
                      ) : (
                        <Plus size={18} color={isFocused ? '#000' : '#fff'} />
                      )}
                      <Text style={[styles.listText, { color: isFocused ? '#000' : '#fff' }]}>
                        {inList ? 'In My List' : 'My List'}
                      </Text>
                    </>
                  )}
                </TVFocusable>
              </View>
            </View>
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
                      <Play size={18} color="#666" />
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
    paddingBottom: 24,
  },
  loading: {
    flex: 1,
    backgroundColor: '#141414',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#E50914',
    letterSpacing: 2,
    marginTop: 10,
    fontFamily: 'Inter_700Bold',
  },
  heroSection: {
    height: SCREEN_HEIGHT * 0.72,
    width: SCREEN_WIDTH,
    justifyContent: 'flex-end',
    position: 'relative',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.72,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  leftGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: SCREEN_WIDTH * 0.7,
    zIndex: 2,
  },
  backButton: {
    position: 'absolute',
    top: 36,
    left: 48,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    zIndex: 200,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  backButtonFocused: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
  },
  backText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  backTextFocused: {
    color: '#000000',
  },
  infoOverlay: {
    position: 'absolute',
    bottom: 32,
    left: 48,
    right: 48,
    zIndex: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  poster: {
    width: 170,
    height: 250,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    backgroundColor: '#222',
  },
  detailTextContainer: {
    flex: 1,
    paddingLeft: 32,
    justifyContent: 'flex-end',
    maxWidth: SCREEN_WIDTH * 0.6,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 10,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.5,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  metaText: {
    fontSize: 14,
    color: '#b3b3b3',
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ratingText: {
    fontSize: 13,
    color: colors.rating,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  qualityBadge: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#666',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  qualityText: {
    fontSize: 10,
    color: '#b3b3b3',
    fontWeight: '800',
    fontFamily: 'Inter_700Bold',
  },
  genres: {
    fontSize: 14,
    color: '#b3b3b3',
    marginBottom: 10,
    fontFamily: 'Inter_500Medium',
  },
  overview: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 22,
    marginBottom: 20,
    fontFamily: 'Inter_400Regular',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 6,
    gap: 8,
  },
  playButtonFocused: {
    backgroundColor: '#E50914',
  },
  playText: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  listButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 6,
    gap: 8,
  },
  listButtonFocused: {
    backgroundColor: '#fff',
  },
  listText: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  seasonSection: {
    paddingLeft: 48,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 10,
  },
  seasonRow: {
    marginBottom: 12,
  },
  seasonList: {
    paddingRight: 48,
    paddingVertical: 4,
  },
  seasonButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
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
    fontSize: 14,
    fontWeight: '600',
    color: '#b3b3b3',
  },
  seasonButtonTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  episodeSection: {
    paddingLeft: 48,
    marginTop: 8,
    paddingRight: 48,
  },
  episodeList: {
    gap: 8,
  },
  episodeItem: {
    flexDirection: 'row',
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.04)',
    gap: 12,
  },
  episodeItemFocused: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  episodeThumb: {
    width: 160,
    height: 90,
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
    paddingRight: 16,
  },
  episodeNumber: {
    fontSize: 11,
    color: '#888',
    marginBottom: 2,
  },
  episodeName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  episodeOverview: {
    fontSize: 13,
    color: '#b3b3b3',
    lineHeight: 18,
  },
  episodeRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  episodeRatingText: {
    fontSize: 12,
    color: colors.rating,
    fontWeight: '600',
  },
  recSection: {
    marginTop: 24,
    paddingLeft: 48,
  },
  recList: {
    paddingRight: 48,
    paddingBottom: 8,
  },
});
