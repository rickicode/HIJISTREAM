import { Link } from 'react-router-dom';
import { useState } from 'react';

export default function ContentCard({ item, type = 'movie', watchProgress = null }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const effectiveType = item._detectedType || type;
  const href = effectiveType === 'movie' ? `/movies/${item.tmdb_id}` : `/tv/${item.tmdb_id}`;
  const genres = item.genre ? item.genre.split(',').map((g) => g.trim()).slice(0, 2) : [];

  return (
    <Link
      to={href}
      className="group block bg-[#1A1A1A] border border-[#2E2E2E] rounded-xl overflow-hidden hover:border-[#404040] hover:scale-[1.05] card-glow transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366F1] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F0F0F]"
    >
      <div className="relative aspect-[2/3]">
        <img
          src={item.poster_url}
          alt={item.title}
          loading="lazy"
          onLoad={() => setImgLoaded(true)}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            imgLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
        {!imgLoaded && (
          <div className="absolute inset-0 shimmer-bg animate-shimmer rounded-xl" />
        )}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#1A1A1A] to-transparent pointer-events-none" />
        {watchProgress != null && watchProgress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#262626]">
            <div
              className="h-full bg-[#6366F1]"
              style={{ width: `${watchProgress}%` }}
            />
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-medium text-sm text-white truncate">{item.title}</h3>
        <div className="flex items-center gap-2 mt-1">
          {item.year && <span className="text-xs text-[#A1A1A1]">{item.year}</span>}
          {item.rating && (
            <span className="text-xs text-[#A1A1A1]">
              <span className="text-[#FBBF24]">&#9733;</span> {item.rating}
            </span>
          )}
        </div>
        {genres.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {genres.map((genre) => (
              <span
                key={genre}
                className="bg-[#262626] text-[#A1A1A1] text-xs px-2 py-0.5 rounded-full"
              >
                {genre}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
