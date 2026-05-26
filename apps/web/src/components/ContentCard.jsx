import { Link } from 'react-router-dom';
import { useState } from 'react';

export default function ContentCard({ item, type = 'movie', watchProgress }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const effectiveType = item._detectedType || type;
  const href = effectiveType === 'movie' ? `/movies/${item.tmdb_id}` : `/tv/${item.tmdb_id}`;
  const genres = item.genre ? item.genre.split(',').map((g) => g.trim()).slice(0, 2) : [];

  return (
    <Link
      to={href}
      className="group block border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 transition-all duration-200 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
    >
      <div className="relative aspect-[2/3] bg-gray-100">
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
          <div className="absolute inset-0 bg-gray-200 animate-pulse" />
        )}
        {watchProgress != null && watchProgress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-300">
            <div
              className="h-full bg-blue-600"
              style={{ width: `${watchProgress}%` }}
            />
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-medium text-sm text-gray-900 truncate">{item.title}</h3>
        <div className="flex items-center gap-2 mt-1">
          {item.year && <span className="text-xs text-gray-500">{item.year}</span>}
          {item.rating && (
            <span className="text-xs text-gray-500">&#9733; {item.rating}</span>
          )}
        </div>
        {genres.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {genres.map((genre) => (
              <span
                key={genre}
                className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full"
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
