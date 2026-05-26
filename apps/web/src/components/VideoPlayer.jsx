import { useEffect, useRef, useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';
import { saveWatchProgress } from '../utils/player';

export default function VideoPlayer({ embedUrl, title, contentId, onBack }) {
  const lastSaveRef = useRef(0);

  const handleMessage = useCallback(
    (event) => {
      if (!event.data || typeof event.data !== 'object') return;
      if (event.data.type === 'PLAYER_EVENT' && event.data.event === 'progress') {
        const now = Date.now();
        if (now - lastSaveRef.current >= 5000) {
          lastSaveRef.current = now;
          saveWatchProgress(contentId, event.data.time, event.data.duration);
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
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-900">
        <button
          onClick={onBack}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
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
