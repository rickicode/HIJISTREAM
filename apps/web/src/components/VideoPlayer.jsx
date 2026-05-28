import { useEffect, useRef, useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';
import { saveWatchProgress } from '../utils/player';

export default function VideoPlayer({ embedUrl, title, contentId, onBack, metadata = {} }) {
  const lastSaveRef = useRef(0);
  const metadataRef = useRef(metadata);
  metadataRef.current = metadata;

  const handleMessage = useCallback(
    (event) => {
      if (event.origin !== 'https://vaplayer.ru') return;
      if (!event.data || typeof event.data !== 'object') return;

      const data = event.data;

      if (data.type === 'PLAYER_EVENT' && data.data) {
        const { player_status, player_progress, player_duration } = data.data;

        if (player_status === 'playing' || player_status === 'paused') {
          const now = Date.now();
          if (now - lastSaveRef.current >= 5000) {
            lastSaveRef.current = now;
            saveWatchProgress(contentId, player_progress, player_duration, metadataRef.current);
          }
        }
      }

      if (data.type === 'PLAYER_EVENT' && data.event === 'progress') {
        const now = Date.now();
        if (now - lastSaveRef.current >= 5000) {
          lastSaveRef.current = now;
          saveWatchProgress(contentId, data.time, data.duration, metadataRef.current);
        }
      }
    },
    [contentId]
  );

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);

  return (
    <div className="bg-black rounded-lg overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 bg-black/80">
        <button
          onClick={onBack}
          className="p-2 rounded text-muted-foreground hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-white text-sm font-medium truncate">{title}</h1>
      </div>
      <div className="aspect-video w-full">
        <iframe
          src={embedUrl}
          title={title}
          width="100%"
          height="100%"
          allow="autoplay; fullscreen; encrypted-media"
          allowFullScreen
          className="w-full h-full border-0"
        />
      </div>
    </div>
  );
}
