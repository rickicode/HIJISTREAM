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

      // Support TDD format: { type: 'PLAYER_EVENT', data: { player_status, player_progress, player_duration } }
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

      // Also support simpler format
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
    <div className="bg-black min-h-screen">
      <div className="flex items-center gap-3 px-4 py-3 bg-[#0F0F0F]">
        <button
          onClick={onBack}
          className="p-2 rounded-lg text-[#A1A1A1] hover:text-white hover:bg-[#262626] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366F1] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
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
