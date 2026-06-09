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

import { useEffect, useState, useCallback } from 'react';
import { View, Text, Image, FlatList, ScrollView, StyleSheet, Dimensions, BackHandler } from 'react-native';
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
      const [detail, recs, wp] = await Promise.all([
        api.getMovieDetails(id),
        api.getMovieRecommendations(id),
        loadWatchProgress(`movie_${id}`),
      ]);
      setMovie(detail);
      setRecommendations(recs?.items || []);
      setProgress(wp);
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
        <Text style={styles.loadingText}>Loading...</Text>
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
      {/* Hero Section */}
      <View style={styles.heroSection}>
        {/* Backdrop image */}
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

        {/* Content info overlay */}
        <View style={styles.infoOverlay}>
          <Text style={styles.title}>{movie.title}</Text>

          <View style={styles.metaRow}>
            {year ? <Text style={styles.metaText}>{year}</Text> : null}
            {rating ? (
              <View style={styles.ratingBadge}>
                <Star size={16} color={colors.rating} fill={colors.rating} />
                <Text style={styles.ratingText}>{rating}/10</Text>
              </View>
            ) : null}
            {runtime ? <Text style={styles.metaText}>{runtime}</Text> : null}
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
              focusScale={1.08}
              hasTVPreferredFocus
              accessibilityLabel={progress ? 'Resume movie' : 'Play movie'}
            >
              <Play size={24} color="#000" fill="#000" />
              <Text style={styles.playText}>
                {progress ? 'Resume' : 'Play'}
              </Text>
            </TVFocusable>

            <TVFocusable
              onPress={toggle}
              style={styles.listButton}
              focusStyle={styles.listButtonFocused}
              focusScale={1.08}
              accessibilityLabel={inList ? 'Remove from My List' : 'Add to My List'}
            >
              {inList ? (
                <Check size={24} color="#fff" />
              ) : (
                <Plus size={24} color="#fff" />
              )}
              <Text style={styles.listText}>
                {inList ? 'In My List' : 'My List'}
              </Text>
            </TVFocusable>
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
    height: SCREEN_HEIGHT * 0.75,
    width: SCREEN_WIDTH,
    justifyContent: 'flex-end',
    marginTop: -56, // Pull up under the header bar so hero fills properly
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.75,
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
    bottom: 80,
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
    marginBottom: 20,
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
  recSection: {
    marginTop: 16,
    paddingLeft: 56,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  recList: {
    paddingRight: 56,
    paddingBottom: 8,
  },
});
