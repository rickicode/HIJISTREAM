import { Link } from 'react-router-dom';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export default function ContentCard({ item, type = 'movie', watchProgress = null }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const effectiveType = item.type || item._detectedType || type;
  const itemId = item.id || item.tmdb_id;
  const href = effectiveType === 'movie' ? `/movies/${itemId}` : `/tv/${itemId}`;

  return (
    <Link to={href} className="group block">
      <div className="relative aspect-[2/3] rounded-sm overflow-hidden group-hover:scale-105 transition-transform duration-300 ease-out">
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
            <span className="text-muted text-xs text-center px-2">{item.title}</span>
          </div>
        )}
        {item.poster_url && !imgLoaded && (
          <div className="absolute inset-0 shimmer-bg animate-shimmer" />
        )}
        {item.poster_url && item.rating && item.rating !== '0' && item.rating !== '0.0' && (
          <div className="absolute top-1.5 right-1.5 bg-black/75 backdrop-blur-sm rounded px-1.5 py-0.5 flex items-center gap-0.5">
            <span className="text-yellow-400 text-[10px] font-bold">★</span>
            <span className="text-white text-[10px] font-bold">{item.rating}</span>
          </div>
        )}
        {watchProgress != null && watchProgress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
            <div
              className="h-full bg-primary"
              style={{ width: `${watchProgress}%` }}
            />
          </div>
        )}
      </div>
      <div className="mt-1.5">
        <h3 className="text-sm text-white truncate">{item.title}</h3>
        <div className="flex items-center gap-2 mt-0.5">
          {item.year && <span className="text-xs text-muted-foreground">{item.year}</span>}
        </div>
      </div>
    </Link>
  );
}
