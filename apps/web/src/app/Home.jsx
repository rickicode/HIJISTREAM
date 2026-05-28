import { useEffect } from 'react';
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

  const movieItems = trendingMovies?.items?.slice(0, 10) || [];
  const tvItems = trendingTV?.items?.slice(0, 10) || [];
  const heroItem = movieItems.length > 0
    ? movieItems[Math.floor(Math.random() * Math.min(movieItems.length, 5))]
    : null;

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
    </div>
  );
}
