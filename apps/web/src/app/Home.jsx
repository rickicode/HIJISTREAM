import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Film } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { getAllWatchProgress } from '../utils/player';
import ContentCard from '../components/ContentCard';
import LoadingState from '../components/LoadingState';

function SectionHeader({ title, href = null }) {
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

  const movieItems = trendingMovies?.items?.slice(0, 6) || [];
  const tvItems = trendingTV?.items?.slice(0, 6) || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Continue Watching */}
      {watchProgress.length > 0 ? (
        <section>
          <SectionHeader title="Continue Watching" />
          <HorizontalScroll>
            {watchProgress.map((item) => (
              <div key={item.id} className="w-[150px] sm:w-[160px] shrink-0">
                <ContentCard
                  item={{ tmdb_id: item.id, title: item.title || item.id, poster_url: item.poster_url || '', ...item }}
                  type={item.type || 'movie'}
                  watchProgress={item.percentage}
                />
              </div>
            ))}
          </HorizontalScroll>
        </section>
      ) : (
        <section className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
          <Film className="mx-auto text-gray-300 mb-3" size={48} />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Welcome to HIJISTREAM</h2>
          <p className="text-sm text-gray-500 mb-4">Start watching movies and TV shows to see your progress here</p>
          <Link to="/movies" className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            Browse Movies
          </Link>
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
