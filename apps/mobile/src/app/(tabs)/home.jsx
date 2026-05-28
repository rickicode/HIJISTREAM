import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Film } from 'lucide-react-native';
import api from '../../utils/api';
import { getAllWatchProgress } from '../../utils/player';
import { colors, spacing, typography, borderRadius } from '../../theme';
import HeroBanner from '../../components/HeroBanner';
import ContentRail from '../../components/ContentRail';
import TVFocusable from '../../components/TVFocusable';

export default function HomeScreen() {
  const router = useRouter();
  const [watchProgress, setWatchProgress] = useState([]);

  const loadProgress = useCallback(async () => {
    const progress = await getAllWatchProgress();
    setWatchProgress(progress);
  }, []);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  const { data: trendingMovies, isLoading: moviesLoading } = useQuery({
    queryKey: ['trending-movies-home'],
    queryFn: () => api.getTrendingMovies(1),
  });

  const { data: trendingTV, isLoading: tvLoading } = useQuery({
    queryKey: ['trending-tv-home'],
    queryFn: () => api.getTrendingTV(1),
  });

  const { data: tvOnTheAir, isLoading: onTheAirLoading } = useQuery({
    queryKey: ['tv-on-the-air-home'],
    queryFn: () => api.getTVOnTheAir(1),
  });

  const { data: animeTrending, isLoading: animeLoading } = useQuery({
    queryKey: ['anime-trending-home'],
    queryFn: () => api.getAnimeTrending(1),
  });

  const movies = trendingMovies?.items?.slice(0, 10) || [];
  const tvShows = trendingTV?.items?.slice(0, 10) || [];
  const onTheAirItems = tvOnTheAir?.items?.slice(0, 10) || [];
  const animeItems = animeTrending?.items?.slice(0, 10) || [];
  const heroItem = movies.length > 0
    ? movies[Math.floor(Math.random() * Math.min(movies.length, 5))]
    : null;

  const sections = [];

  sections.push({ key: 'hero', type: 'hero' });

  if (watchProgress.length > 0) {
    sections.push({ key: 'continue-watching', type: 'progress' });
  } else if (movies.length === 0 && tvShows.length === 0 && !moviesLoading && !tvLoading) {
    sections.push({ key: 'empty-state', type: 'empty' });
  }

  sections.push({ key: 'trending-movies', type: 'movies' });
  sections.push({ key: 'trending-tv', type: 'tv' });
  sections.push({ key: 'ongoing-series', type: 'ongoing-series' });
  sections.push({ key: 'trending-anime', type: 'trending-anime' });

  const renderSection = ({ item: section }) => {
    if (section.type === 'hero') {
      return <HeroBanner item={heroItem} type="movie" />;
    }

    if (section.type === 'empty') {
      return (
        <View style={styles.emptyState}>
          <Film color={colors.textMuted} size={48} />
          <Text style={styles.emptyTitle}>Welcome to HIJISTREAM</Text>
          <Text style={styles.emptySubtitle}>
            Start watching movies and TV shows
          </Text>
          <TVFocusable
            onPress={() => router.push('/(tabs)/movies')}
            style={styles.browseButton}
          >
            <Text style={styles.browseButtonText}>Browse Movies</Text>
          </TVFocusable>
        </View>
      );
    }

    if (section.type === 'progress') {
      return (
        <ContentRail
          title="Continue Watching"
          items={watchProgress}
          type="movie"
        />
      );
    }

    if (section.type === 'movies') {
      return (
        <ContentRail
          title="Trending Movies"
          items={movies}
          type="movie"
          isLoading={moviesLoading}
          onSeeAll={() => router.push('/(tabs)/movies')}
        />
      );
    }

    if (section.type === 'tv') {
      return (
        <ContentRail
          title="Trending TV Shows"
          items={tvShows}
          type="tv"
          isLoading={tvLoading}
          onSeeAll={() => router.push('/(tabs)/tv')}
        />
      );
    }

    if (section.type === 'ongoing-series') {
      return (
        <ContentRail
          title="Ongoing Series"
          items={onTheAirItems}
          type="tv"
          isLoading={onTheAirLoading}
          onSeeAll={() => router.push('/(tabs)/tv')}
        />
      );
    }

    if (section.type === 'trending-anime') {
      return (
        <ContentRail
          title="Trending Anime"
          items={animeItems}
          type="tv"
          isLoading={animeLoading}
          onSeeAll={() => router.push('/(tabs)/anime')}
        />
      );
    }

    return null;
  };

  return (
    <FlatList
      data={sections}
      keyExtractor={(item) => item.key}
      renderItem={renderSection}
      style={styles.container}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  emptyTitle: {
    color: colors.text,
    ...typography.title,
    marginTop: spacing.sm,
  },
  emptySubtitle: {
    color: colors.textMuted,
    ...typography.body,
  },
  browseButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    minWidth: 140,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  browseButtonText: {
    color: colors.text,
    ...typography.subtitle,
  },
});
