import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import api from '../utils/api';
import DetailHero from '../components/DetailHero';
import EpisodeList from '../components/EpisodeList';
import PlayerBox from '../components/PlayerBox';
import ContentRail from '../components/ContentRail';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import { getTVEmbedUrl, loadWatchProgress } from '../utils/player';

export default function TVDetail() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const autoplay = searchParams.get('autoplay') === 'true';
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
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

  const { data: recommendations } = useQuery({
    queryKey: ['tv-recommendations', id],
    queryFn: () => api.getTVRecommendations(id),
    enabled: !!show,
  });

  const recommendedItems = recommendations?.items?.slice(0, 12) || [];

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

  // Auto-scroll to player when it becomes visible or episode changes
  useEffect(() => {
    if (isPlaying) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [isPlaying, currentSeason, currentEpisode]);

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
  const storedProgress = loadWatchProgress(`${tvId}_s${currentSeason}e${currentEpisode}`);
  const resumeAt = storedProgress?.time || undefined;
  const embedUrl = getTVEmbedUrl(tvId, currentSeason, currentEpisode, resumeAt);

  const handlePlayEpisode = (season, episodeNumber) => {
    setCurrentSeason(season);
    setCurrentEpisode(episodeNumber);
    setIsPlaying(true);
    setSearchParams({}, { replace: true });
  };

  const handlePlay = () => {
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
      <PlayerBox
        item={show}
        isPlaying={isPlaying}
        onPlay={handlePlay}
        onClose={handleClosePlayer}
        embedUrl={embedUrl}
        contentId={`${tvId}_s${currentSeason}e${currentEpisode}`}
        metadata={metadata}
      />
      <div className="mt-8">
        <DetailHero item={show} type="tv" />
      </div>
      <EpisodeList
        tvId={id}
        seasons={numberOfSeasons}
        currentSeason={selectedSeason}
        onSeasonChange={setSelectedSeason}
        episodes={seasonData?.episodes || []}
        onPlayEpisode={handlePlayEpisode}
        isLoading={seasonLoading}
      />
      {recommendedItems.length > 0 && (
        <div className="mt-10">
          <ContentRail
            title="Related Series"
            items={recommendedItems}
            type="tv"
          />
        </div>
      )}
    </div>
  );
}
