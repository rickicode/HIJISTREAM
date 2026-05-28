import { useState } from 'react';
import { Play, Star, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DetailHero({ item, type: _type = 'movie', onPlay }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const genres = item.genre ? item.genre.split(',').map((g) => g.trim()) : [];
  const cast = item.credits?.slice(0, 5) || [];

  return (
    <div className="relative">
      <div className="absolute inset-x-0 top-0 h-[450px] overflow-hidden -mx-4 sm:-mx-6 lg:-mx-8">
        {item.backdrop_url ? (
          <img
            src={item.backdrop_url}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-background-elevated" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/60 to-transparent" />
      </div>
      <div className="relative pt-[200px] flex flex-col md:flex-row gap-6 md:gap-8">
        <div className="w-[200px] md:w-[250px] shrink-0">
          <div className="relative aspect-[2/3] rounded overflow-hidden shadow-2xl shadow-black/70">
            {item.poster_url ? (
              <img
                src={item.poster_url}
                alt={item.title}
                loading="lazy"
                onLoad={() => setImgLoaded(true)}
                className={cn(
                  'w-full h-full object-cover transition-opacity duration-300',
                  imgLoaded ? 'opacity-100' : 'opacity-0'
                )}
              />
            ) : (
              <div className="w-full h-full bg-background-elevated flex items-center justify-center">
                <span className="text-muted text-sm text-center px-4">{item.title}</span>
              </div>
            )}
            {item.poster_url && !imgLoaded && (
              <div className="absolute inset-0 shimmer-bg animate-shimmer" />
            )}
          </div>
        </div>
        <div className="flex-1">
          <h1 className="text-2xl md:text-4xl font-bold text-white">{item.title}</h1>
          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
            {item.year && <span>{item.year}</span>}
            {item.rating && item.rating !== '0.0' && (
              <span className="flex items-center gap-1">
                <Star size={14} className="text-yellow-400 fill-yellow-400" />
                {item.rating}
              </span>
            )}
            {item.runtime && (
              <span className="flex items-center gap-1">
                <Clock size={14} />
                {item.runtime} min
              </span>
            )}
            {item.number_of_seasons && (
              <span>{item.number_of_seasons} Season{item.number_of_seasons > 1 ? 's' : ''}</span>
            )}
            {item.number_of_episodes && (
              <span>{item.number_of_episodes} Episodes</span>
            )}
          </div>
          {genres.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {genres.map((genre) => (
                <span
                  key={genre}
                  className="rounded px-3 py-1 text-sm bg-white/10 text-white/80"
                >
                  {genre}
                </span>
              ))}
            </div>
          )}
          {item.overview && (
            <p className="mt-4 text-muted-foreground leading-relaxed max-w-2xl">
              {item.overview}
            </p>
          )}
          {cast.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Cast</h3>
              <div className="flex flex-wrap gap-2">
                {cast.map((actor, index) => (
                  <span
                    key={actor.name || index}
                    className="text-sm text-white"
                  >
                    {actor.name}{index < cast.length - 1 ? ',' : ''}
                  </span>
                ))}
              </div>
            </div>
          )}
          {onPlay && (
            <button
              onClick={onPlay}
              className="mt-6 inline-flex items-center gap-2 bg-white text-black px-8 py-3 rounded font-semibold hover:bg-white/90 transition-colors"
            >
              <Play size={20} fill="black" />
              Play
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
