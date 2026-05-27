import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import api from '../utils/api';
import DetailHero from '../components/DetailHero';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';

export default function TVDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: show, isLoading, error, refetch } = useQuery({
    queryKey: ['tv', id],
    queryFn: () => api.getTVDetails(id),
  });

  useEffect(() => {
    if (show?.title) {
      document.title = `${show.title} - HIJISTREAM`;
    }
  }, [show]);

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

  if (!show) return null;

  const handlePlay = () => {
    // TV embed URL uses TMDB ID directly: /embed/tv/{TMDB_ID}
    navigate(`/player/tv/${show.tmdb_id || id}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <DetailHero item={show} type="tv" onPlay={handlePlay} />
    </div>
  );
}
