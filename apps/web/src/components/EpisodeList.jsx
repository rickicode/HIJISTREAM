import { useState } from 'react';
import { Play } from 'lucide-react';

export default function EpisodeList({ episodes, seasons = 1, tmdbId: _tmdbId, onPlayEpisode }) {
  const totalSeasons = typeof seasons === 'number' ? seasons : (Array.isArray(/** @type {any} */ (seasons)) ? /** @type {any[]} */ (seasons).length : 1);
  const [activeSeason, setActiveSeason] = useState(1);
  const episodesPerSeason = 10;

  // Use API episodes data if available, otherwise generate placeholder list
  const hasEpisodeData = Array.isArray(episodes) && episodes.length > 0;
  const seasonEpisodes = hasEpisodeData
    ? episodes.filter((ep) => ep.season === activeSeason || ep.season_number === activeSeason)
    : Array.from({ length: episodesPerSeason }).map((_, i) => ({
        episode: i + 1,
        title: `Episode ${i + 1}`,
      }));

  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold text-white mb-4">Episodes</h2>
      {totalSeasons > 1 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {Array.from({ length: totalSeasons }).map((_, i) => (
            <button
              key={i + 1}
              onClick={() => setActiveSeason(i + 1)}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                activeSeason === i + 1
                  ? 'bg-[#6366F1] text-white'
                  : 'bg-[#1A1A1A] text-[#A1A1A1] hover:bg-[#262626] hover:text-white'
              }`}
            >
              Season {i + 1}
            </button>
          ))}
        </div>
      )}
      <div className="space-y-1">
        {seasonEpisodes.map((ep, i) => {
          const epNumber = ep.episode_number || ep.episode || i + 1;
          const epTitle = ep.name || ep.title || `Episode ${epNumber}`;

          return (
            <div
              key={epNumber}
              className="flex items-center justify-between py-3 px-3 border-b border-[#2E2E2E] hover:bg-[#1A1A1A] rounded-lg transition-colors group"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm text-[#6B6B6B] w-8">
                  {String(epNumber).padStart(2, '0')}
                </span>
                <span className="text-sm text-white">
                  {epTitle}
                </span>
              </div>
              <button
                onClick={() => onPlayEpisode(activeSeason, epNumber)}
                className="sm:opacity-0 sm:group-hover:opacity-100 p-2 rounded-full bg-[#6366F1] text-white hover:bg-[#818CF8] transition-all"
              >
                <Play size={14} fill="white" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
