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
      className="relative aspect-video w-full rounded-lg overflow-hidden cursor-pointer"
      onClick={onPlay}
    >
      {item.backdrop_url ? (
        <img
          src={item.backdrop_url}
          alt={item.title}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-background-elevated" />
      )}
      <div className="absolute inset-0 bg-black/50" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-20 h-20 rounded-full border-2 border-white/80 bg-black/30 flex items-center justify-center">
          <Play size={40} fill="white" color="white" />
        </div>
      </div>
    </div>
  );
}
