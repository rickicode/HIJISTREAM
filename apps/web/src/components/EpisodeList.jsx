import { Play } from 'lucide-react';

export default function EpisodeList({ tvId: _tvId, seasons, currentSeason, onSeasonChange, episodes, onPlayEpisode, isLoading }) {
  const seasonOptions = Array.from({ length: seasons }, (_, i) => i + 1);

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white">Episodes</h2>
        {seasons > 1 && (
          <select
            value={currentSeason}
            onChange={(e) => onSeasonChange(Number(e.target.value))}
            className="bg-[#1A1A1A] border border-[#2E2E2E] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
            aria-label="Select season"
          >
            {seasonOptions.map((num) => (
              <option key={num} value={num}>
                Season {num}
              </option>
            ))}
          </select>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-[#1A1A1A] border border-[#2E2E2E] rounded-xl p-4 animate-pulse">
              <div className="flex gap-4">
                <div className="w-40 h-24 bg-[#262626] rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-[#262626] rounded w-1/3" />
                  <div className="h-3 bg-[#262626] rounded w-full" />
                  <div className="h-3 bg-[#262626] rounded w-2/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : episodes.length === 0 ? (
        <div className="bg-[#1A1A1A] border border-[#2E2E2E] rounded-xl p-6 text-center">
          <p className="text-[#A1A1A1] text-sm">No episodes available for this season</p>
          <button
            onClick={() => onPlayEpisode(currentSeason, 1)}
            className="mt-4 inline-flex items-center gap-2 bg-[#6366F1] text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-[#818CF8] transition-colors"
          >
            <Play size={16} fill="white" />
            Play Season {currentSeason}
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {episodes.map((episode) => (
            <div
              key={episode.episode_number}
              className="bg-[#1A1A1A] border border-[#2E2E2E] rounded-xl p-4 hover:border-[#404040] transition-colors group"
            >
              <div className="flex gap-4">
                <div className="relative w-40 h-24 bg-[#262626] rounded-lg overflow-hidden shrink-0">
                  {episode.still_path ? (
                    <img
                      src={episode.still_path}
                      alt={episode.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-[#6B6B6B] text-xs">Ep {episode.episode_number}</span>
                    </div>
                  )}
                  <button
                    onClick={() => onPlayEpisode(currentSeason, episode.episode_number)}
                    className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label={`Play episode ${episode.episode_number}`}
                  >
                    <Play size={24} className="text-white" fill="white" />
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-white font-medium text-sm truncate">
                        {episode.episode_number}. {episode.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 text-xs text-[#A1A1A1]">
                        {episode.air_date && <span>{episode.air_date}</span>}
                        {episode.runtime && <span>{episode.runtime} min</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => onPlayEpisode(currentSeason, episode.episode_number)}
                      className="shrink-0 bg-[#6366F1] text-white p-2 rounded-lg hover:bg-[#818CF8] transition-colors"
                      aria-label={`Play episode ${episode.episode_number}`}
                    >
                      <Play size={14} fill="white" />
                    </button>
                  </div>
                  {episode.overview && (
                    <p className="mt-2 text-[#A1A1A1] text-xs line-clamp-2 leading-relaxed">
                      {episode.overview}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
