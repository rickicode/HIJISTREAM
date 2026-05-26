import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { getAllWatchProgress } from '../utils/player';
import ContentCard from '../components/ContentCard';
import LoadingState from '../components/LoadingState';

function SectionHeader({ title, href }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
      {href && (
        <Link
          to={href}
          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 transition-colors"
        >
          See All
          <ChevronRight size={16} />
        </Link>
      )}
    </div>
  );
}

function HorizontalScroll({ children }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
      {children}
    </div>
  );
}

export default function Home() {
  const watchProgress = getAllWatchProgress();

  const { data: trendingMovies, isLoading: moviesLoading } = useQuery({
    queryKey: ['trending-movies-home'],
    queryFn: () => api.getTrendingMovies(1),
  });

  const { data: trendingTV, isLoading: tvLoading } = useQuery({
    queryKey: ['trending-tv-home'],
    queryFn: () => api.getTrendingTV(1),
  });

  const movieItems = trendingMovies?.items?.slice(0, 6) || [];
  const tvItems = trendingTV?.items?.slice(0, 6) || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Continue Watching */}
      {watchProgress.length > 0 && (
        <section>
          <SectionHeader title="Continue Watching" />
          <HorizontalScroll>
            {watchProgress.map((item) => (
              <div key={item.id} className="w-[160px] shrink-0">
                <ContentCard
                  item={{ tmdb_id: item.id, title: item.id, poster_url: '', ...item }}
                  type="movie"
                  watchProgress={item.percentage}
                />
              </div>
            ))}
          </HorizontalScroll>
        </section>
      )}

      {/* Trending Movies */}
      <section>
        <SectionHeader title="Trending Movies" href="/movies" />
        {moviesLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <LoadingState key={i} type="card" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {movieItems.map((item) => (
              <ContentCard key={item.tmdb_id} item={item} type="movie" />
            ))}
          </div>
        )}
      </section>

      {/* Trending TV Shows */}
      <section>
        <SectionHeader title="Trending TV Shows" href="/tv" />
        {tvLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <LoadingState key={i} type="card" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {tvItems.map((item) => (
              <ContentCard key={item.tmdb_id} item={item} type="tv" />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
