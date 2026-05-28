import { Play } from 'lucide-react';
import VideoPlayer from './VideoPlayer';

export default function PlayerBox({ item, isPlaying, onPlay, onClose, embedUrl, contentId, metadata }) {
  const backdropSrc = item.backdrop_url || item.poster_url;

  return (
    <div className="relative w-full -mx-4 sm:-mx-6 lg:-mx-8 overflow-hidden">
      {/* Backdrop full-width background */}
      {backdropSrc && (
        <img
          src={backdropSrc}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      {/* Dark overlay on backdrop */}
      <div className="absolute inset-0 bg-black/60" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/40" />

      {/* Embed player centered inside the full-width backdrop */}
      <div className="relative py-10 px-4 sm:px-6 lg:px-8">
        {isPlaying ? (
          <div className="aspect-video w-full max-w-5xl mx-auto rounded-lg overflow-hidden shadow-2xl shadow-black/80">
            <VideoPlayer
              embedUrl={embedUrl}
              title={item.title}
              contentId={contentId}
              onBack={onClose}
              metadata={metadata}
            />
          </div>
        ) : (
          <div
            className="relative aspect-video w-full max-w-5xl mx-auto rounded-lg overflow-hidden cursor-pointer bg-black/40 shadow-2xl shadow-black/80 hover:shadow-black/90 transition-shadow"
            onClick={onPlay}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 rounded-full border-2 border-white/80 bg-white/10 flex items-center justify-center hover:bg-white/20 hover:scale-110 transition-all">
                <Play size={40} fill="white" color="white" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
