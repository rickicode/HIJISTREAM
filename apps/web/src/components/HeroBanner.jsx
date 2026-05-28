import { Link } from 'react-router-dom';
import { Play, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function HeroBanner({ item, type = 'movie' }) {
  if (!item) return null;

  const genres = item.genre ? item.genre.split(',').map((g) => g.trim()).slice(0, 3) : [];
  const itemId = item.id || item.tmdb_id;
  const detailHref = type === 'movie' ? `/movies/${itemId}` : `/tv/${itemId}`;
  const playHref = `${detailHref}?autoplay=true`;
  const infoHref = detailHref;

  return (
    <div className="relative w-full h-[350px] sm:h-[450px] md:h-[500px]">
      {item.backdrop_url ? (
        <img
          src={item.backdrop_url}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-background-elevated" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/80 to-transparent" />
      <div className="absolute bottom-8 left-4 sm:left-8 md:left-12 max-w-xl z-10">
        <h1 className={cn('text-2xl sm:text-3xl md:text-4xl font-bold text-white drop-shadow-lg')}>
          {item.title}
        </h1>
        {item.overview && (
          <p className="mt-2 text-sm sm:text-base text-white/80 line-clamp-3 leading-relaxed">
            {item.overview}
          </p>
        )}
        {genres.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {genres.map((genre) => (
              <span
                key={genre}
                className="text-xs px-2 py-0.5 rounded bg-white/20 text-white/90"
              >
                {genre}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-3 mt-4">
          <Link
            to={playHref}
            className="inline-flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded font-semibold text-sm hover:bg-white/90 transition-colors"
          >
            <Play size={18} fill="black" />
            Play
          </Link>
          <Link
            to={infoHref}
            className="inline-flex items-center gap-2 bg-gray-600/60 text-white px-5 py-2.5 rounded font-semibold text-sm hover:bg-gray-600/80 transition-colors"
          >
            <Info size={18} />
            More Info
          </Link>
        </div>
      </div>
    </div>
  );
}
