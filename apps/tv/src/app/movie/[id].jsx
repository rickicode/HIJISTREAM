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

export default function MovieDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [movie, setMovie] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [progress, setProgress] = useState(null);
  const { inList, toggle } = useMyList(movie, 'movie');

  useEffect(() => {
    loadMovie();
  }, [id]);

  async function loadMovie() {
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
  }

  const handlePlay = () => {
    router.push({
      pathname: '/player',
      params: {
        id: movie.imdb_id || id,
        type: 'movie',
        title: movie.title,
        resumeAt: progress?.time || 0,
      },
    });
  };

  if (!movie) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const backdrop = movie.backdrop_url || movie.poster_url;
  const year = movie.release_date ? movie.release_date.split('-')[0] : '';
  const rating = movie.vote_average ? (Math.round(movie.vote_average * 10) / 10).toFixed(1) : '';
  const genres = movie.genres
    ? movie.genres.map(g => typeof g === 'string' ? g : g.name).join(', ')
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
        <Text style={styles.title}>{movie.title}</Text>
        <View style={styles.metaRow}>
          {year ? <Text style={styles.metaText}>{year}</Text> : null}
          {rating ? <Text style={styles.ratingText}>{rating}/10</Text> : null}
        </View>
        {genres ? <Text style={styles.genres}>{genres}</Text> : null}
        {movie.overview ? (
          <Text style={styles.overview}>{movie.overview}</Text>
        ) : null}

        <View style={styles.actions}>
          <TVFocusable
            onPress={handlePlay}
            style={styles.playButton}
            focusScale={1.08}
            hasTVPreferredFocus
            accessibilityLabel="Play"
          >
            <Play size={22} color="#000" fill="#000" />
            <Text style={styles.playText}>
              {progress ? 'Resume' : 'Play'}
            </Text>
          </TVFocusable>
          <TVFocusable
            onPress={toggle}
            style={styles.listButton}
            focusScale={1.08}
            accessibilityLabel={inList ? 'Remove from My List' : 'Add to My List'}
          >
            {inList ? <Check size={22} color={colors.text} /> : <Plus size={22} color={colors.text} />}
            <Text style={styles.listText}>{inList ? 'In My List' : 'My List'}</Text>
          </TVFocusable>
        </View>
      </View>

      {recommendations.length > 0 && (
        <View style={styles.recommendations}>
          <Text style={styles.sectionTitle}>Recommendations</Text>
          <FlatList
            data={recommendations}
            renderItem={({ item }) => <ContentCard item={item} type="movie" />}
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
    marginBottom: spacing.xl,
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
  recommendations: {
    paddingLeft: spacing.xl,
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  recList: {
    paddingRight: spacing.xl,
  },
});
