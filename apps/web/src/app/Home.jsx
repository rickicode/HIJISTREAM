import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import { getAllWatchProgress } from '../utils/player';
import { useTranslation } from '../i18n';
import HeroBanner from '../components/HeroBanner';
import ContentRail from '../components/ContentRail';
import BrowseSection from '../components/BrowseSection';

export default function Home() {
  const { t, locale } = useTranslation();

  useEffect(() => {
    document.title = 'HIJISTREAM - Stream Movies & TV Shows';
  }, []);

  const watchProgress = getAllWatchProgress();

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

  const movieItems = useMemo(() => trendingMovies?.items?.slice(0, 10) || [], [trendingMovies]);
  const tvItems = trendingTV?.items?.slice(0, 10) || [];
  const onTheAirItems = tvOnTheAir?.items?.slice(0, 10) || [];
  const animeItems = animeTrending?.items?.slice(0, 10) || [];
  const heroItem = useMemo(() => {
    if (movieItems.length === 0) return null;
    const pool = movieItems.slice(0, 5);
    const stableIndex = (pool[0]?.id || 0) % pool.length;
    return pool[stableIndex];
  }, [movieItems]);

  return (
    <div className="space-y-8 pb-12">
      <HeroBanner item={heroItem} type="movie" />

      <div className="px-4 sm:px-8 md:px-12">
        <BrowseSection />
      </div>

      {watchProgress.length > 0 && (
        <ContentRail
          title={t('common.continueWatching')}
          items={watchProgress}
        />
      )}

      <ContentRail
        title={t('common.trending') + ' ' + t('nav.movies')}
        href="/movies"
        items={movieItems}
        type="movie"
        isLoading={moviesLoading}
      />

      <ContentRail
        title={t('common.trending') + ' ' + t('nav.tvShows')}
        href="/tv"
        items={tvItems}
        type="tv"
        isLoading={tvLoading}
      />

      <ContentRail
        title={t('common.ongoing')}
        href="/tv"
        items={onTheAirItems}
        type="tv"
        isLoading={onTheAirLoading}
      />

      <ContentRail
        title={t('common.trending') + ' ' + t('nav.anime')}
        href="/anime"
        items={animeItems}
        type="tv"
        isLoading={animeLoading}
      />
    </div>
  );
}
