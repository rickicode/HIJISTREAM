import { useState } from 'react';
import { Play, Star, Clock } from 'lucide-react';

export default function DetailHero({ item, type: _type = 'movie', onPlay }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const genres = item.genre ? item.genre.split(',').map((g) => g.trim()) : [];

  return (
    <div className="flex flex-col md:flex-row gap-8">
      <div className="relative w-full md:w-[300px] shrink-0">
        <div className="relative aspect-[2/3] bg-gray-100 rounded-xl overflow-hidden shadow-lg">
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
        </div>
      </div>
      <div className="flex-1">
        <h1 className="text-3xl font-bold text-gray-900">{item.title}</h1>
        <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
          {item.year && <span>{item.year}</span>}
          {item.rating && (
            <span className="flex items-center gap-1">
              <Star size={14} className="text-yellow-500 fill-yellow-500" />
              {item.rating}
            </span>
          )}
          {item.runtime && (
            <span className="flex items-center gap-1">
              <Clock size={14} />
              {item.runtime} min
            </span>
          )}
        </div>
        {genres.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {genres.map((genre) => (
              <span
                key={genre}
                className="bg-gray-100 rounded-full px-3 py-1 text-sm text-gray-700"
              >
                {genre}
              </span>
            ))}
          </div>
        )}
        {item.overview && (
          <p className="mt-4 text-gray-600 leading-relaxed max-w-2xl">
            {item.overview}
          </p>
        )}
        {onPlay && (
          <button
            onClick={onPlay}
            className="mt-6 inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-xl text-base font-medium hover:bg-blue-700 transition-colors"
          >
            <Play size={20} fill="white" />
            Play
          </button>
        )}
      </div>
    </div>
  );
}
