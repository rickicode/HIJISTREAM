import { useState } from 'react';
import { Play, Captions, Check, Loader } from 'lucide-react';
import api from '../utils/api';
import { getCurrentLanguage } from '../utils/language';

function SubtitleBtn({ tvId, season, episode }) {
  const [state, setState] = useState('idle'); // idle | loading | ok | fail

  const handleClick = async (e) => {
    e.stopPropagation();
    if (state === 'loading') return;
    setState('loading');
    try {
      const userLang = getCurrentLanguage();
      const data = await api.getSubtitles({ type: 'tv', tmdbId: tvId, lang: userLang, season, episode });
      setState(data?.subtitles?.length > 0 ? 'ok' : 'fail');
    } catch {
      setState('fail');
    }
    setTimeout(() => setState('idle'), 3000);
  };

  const color = state === 'ok' ? 'text-green-400' : state === 'fail' ? 'text-red-400' : 'text-[#808080] hover:text-white';
  const title = state === 'ok' ? 'Subtitle tersedia' : state === 'fail' ? 'Subtitle tidak ditemukan' : 'Download subtitle';

  return (
    <button onClick={handleClick} title={title}
      className={`shrink-0 p-2 rounded hover:bg-white/10 transition-colors ${color}`}
      aria-label={title}>
      {state === 'loading' ? <Loader size={14} className="animate-spin" /> :
       state === 'ok' ? <Check size={14} /> :
       <Captions size={14} />}
    </button>
  );
}

export default function EpisodeList({ tvId, seasons, currentSeason, onSeasonChange, episodes, onPlayEpisode, isLoading }) {
  const seasonOptions = Array.from({ length: seasons }, (_, i) => i + 1);

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white">Episodes</h2>
        {seasons > 1 && (
          <select
            value={currentSeason}
            onChange={(e) => onSeasonChange(Number(e.target.value))}
            className="bg-background-elevated border border-border text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Select season"
          >
            {seasonOptions.map((num) => (
              <option key={num} value={num}>Season {num}</option>
            ))}
          </select>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-background-card rounded-lg p-4 animate-pulse">
              <div className="flex gap-4">
                <div className="w-40 h-24 bg-background-elevated rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-background-elevated rounded w-1/3" />
                  <div className="h-3 bg-background-elevated rounded w-full" />
                  <div className="h-3 bg-background-elevated rounded w-2/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : episodes.length === 0 ? (
        <div className="bg-background-card rounded-lg p-6 text-center">
          <p className="text-muted-foreground text-sm">No episodes available for this season</p>
          <button
            onClick={() => onPlayEpisode(currentSeason, 1)}
            className="mt-4 inline-flex items-center gap-2 bg-white text-black px-6 py-3 rounded text-sm font-semibold hover:bg-white/90 transition-colors"
          >
            <Play size={16} fill="black" /> Play Season {currentSeason}
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {episodes.map((episode) => (
            <div key={episode.episode_number} className="bg-background-card rounded-lg p-4 hover:bg-background-elevated transition-colors group">
              <div className="flex gap-4">
                <div className="relative w-40 h-24 bg-background-elevated rounded-lg overflow-hidden shrink-0">
                  {episode.still_path ? (
                    <img src={episode.still_path} alt={episode.name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-muted text-xs">Ep {episode.episode_number}</span>
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
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        {episode.air_date && <span>{episode.air_date}</span>}
                        {episode.runtime && <span>{episode.runtime} min</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <SubtitleBtn tvId={tvId} season={currentSeason} episode={episode.episode_number} />
                      <button
                        onClick={() => onPlayEpisode(currentSeason, episode.episode_number)}
                        className="bg-white/10 text-white p-2 rounded hover:bg-white/20 transition-colors"
                        aria-label={`Play episode ${episode.episode_number}`}
                      >
                        <Play size={14} fill="white" />
                      </button>
                    </div>
                  </div>
                  {episode.overview && (
                    <p className="mt-2 text-muted-foreground text-xs line-clamp-2 leading-relaxed">
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
