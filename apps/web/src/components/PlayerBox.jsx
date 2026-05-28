import { Play } from 'lucide-react';
import VideoPlayer from './VideoPlayer';

export default function PlayerBox({ item, isPlaying, onPlay, onClose, embedUrl, contentId, metadata }) {
  const backdropSrc = item.backdrop_url || item.poster_url;

  return (
    <div className="relative w-full">
      {/* Backdrop image: TRUE full-width background, edge to edge */}
      {backdropSrc && (
        <img
          src={backdropSrc}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      {/* Overlay on backdrop */}
      <div className="absolute inset-0 bg-black/50" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-black/30" />

      {/* Player embed area: centered inside the backdrop section */}
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {isPlaying ? (
          <div className="aspect-video w-full rounded-lg overflow-hidden shadow-2xl shadow-black/70 bg-black">
            <VideoPlayer
              embedUrl={embedUrl}
              title={item.title}
              contentId={contentId}
              metadata={metadata}
            />
          </div>
        ) : (
          <div
            className="relative aspect-video w-full rounded-lg overflow-hidden cursor-pointer bg-transparent"
            onClick={onPlay}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 rounded-full border-2 border-white/80 bg-black/50 flex items-center justify-center hover:bg-black/70 hover:scale-110 transition-all">
                <Play size={40} fill="white" color="white" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
