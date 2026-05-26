import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import DetailHero from '../components/DetailHero';
import EpisodeList from '../components/EpisodeList';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';

export default function TVDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: show, isLoading, error, refetch } = useQuery({
    queryKey: ['tv', id],
    queryFn: () => api.getTVDetails(id),
  });

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
    navigate(`/player/tv/${id}?season=1&episode=1`);
  };

  const handlePlayEpisode = (season, episode) => {
    navigate(`/player/tv/${id}?season=${season}&episode=${episode}`);
  };

  const seasons = show.seasons || show.number_of_seasons || 1;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <DetailHero item={show} type="tv" onPlay={handlePlay} />
      <EpisodeList
        seasons={seasons}
        tmdbId={id}
        onPlayEpisode={handlePlayEpisode}
      />
    </div>
  );
}
