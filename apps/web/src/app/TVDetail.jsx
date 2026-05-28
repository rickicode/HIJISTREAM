import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import api from '../utils/api';
import DetailHero from '../components/DetailHero';
import EpisodeList from '../components/EpisodeList';
import VideoPlayer from '../components/VideoPlayer';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import { getTVEmbedUrl, loadWatchProgress } from '../utils/player';

export default function TVDetail() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const autoplay = searchParams.get('autoplay') === 'true';
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [isPlaying, setIsPlaying] = useState(autoplay);
  const [currentSeason, setCurrentSeason] = useState(1);
  const [currentEpisode, setCurrentEpisode] = useState(1);

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

  if (!show) return null;

  const tvId = show.id || id;
  const storedProgress = loadWatchProgress(tvId);
  const resumeAt = storedProgress?.time || undefined;
  const embedUrl = getTVEmbedUrl(tvId, currentSeason, currentEpisode, resumeAt);

  const handlePlay = () => {
    setCurrentSeason(1);
    setCurrentEpisode(1);
    setIsPlaying(true);
    setSearchParams({}, { replace: true });
  };

  const handlePlayEpisode = (season, episodeNumber) => {
    setCurrentSeason(season);
    setCurrentEpisode(episodeNumber);
    setIsPlaying(true);
    setSearchParams({}, { replace: true });
  };

  const handleClosePlayer = () => {
    setIsPlaying(false);
    setSearchParams({}, { replace: true });
  };

  const metadata = {
    title: show.title || '',
    poster_url: show.poster_url || '',
    type: 'tv',
  };

  const numberOfSeasons = show.number_of_seasons || 1;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8">
      {isPlaying && (
        <div className="mb-6">
          <VideoPlayer
            embedUrl={embedUrl}
            title={show.title || `TV - ${id}`}
            contentId={tvId}
            onBack={handleClosePlayer}
            metadata={metadata}
          />
        </div>
      )}
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
