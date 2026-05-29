import { useEffect, useRef, useCallback } from 'react';
import { saveWatchProgress } from '../utils/player';

export default function VideoPlayer({ embedUrl, title, contentId, metadata = {} }) {
  const lastSaveRef = useRef(0);
  const metadataRef = useRef(metadata);
  metadataRef.current = metadata;

  const handleMessage = useCallback(
    (event) => {
      if (event.origin !== 'https://vaplayer.ru' && event.origin !== 'https://brightpathsignals.com') return;
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
    <iframe
      src={embedUrl}
      title={title}
      width="100%"
      height="100%"
      frameBorder="0"
      allowFullScreen
      allow="autoplay; encrypted-media; picture-in-picture"
      sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
      style={{ border: 'none', display: 'block' }}
    />
  );
}
