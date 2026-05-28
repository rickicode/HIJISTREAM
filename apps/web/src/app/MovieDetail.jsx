import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import api from '../utils/api';
import DetailHero from '../components/DetailHero';
import VideoPlayer from '../components/VideoPlayer';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import { getMovieEmbedUrl, loadWatchProgress } from '../utils/player';

export default function MovieDetail() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const autoplay = searchParams.get('autoplay') === 'true';
  const [isPlaying, setIsPlaying] = useState(autoplay);

  const { data: movie, isLoading, error, refetch } = useQuery({
    queryKey: ['movie', id],
    queryFn: () => api.getMovieDetails(id),
  });

  useEffect(() => {
    if (movie?.title) {
      document.title = `${movie.title} - HIJISTREAM`;
    }
  }, [movie]);

  useEffect(() => {
    if (autoplay) {
      setIsPlaying(true);
    }
  }, [autoplay]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8">
        <LoadingState type="detail" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8">
        <ErrorState error={error} onRetry={refetch} />
      </div>
    );
  }

  if (!movie) return null;

  const playId = movie.id || id;
  const storedProgress = loadWatchProgress(playId);
  const resumeAt = storedProgress?.time || undefined;
  const embedUrl = getMovieEmbedUrl(playId, resumeAt);

  const handlePlay = () => {
    setIsPlaying(true);
    setSearchParams({}, { replace: true });
  };

  const handleClosePlayer = () => {
    setIsPlaying(false);
    setSearchParams({}, { replace: true });
  };

  const metadata = {
    title: movie.title || '',
    poster_url: movie.poster_url || '',
    type: 'movie',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8">
      {isPlaying && (
        <div className="mb-6">
          <VideoPlayer
            embedUrl={embedUrl}
            title={movie.title || `Movie - ${id}`}
            contentId={playId}
            onBack={handleClosePlayer}
            metadata={metadata}
          />
        </div>
      )}
      <DetailHero item={movie} type="movie" onPlay={handlePlay} />
    </div>
  );
}
