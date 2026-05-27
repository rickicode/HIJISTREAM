import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import api from '../utils/api';
import DetailHero from '../components/DetailHero';
import EpisodeList from '../components/EpisodeList';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';

export default function TVDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedSeason, setSelectedSeason] = useState(1);

  const { data: show, isLoading, error, refetch } = useQuery({
    queryKey: ['tv', id],
    queryFn: () => api.getTVDetails(id),
  });

  const { data: seasonData, isLoading: seasonLoading } = useQuery({
    queryKey: ['tv-season', id, selectedSeason],
    queryFn: () => api.getTVSeason(id, selectedSeason),
    enabled: !!show?.number_of_seasons,
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
    navigate(`/player/tv/${show.id || id}?season=1&episode=1`);
  };

  const handlePlayEpisode = (season, episodeNumber) => {
    navigate(`/player/tv/${show.id || id}?season=${season}&episode=${episodeNumber}`);
  };

  const numberOfSeasons = show.number_of_seasons || 1;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <DetailHero item={show} type="tv" onPlay={handlePlay} />
      <EpisodeList
        tvId={id}
        seasons={numberOfSeasons}
        currentSeason={selectedSeason}
        onSeasonChange={setSelectedSeason}
        episodes={seasonData?.episodes || []}
        onPlayEpisode={handlePlayEpisode}
        isLoading={seasonLoading}
      />
    </div>
  );
}
