import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import api from '../utils/api';
import { loadWatchProgress } from '../utils/player';
import DetailHero from '../components/DetailHero';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';

export default function MovieDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: movie, isLoading, error, refetch } = useQuery({
    queryKey: ['movie', id],
    queryFn: () => api.getMovieDetails(id),
  });

  useEffect(() => {
    if (movie?.title) {
      document.title = `${movie.title} - HIJISTREAM`;
    }
  }, [movie]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <LoadingState type="detail" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ErrorState error={error} onRetry={refetch} />
      </div>
    );
  }

  if (!movie) return null;

  const _progress = loadWatchProgress(movie.imdb_id || id);

  const handlePlay = () => {
    // Movie embed URL uses IMDB ID: /embed/movie/{IMDB_ID}
    const playId = movie.imdb_id || id;
    navigate(`/player/movie/${playId}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <DetailHero item={movie} type="movie" onPlay={handlePlay} />
    </div>
  );
}
