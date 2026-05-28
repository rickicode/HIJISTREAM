import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import ContentCard from './ContentCard';
import LoadingState from './LoadingState';

export default function ContentRail({ title, href = '', items = [], type = 'movie', isLoading = false }) {
  const scrollRef = useRef(null);

  const scroll = (direction) => {
    if (!scrollRef.current) return;
    const amount = direction === 'left' ? -800 : 800;
    scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
  };

  return (
    <section className="relative group/rail">
      <div className="flex items-center justify-between mb-3 px-4 sm:px-8 md:px-12">
        <h2 className="text-base sm:text-lg font-bold text-white">{title}</h2>
        {href && (
          <Link
            to={href}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-white transition-colors"
          >
            See All
            <ChevronRight size={16} />
          </Link>
        )}
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
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="w-[150px] sm:w-[180px] shrink-0">
                  <LoadingState type="card" />
                </div>
              ))
            : items.map((item) => (
                <div key={item.id || item.tmdb_id} className="w-[150px] sm:w-[180px] shrink-0">
                  <ContentCard item={item} type={item.type || type} watchProgress={item.percentage} />
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
