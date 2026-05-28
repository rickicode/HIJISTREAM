import { useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { getMovieEmbedUrl, getTVEmbedUrl, loadWatchProgress } from '../utils/player';
import VideoPlayer from '../components/VideoPlayer';

export default function Player() {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const playerContainerRef = useRef(null);

  const season = searchParams.get('season');
  const episode = searchParams.get('episode');

  const routeState = location.state || {};
  const storedProgress = loadWatchProgress(id);

  const progress = storedProgress;
  const resumeAt = progress?.time || undefined;

  let embedUrl = '';
  let title = routeState.title || '';
  const contentId = id;

  if (type === 'movie') {
    embedUrl = getMovieEmbedUrl(id, resumeAt);
    title = title || `Movie - ${id}`;
  } else {
    embedUrl = getTVEmbedUrl(id, season || 1, episode || 1, resumeAt);
    title = title || `TV - ${id}`;
  }

  const metadata = {
    title: routeState.title || storedProgress?.title || title,
    poster_url: routeState.poster_url || storedProgress?.poster_url || '',
    type: type || 'movie',
  };

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
        metadata={metadata}
      />
    </div>
  );
}
