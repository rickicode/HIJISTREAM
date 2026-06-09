/**
 * MovieDetailScreen - Netflix-style movie detail for Android TV
 *
 * Features:
 * - Full-bleed backdrop hero with gradient
 * - Title, year, rating, runtime metadata
 * - Genre tags, overview
 * - Play/Resume and My List buttons
 * - "More Like This" recommendations rail
 * - Fully TV remote controllable
 * - Back button handling
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, Image, FlatList, ScrollView, StyleSheet, Dimensions, BackHandler, ActivityIndicator, Animated } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Play, Plus, Check, Star, ArrowLeft } from 'lucide-react-native';
import api from '@hijistream/shared/utils/api';
import { loadWatchProgress } from '@hijistream/shared/utils/player';
import useMyList from '@hijistream/shared/hooks/useMyList';
import { colors } from '@hijistream/shared/theme';
import TVFocusable from '../../components/TVFocusable';
import ContentCard from '../../components/ContentCard';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function MovieDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [movie, setMovie] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [progress, setProgress] = useState(null);
  const { inList, toggle } = useMyList(movie, 'movie');

  // Handle TV remote back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      router.back();
      return true;
    });
    return () => backHandler.remove();
  }, [router]);

  useEffect(() => {
    loadMovie();
  }, [id]);

  const loadMovie = useCallback(async () => {
    try {
      const detail = await api.getMovieDetails(id);
      setMovie(detail);

      // Load recommendations and progress safely without blocking
      api.getMovieRecommendations(id)
        .then(recs => {
          if (recs?.items) setRecommendations(recs.items);
        })
        .catch(err => console.warn('Failed to load recommendations:', err));

      loadWatchProgress(`movie_${id}`)
        .then(wp => {
          if (wp) setProgress(wp);
        })
        .catch(err => console.warn('Failed to load watch progress:', err));

    } catch (err) {
      console.error('Failed to load movie:', err);
    }
  }, [id]);

  const handlePlay = useCallback(() => {
    const imdbId = movie.imdb_id || id;
    router.push({
      pathname: '/player',
      params: {
        id: imdbId,
        type: 'movie',
        title: movie.title,
        resumeAt: progress?.time || 0,
        tmdbId: movie.id ? String(movie.id) : undefined,
      },
    });
  }, [movie, id, progress, router]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  if (!movie) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#E50914" />
        <Text style={styles.loadingText}>HIJISTREAM</Text>
      </View>
    );
  }

  const backdrop = movie.backdrop_url || movie.poster_url || (movie.backdrop_path
    ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}`
    : null);
  const poster = movie.poster_url || (movie.poster_path
    ? `https://image.tmdb.org/t/p/w342${movie.poster_path}`
    : null);
  const year = movie.release_date ? movie.release_date.split('-')[0] : '';
  const rating = movie.vote_average ? (Math.round(movie.vote_average * 10) / 10).toFixed(1) : '';
  const genres = movie.genres
    ? movie.genres.map(g => typeof g === 'string' ? g : g.name).join(', ')
    : '';
  const runtime = movie.runtime
    ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m`
    : '';

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
      {/* Hero Section */}
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
        {/* Backdrop image */}
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

        {/* Content info overlay */}
        <View style={styles.infoOverlay}>
          <View style={styles.detailRow}>
            {/* Poster */}
            {poster && (
              <Image source={{ uri: poster }} style={styles.poster} resizeMode="cover" />
            )}

            {/* Detail text */}
            <View style={styles.detailTextContainer}>
              <Text style={styles.title} numberOfLines={2}>{movie.title}</Text>

              <View style={styles.metaRow}>
                {year ? <Text style={styles.metaText}>{year}</Text> : null}
                {rating ? (
                  <View style={styles.ratingBadge}>
                    <Star size={14} color={colors.rating} fill={colors.rating} />
                    <Text style={styles.ratingText}>{rating}</Text>
                  </View>
                ) : null}
                {runtime ? <Text style={styles.metaText}>{runtime}</Text> : null}
                <View style={styles.qualityBadge}>
                  <Text style={styles.qualityText}>Ultra HD 4K</Text>
                </View>
              </View>

              {genres ? <Text style={styles.genres}>{genres}</Text> : null}

              {movie.overview ? (
                <Text style={styles.overview} numberOfLines={4}>{movie.overview}</Text>
              ) : null}

              {/* Action Buttons */}
              <View style={styles.actions}>
                <TVFocusable
                  onPress={handlePlay}
                  style={styles.playButton}
                  focusStyle={styles.playButtonFocused}
                  focusScale={1.05}
                  hasTVPreferredFocus
                  accessibilityLabel={progress ? 'Resume movie' : 'Play movie'}
                >
                  {({ isFocused }) => (
                    <>
                      <Play size={18} color={isFocused ? '#fff' : '#000'} fill={isFocused ? '#fff' : '#000'} />
                      <Text style={[styles.playText, { color: isFocused ? '#fff' : '#000' }]}>
                        {progress ? 'Resume' : 'Play'}
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

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <View style={styles.recSection}>
          <Text style={styles.sectionTitle}>More Like This</Text>
          <FlatList
            data={recommendations}
            renderItem={({ item }) => <ContentCard item={item} type="movie" />}
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
  recSection: {
    marginTop: 24,
    paddingLeft: 48,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  recList: {
    paddingRight: 48,
    paddingBottom: 8,
  },
});
