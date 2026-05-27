import { useState } from 'react';
import { Play, Star, Clock } from 'lucide-react';

export default function DetailHero({ item, type: _type = 'movie', onPlay }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const genres = item.genre ? item.genre.split(',').map((g) => g.trim()) : [];
  const cast = item.credits?.slice(0, 5) || [];

  return (
    <div className="relative">
      {item.backdrop_url && (
        <div className="absolute inset-0 -mx-4 sm:-mx-6 lg:-mx-8 -mt-8 h-[400px] overflow-hidden">
          <img
            src={item.backdrop_url}
            alt=""
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0F0F0F]/80 to-[#0F0F0F]" />
        </div>
      )}
      <div className="relative flex flex-col md:flex-row gap-8">
        <div className="relative w-full md:w-[300px] shrink-0">
          <div className="relative aspect-[2/3] bg-[#1A1A1A] rounded-xl overflow-hidden shadow-2xl shadow-black/50">
            {item.poster_url ? (
              <img
                src={item.poster_url}
                alt={item.title}
                loading="lazy"
                onLoad={() => setImgLoaded(true)}
                className={`w-full h-full object-cover transition-opacity duration-300 ${
                  imgLoaded ? 'opacity-100' : 'opacity-0'
                }`}
              />
            ) : (
              <div className="w-full h-full bg-[#262626] flex items-center justify-center">
                <span className="text-[#6B6B6B] text-sm text-center px-4">{item.title}</span>
              </div>
            )}
            {item.poster_url && !imgLoaded && (
              <div className="absolute inset-0 shimmer-bg animate-shimmer" />
            )}
          </div>
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-white">{item.title}</h1>
          <div className="flex items-center gap-4 mt-3 text-sm text-[#A1A1A1]">
            {item.year && <span>{item.year}</span>}
            {item.rating && item.rating !== '0.0' && (
              <span className="flex items-center gap-1">
                <Star size={14} className="text-[#FBBF24] fill-[#FBBF24]" />
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
                  className="bg-[#262626] rounded-full px-3 py-1 text-sm text-[#A1A1A1]"
                >
                  {genre}
                </span>
              ))}
            </div>
          )}
          {item.overview && (
            <p className="mt-4 text-[#A1A1A1] leading-relaxed max-w-2xl">
              {item.overview}
            </p>
          )}
          {cast.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-[#A1A1A1] mb-2">Cast</h3>
              <div className="flex flex-wrap gap-2">
                {cast.map((actor) => (
                  <span
                    key={actor}
                    className="bg-[#1A1A1A] border border-[#2E2E2E] rounded-full px-3 py-1 text-sm text-white"
                  >
                    {actor}
                  </span>
                ))}
              </div>
            </div>
          )}
          {onPlay && (
            <button
              onClick={onPlay}
              className="mt-6 inline-flex items-center gap-2 bg-[#6366F1] text-white px-8 py-3 rounded-xl text-base font-medium hover:bg-[#818CF8] transition-colors"
            >
              <Play size={20} fill="white" />
              Play
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
