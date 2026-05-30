import { useState, useEffect, useCallback, useMemo } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import api from '@hijistream/shared/utils/api';
import { getAllWatchProgress } from '@hijistream/shared/utils/player';
import { useTranslation } from '@hijistream/shared/i18n';
import { colors } from '@hijistream/shared/theme';
import HeroBanner from '../../components/HeroBanner';
import ContentRail from '../../components/ContentRail';
import useIsTV from '../../hooks/useIsTV';

export default function HomeScreen() {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const isTV = useIsTV();
  const [watchProgress, setWatchProgress] = useState([]);

  const loadProgress = useCallback(async () => {
    const progress = await getAllWatchProgress();
    setWatchProgress(progress);
  }, []);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  const { data: trendingMovies, isLoading: moviesLoading } = useQuery({
    queryKey: ['trending-movies-home', locale],
    queryFn: () => api.getTrendingMovies(1),
  });

  const { data: trendingTV, isLoading: tvLoading } = useQuery({
    queryKey: ['trending-tv-home', locale],
    queryFn: () => api.getTrendingTV(1),
  });

  const { data: tvOnTheAir, isLoading: onTheAirLoading } = useQuery({
    queryKey: ['tv-on-the-air-home', locale],
    queryFn: () => api.getTVOnTheAir(1),
  });

  const { data: animeTrending, isLoading: animeLoading } = useQuery({
    queryKey: ['anime-trending-home', locale],
    queryFn: () => api.getAnimeTrending(1),
  });

  const { data: animeOngoing, isLoading: animeOngoingLoading } = useQuery({
    queryKey: ['anime-ongoing-home', locale],
    queryFn: () => api.getAnimeOngoing(1),
  });

  const movies = useMemo(() => trendingMovies?.items?.slice(0, 10) || [], [trendingMovies]);
  const tvShows = trendingTV?.items?.slice(0, 10) || [];
  const onTheAirItems = tvOnTheAir?.items?.slice(0, 10) || [];
  const animeItems = animeTrending?.items?.slice(0, 10) || [];
  const animeOngoingItems = animeOngoing?.items?.slice(0, 10) || [];
  const heroItems = useMemo(() => {
    if (movies.length === 0) return [];
    return movies.slice(0, 5);
  }, [movies]);

  const sections = [];

  sections.push({ key: 'hero', type: 'hero' });

  if (watchProgress.length > 0) {
    sections.push({ key: 'continue-watching', type: 'progress' });
  }

  sections.push({ key: 'trending-movies', type: 'movies' });
  sections.push({ key: 'trending-tv', type: 'tv' });
  sections.push({ key: 'ongoing-series', type: 'ongoing-series' });
  sections.push({ key: 'trending-anime', type: 'trending-anime' });
  sections.push({ key: 'ongoing-anime', type: 'ongoing-anime' });

  const goToList = (listType) => router.push(`/list/${listType}`);

  const renderSection = ({ item: section }) => {
    if (section.type === 'hero') {
      return <HeroBanner items={heroItems} type="movie" />;
    }

    if (section.type === 'progress') {
      return (
        <ContentRail
          title={t('common.continueWatching')}
          items={watchProgress}
          type="movie"
          onSeeAll={() => goToList('continue-watching')}
          hasTVPreferredFocus={isTV}
        />
      );
    }

    if (section.type === 'movies') {
      return (
        <ContentRail
          title={`${t('common.trending')} ${t('nav.movies')}`}
          items={movies}
          type="movie"
          isLoading={moviesLoading}
          onSeeAll={() => goToList('trending-movies')}
          hasTVPreferredFocus={isTV && watchProgress.length === 0}
        />
      );
    }

    if (section.type === 'tv') {
      return (
        <ContentRail
          title={`${t('common.trending')} ${t('nav.tvShows')}`}
          items={tvShows}
          type="tv"
          isLoading={tvLoading}
          onSeeAll={() => goToList('trending-tv')}
        />
      );
    }

    if (section.type === 'ongoing-series') {
      return (
        <ContentRail
          title={t('common.ongoing')}
          items={onTheAirItems}
          type="tv"
          isLoading={onTheAirLoading}
          onSeeAll={() => goToList('on-the-air')}
        />
      );
    }

    if (section.type === 'trending-anime') {
      return (
        <ContentRail
          title={`${t('common.trending')} ${t('nav.anime')}`}
          items={animeItems}
          type="tv"
          isLoading={animeLoading}
          onSeeAll={() => goToList('anime-trending')}
        />
      );
    }

    if (section.type === 'ongoing-anime') {
      return (
        <ContentRail
          title={`${t('common.ongoing')} ${t('nav.anime')}`}
          items={animeOngoingItems}
          type="tv"
          isLoading={animeOngoingLoading}
          onSeeAll={() => goToList('anime-ongoing')}
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
});
