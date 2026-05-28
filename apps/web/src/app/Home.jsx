import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '../utils/api';
import { getAllWatchProgress } from '../utils/player';
import HeroBanner from '../components/HeroBanner';
import ContentRail from '../components/ContentRail';
import ContentCard from '../components/ContentCard';

function ContinueWatchingRail({ watchProgress }) {
  const scrollRef = useRef(null);

  const scroll = (direction) => {
    if (!scrollRef.current) return;
    const amount = direction === 'left' ? -800 : 800;
    scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
  };

  return (
    <section className="relative group/rail">
      <div className="flex items-center justify-between mb-3 px-4 sm:px-8 md:px-12">
        <h2 className="text-base sm:text-lg font-bold text-white">Continue Watching</h2>
      </div>
      <div className="relative">
        <button
          onClick={() => scroll('left')}
          className={cn(
            'absolute left-0 top-0 bottom-0 z-10 w-10 flex items-center justify-center',
            'bg-black/50 text-white opacity-0 group-hover/rail:opacity-100 transition-opacity',
            'hover:bg-black/70'
          )}
          aria-label="Scroll left"
        >
          <ChevronLeft size={24} />
        </button>
        <div
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto scrollbar-hide px-4 sm:px-8 md:px-12 pb-2"
        >
          {watchProgress.map((item) => (
            <div key={item.id} className="w-[150px] sm:w-[180px] shrink-0">
              <ContentCard
                item={{ id: item.id, tmdb_id: item.id, title: item.title || item.id, poster_url: item.poster_url || '', ...item }}
                type={item.type || 'movie'}
                watchProgress={item.percentage}
              />
            </div>
          ))}
        </div>
        <button
          onClick={() => scroll('right')}
          className={cn(
            'absolute right-0 top-0 bottom-0 z-10 w-10 flex items-center justify-center',
            'bg-black/50 text-white opacity-0 group-hover/rail:opacity-100 transition-opacity',
            'hover:bg-black/70'
          )}
          aria-label="Scroll right"
        >
          <ChevronRight size={24} />
        </button>
      </div>
    </section>
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

  const movieItems = trendingMovies?.items?.slice(0, 10) || [];
  const tvItems = trendingTV?.items?.slice(0, 10) || [];
  const heroItem = movieItems[0] || null;

  return (
    <div className="space-y-8 pb-12">
      <HeroBanner item={heroItem} type="movie" />

      {watchProgress.length > 0 && (
        <ContinueWatchingRail watchProgress={watchProgress} />
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
