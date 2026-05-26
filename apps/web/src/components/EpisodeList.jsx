import { useState } from 'react';
import { Play } from 'lucide-react';

export default function EpisodeList({ seasons = 1, tmdbId, onPlayEpisode }) {
  const totalSeasons = typeof seasons === 'number' ? seasons : (Array.isArray(seasons) ? seasons.length : 1);
  const [activeSeason, setActiveSeason] = useState(1);
  const episodesPerSeason = 10;

  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Episodes</h2>
      {totalSeasons > 1 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {Array.from({ length: totalSeasons }).map((_, i) => (
            <button
              key={i + 1}
              onClick={() => setActiveSeason(i + 1)}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                activeSeason === i + 1
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Season {i + 1}
            </button>
          ))}
        </div>
      )}
      <div className="space-y-1">
        {Array.from({ length: episodesPerSeason }).map((_, i) => (
          <div
            key={i + 1}
            className="flex items-center justify-between py-3 px-3 border-b border-gray-100 hover:bg-gray-50 rounded-lg transition-colors group"
          >
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500 w-8">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="text-sm text-gray-900">
                Episode {i + 1}
              </span>
            </div>
            <button
              onClick={() => onPlayEpisode(activeSeason, i + 1)}
              className="opacity-0 group-hover:opacity-100 p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-all"
            >
              <Play size={14} fill="white" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
