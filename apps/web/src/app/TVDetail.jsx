import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../utils/api';
import { useTranslation } from '../i18n';
import DetailHero from '../components/DetailHero';
import EpisodeList from '../components/EpisodeList';
import PlayerBox from '../components/PlayerBox';
import ContentRail from '../components/ContentRail';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import SubtitlePicker from '../components/SubtitlePicker';
import SubtitleSearchModal from '../components/SubtitleSearchModal';
import { getTVEmbedUrl, loadWatchProgress } from '../utils/player';
import { getCurrentLanguage } from '../utils/language';
import { Search } from 'lucide-react';

// All supported subtitle languages — fetched in parallel so user can pick
const ALL_SUBTITLE_LANGS = ['id', 'en', 'ja', 'ko', 'es', 'pt', 'hi'].join(',');

export default function TVDetail() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const autoplay = searchParams.get('autoplay') === 'true';
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSeason, setCurrentSeason] = useState(1);
  const [currentEpisode, setCurrentEpisode] = useState(1);
  const [availableSubtitles, setAvailableSubtitles] = useState([]);
  const [selectedSubtitle, setSelectedSubtitle] = useState(null);
  const [snapshotEmbedUrl, setSnapshotEmbedUrl] = useState(null);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const { t } = useTranslation();
  const [_langVersion, setLangVersion] = useState(0);
  const autoplayCaptured = useRef(false);

  useEffect(() => {
    const onLangChange = () => setLangVersion(v => v + 1);
    window.addEventListener('language-change', onLangChange);
    return () => window.removeEventListener('language-change', onLangChange);
  }, []);

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

  const tvId = show?.id || id;

  const storedProgress = loadWatchProgress(`${tvId}_s${currentSeason}e${currentEpisode}`);
  const resumeAt = storedProgress?.time || undefined;

  useEffect(() => {
    if (show?.title) {
      document.title = `${show.title} - HIJISTREAM`;
    }
  }, [show]);

  // Smart language fetch: user language first (fast), then others deferred
  useEffect(() => {
    if (!show) return;
    const currentLang = getCurrentLanguage();
    const otherLangs = ALL_SUBTITLE_LANGS.split(',').filter(l => l !== currentLang);

    // Priority: fetch user language immediately
    api.getSubtitles({
      type: 'tv',
      tmdbId: show.id,
      lang: currentLang,
      season: currentSeason,
      episode: currentEpisode,
      imdbId: show.imdb_id || undefined,
    }).then((data) => {
      const list = data?.subtitles || [];
      setAvailableSubtitles(list);
      const match = list.find((s) => s.lang === currentLang);
      if (match) setSelectedSubtitle(match);
      else if (list.length > 0) setSelectedSubtitle(list[0]);

      // Deferred: fetch remaining languages in background
      if (otherLangs.length > 0) {
        setTimeout(() => {
          api.getSubtitles({
            type: 'tv',
            tmdbId: show.id,
            lang: otherLangs.join(','),
            season: currentSeason,
            episode: currentEpisode,
            imdbId: show.imdb_id || undefined,
          }).then((data2) => {
            const moreList = data2?.subtitles || [];
            if (moreList.length > 0) {
              setAvailableSubtitles(prev => {
                const existing = new Set(prev.map(s => s.lang));
                const merged = [...prev];
                for (const s of moreList) { if (!existing.has(s.lang)) merged.push(s); }
                return merged;
              });
            }
          }).catch(() => {});
        }, 1500);
      }
    }).catch((err) => {
      console.error('[Subtitle] Failed to fetch:', err);
      setAvailableSubtitles([]);
      setSelectedSubtitle(null);
    });
  }, [show?.id, currentSeason, currentEpisode, _langVersion]);

  // Snapshot the embed URL at play time so it never changes mid-playback
  const captureEmbedUrl = useCallback((sub, season, episode) => {
    const opts = { skin: 'netflix' };
    if (sub) {
      opts.subUrl = sub.url;
      opts.subLang = sub.lang;
      opts.subDefault = true;
    }
    const s = season ?? currentSeason;
    const e = episode ?? currentEpisode;
    setSnapshotEmbedUrl(getTVEmbedUrl(tvId, s, e, resumeAt, opts));
  }, [tvId, resumeAt, currentSeason, currentEpisode]);

  // Autoplay: capture once with whatever subtitle is available at mount time
  useEffect(() => {
    if (autoplay && !autoplayCaptured.current) {
      autoplayCaptured.current = true;
      captureEmbedUrl(selectedSubtitle);
      setIsPlaying(true);
    }
  }, [autoplay, captureEmbedUrl]);

  useEffect(() => {
    if (isPlaying) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [isPlaying, currentSeason, currentEpisode]);

  const handlePlayEpisode = useCallback((season, episodeNumber) => {
    setCurrentSeason(season);
    setCurrentEpisode(episodeNumber);
    captureEmbedUrl(selectedSubtitle, season, episodeNumber);
    setIsPlaying(true);
    setSearchParams({}, { replace: true });
  }, [setSearchParams, selectedSubtitle, captureEmbedUrl]);

  const handlePlay = useCallback(() => {
    captureEmbedUrl(selectedSubtitle);
    setIsPlaying(true);
    setSearchParams({}, { replace: true });
  }, [setSearchParams, selectedSubtitle, captureEmbedUrl]);

  const handleClosePlayer = useCallback(() => {
    setIsPlaying(false);
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  // ── Early returns (all hooks are above) ──────────────────────────────────
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

  // Fallback embed URL (reactive, used only before first play)
  const embedOptions = { skin: 'netflix' };
  if (selectedSubtitle) {
    embedOptions.subUrl = selectedSubtitle.url;
    embedOptions.subLang = selectedSubtitle.lang;
    embedOptions.subDefault = true;
  }
  const fallbackEmbedUrl = getTVEmbedUrl(tvId, currentSeason, currentEpisode, resumeAt, embedOptions);

  const metadata = {
    title: show.title || '',
    poster_url: show.poster_url || '',
    type: 'tv',
  };

  const numberOfSeasons = show.number_of_seasons || 1;
  const recommendedItems = recommendations?.items?.slice(0, 12) || [];

  return (
    <div className="pt-16">
      <PlayerBox
        item={show}
        isPlaying={isPlaying}
        onPlay={handlePlay}
        onClose={handleClosePlayer}
        embedUrl={snapshotEmbedUrl || fallbackEmbedUrl}
        contentId={`${tvId}_s${currentSeason}e${currentEpisode}`}
        metadata={metadata}
      />

      {/* Subtitle picker — shown between player and detail content */}
      {!isPlaying && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#666] font-medium uppercase tracking-wider">Subtitles</span>
            {availableSubtitles.length > 0 ? (
              <SubtitlePicker
                subtitles={availableSubtitles}
                selected={selectedSubtitle}
                onSelect={setSelectedSubtitle}
                disabled={isPlaying}
              />
            ) : (
              <span className="text-[10px] text-[#555]">Belum ada subtitle</span>
            )}
            {selectedSubtitle && (
              <span className="text-[10px] text-green-400/70 bg-green-400/5 px-1.5 py-0.5 rounded">
                Auto-loaded
              </span>
            )}
            <button
              onClick={() => setShowSearchModal(true)}
              className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium text-[#808080] border border-[#333] rounded-md hover:border-[#E50914] hover:text-[#E50914] hover:bg-[#E50914]/5 transition-colors"
            >
              <Search size={10} /> Cari Subtitle
            </button>
          </div>
        </div>
      )}

      <SubtitleSearchModal
        open={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        item={show ? { id: show.id, title: show.title, type: 'tv', imdb_id: show.imdb_id, number_of_seasons: show.number_of_seasons } : null}
        season={currentSeason}
        episode={currentEpisode}
        onDownloaded={(sub) => {
          // Refresh subtitle list
          if (show) {
            const currentLang = getCurrentLanguage();
            api.getSubtitles({ type: 'tv', tmdbId: show.id, lang: currentLang, season: currentSeason, episode: currentEpisode, imdbId: show.imdb_id }).then((data) => {
              const list = data?.subtitles || [];
              setAvailableSubtitles(prev => {
                const existing = new Set(prev.map(s => s.lang));
                const merged = [...prev];
                for (const s of list) { if (!existing.has(s.lang)) merged.push(s); }
                return merged;
              });
              if (sub && sub.url) {
                setSelectedSubtitle({ url: sub.url, lang: sub.lang, format: 'vtt', cached: false });
              }
            }).catch(() => {});
          }
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
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
              title={t('common.moreLikeThis')}
              items={recommendedItems}
              type="tv"
            />
          </div>
        )}
      </div>
    </div>
  );
}
