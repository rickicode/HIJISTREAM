import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import { getAllWatchProgress } from '../utils/player';
import HeroBanner from '../components/HeroBanner';
import ContentRail from '../components/ContentRail';

export default function Home() {
  useEffect(() => {
    document.title = 'HIJISTREAM - Stream Movies & TV Shows';
  }, []);

  const watchProgress = getAllWatchProgress();

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

  const movieItems = useMemo(() => trendingMovies?.items?.slice(0, 10) || [], [trendingMovies]);
  const tvItems = trendingTV?.items?.slice(0, 10) || [];
  const onTheAirItems = tvOnTheAir?.items?.slice(0, 10) || [];
  const animeItems = animeTrending?.items?.slice(0, 10) || [];
  const heroItem = useMemo(() => {
    if (movieItems.length === 0) return null;
    return movieItems[Math.floor(Math.random() * Math.min(movieItems.length, 5))];
  }, [movieItems]);

  return (
    <div className="space-y-8 pb-12">
      <HeroBanner item={heroItem} type="movie" />

      {watchProgress.length > 0 && (
        <ContentRail
          title="Continue Watching"
          items={watchProgress}
          type="movie"
        />
      )}

      <ContentRail
        title="Trending Movies"
        href="/movies"
        items={movieItems}
        type="movie"
        isLoading={moviesLoading}
      />

      <ContentRail
        title="Trending TV Shows"
        href="/tv"
        items={tvItems}
        type="tv"
        isLoading={tvLoading}
      />

      <ContentRail
        title="Ongoing Series"
        href="/tv"
        items={onTheAirItems}
        type="tv"
        isLoading={onTheAirLoading}
      />

      <ContentRail
        title="Trending Anime"
        href="/anime"
        items={animeItems}
        type="tv"
        isLoading={animeLoading}
      />
    </div>
  );
}
