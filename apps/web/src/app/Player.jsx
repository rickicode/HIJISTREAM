import { useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { getMovieEmbedUrl, getTVEmbedUrl, loadWatchProgress } from '../utils/player';
import VideoPlayer from '../components/VideoPlayer';

export default function Player() {
  const { type, id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const playerContainerRef = useRef(null);

  const season = searchParams.get('season');
  const episode = searchParams.get('episode');

  const progress = loadWatchProgress(id);
  const resumeAt = progress?.time || undefined;

  let embedUrl = '';
  let title = '';
  let contentId = id;

  if (type === 'movie') {
    embedUrl = getMovieEmbedUrl(id, resumeAt);
    title = `Movie - ${id}`;
  } else {
    const s = season || '1';
    const e = episode || '1';
    embedUrl = getTVEmbedUrl(id, s, e, resumeAt);
    title = `TV - S${s}E${e}`;
    contentId = `${id}_s${s}e${e}`;
  }

  useEffect(() => {
    document.title = 'Now Playing - HIJISTREAM';
  }, []);

  const handleBack = useCallback(() => {
    if (type === 'movie') {
      navigate(-1);
    } else {
      navigate(`/tv/${id}`);
    }
  }, [type, id, navigate]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = e.target.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;

      if (e.key === 'Escape') {
        handleBack();
      } else if (e.key === 'f' || e.key === 'F') {
        const container = playerContainerRef.current;
        if (container) {
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else {
            container.requestFullscreen();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleBack]);

  return (
    <div ref={playerContainerRef}>
      <VideoPlayer
        embedUrl={embedUrl}
        title={title}
        contentId={contentId}
        onBack={handleBack}
      />
    </div>
  );
}
