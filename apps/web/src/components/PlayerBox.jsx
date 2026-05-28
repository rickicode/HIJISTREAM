import { Play } from 'lucide-react';
import VideoPlayer from './VideoPlayer';

export default function PlayerBox({ item, isPlaying, onPlay, onClose, embedUrl, contentId, metadata }) {
  if (isPlaying) {
    return (
      <VideoPlayer
        embedUrl={embedUrl}
        title={item.title}
        contentId={contentId}
        onBack={onClose}
        metadata={metadata}
      />
    );
  }

  return (
    <div
      className="relative aspect-video w-full rounded-lg overflow-hidden cursor-pointer bg-black"
      onClick={onPlay}
    >
      {item.backdrop_url && (
        <img
          src={item.backdrop_url}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-20 h-20 rounded-full border-2 border-white/80 bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
          <Play size={40} fill="white" color="white" />
        </div>
      </div>
    </div>
  );
}
