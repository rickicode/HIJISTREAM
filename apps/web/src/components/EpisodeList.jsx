import { Play } from 'lucide-react';

export default function EpisodeList({ tmdbId, onPlayEpisode }) {
  // The VidAPI does not provide season/episode data.
  // TV embed URL is simply: https://vaplayer.ru/embed/tv/{TMDB_ID}
  // Show a simple play button instead of episode listing.

  const handlePlay = () => {
    if (onPlayEpisode) {
      onPlayEpisode(1, 1);
    }
  };

  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold text-white mb-4">Watch</h2>
      <div className="bg-[#1A1A1A] border border-[#2E2E2E] rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-medium">Start Watching</p>
            <p className="text-sm text-[#A1A1A1] mt-1">
              Stream this show now
            </p>
          </div>
          <button
            onClick={handlePlay}
            className="inline-flex items-center gap-2 bg-[#6366F1] text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-[#818CF8] transition-colors"
            aria-label={`Play TV show ${tmdbId}`}
          >
            <Play size={16} fill="white" />
            Play
          </button>
        </div>
      </div>
    </div>
  );
}
