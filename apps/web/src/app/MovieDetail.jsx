import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState, useCallback, useRef } from 'react';
import api from '../utils/api';
import { useTranslation } from '../i18n';
import DetailHero from '../components/DetailHero';
import PlayerBox from '../components/PlayerBox';
import ContentRail from '../components/ContentRail';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import SubtitlePicker from '../components/SubtitlePicker';
import SubtitleSearchModal from '../components/SubtitleSearchModal';
import { getMovieEmbedUrl, loadWatchProgress } from '../utils/player';
import { getCurrentLanguage } from '../utils/language';
import { Captions, Check, Loader, Search } from 'lucide-react';

const ALL_SUBTITLE_LANGS = ['id', 'en', 'ja', 'ko', 'es', 'pt', 'hi'].join(',');

export default function MovieDetail() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const autoplay = searchParams.get('autoplay') === 'true';
  const [isPlaying, setIsPlaying] = useState(autoplay);
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

  const { data: movie, isLoading, error, refetch } = useQuery({
    queryKey: ['movie', id],
    queryFn: () => api.getMovieDetails(id),
  });

  const { data: recommendations } = useQuery({
    queryKey: ['movie-recommendations', id],
    queryFn: () => api.getMovieRecommendations(id),
    enabled: !!movie,
  });

  const playId = movie?.imdb_id || movie?.id || id;
  const storedProgress = loadWatchProgress(playId);
  const resumeAt = storedProgress?.time || undefined;

  useEffect(() => {
    if (movie?.title) document.title = `${movie.title} - HIJISTREAM`;
  }, [movie]);

  // Smart language fetch: user language first (fast), then others deferred
  useEffect(() => {
    if (!movie) return;
    const currentLang = getCurrentLanguage();
    const otherLangs = ALL_SUBTITLE_LANGS.split(',').filter(l => l !== currentLang);

    // Priority: fetch user language immediately
    api.getSubtitles({
      type: 'movie',
      tmdbId: movie.id,
      lang: currentLang,
      imdbId: movie.imdb_id || undefined,
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
            type: 'movie',
            tmdbId: movie.id,
            lang: otherLangs.join(','),
            imdbId: movie.imdb_id || undefined,
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
    }).catch(() => {
      setAvailableSubtitles([]);
      setSelectedSubtitle(null);
    });
  }, [movie?.id, _langVersion]);

  const captureEmbedUrl = useCallback((sub) => {
    const opts = { skin: 'netflix' };
    if (sub) { opts.subUrl = sub.url; opts.subLang = sub.lang; opts.subDefault = true; }
    setSnapshotEmbedUrl(getMovieEmbedUrl(playId, resumeAt, opts));
  }, [playId, resumeAt]);

  useEffect(() => {
    if (autoplay && !autoplayCaptured.current) {
      autoplayCaptured.current = true;
      captureEmbedUrl(selectedSubtitle);
      setIsPlaying(true);
    }
  }, [autoplay, captureEmbedUrl]);

  const handlePlay = useCallback(() => {
    captureEmbedUrl(selectedSubtitle);
    setIsPlaying(true);
    setSearchParams({}, { replace: true });
  }, [setSearchParams, selectedSubtitle, captureEmbedUrl]);

  const handleClosePlayer = useCallback(() => {
    setIsPlaying(false);
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  // ── Early returns (all hooks above) ──
  if (isLoading) return <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8"><LoadingState type="detail" /></div>;
  if (error) return <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8"><ErrorState error={error} onRetry={refetch} /></div>;
  if (!movie) return null;

  const embedOptions = { skin: 'netflix' };
  if (selectedSubtitle) { embedOptions.subUrl = selectedSubtitle.url; embedOptions.subLang = selectedSubtitle.lang; embedOptions.subDefault = true; }
  const fallbackEmbedUrl = getMovieEmbedUrl(playId, resumeAt, embedOptions);
  const recommendedItems = recommendations?.items?.slice(0, 12) || [];
  const metadata = { title: movie.title || '', poster_url: movie.poster_url || '', type: 'movie' };

  return (
    <div className="pt-16">
      <PlayerBox
        item={movie} isPlaying={isPlaying} onPlay={handlePlay} onClose={handleClosePlayer}
        embedUrl={snapshotEmbedUrl || fallbackEmbedUrl} contentId={playId} metadata={metadata}
      />

      {!isPlaying && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#666] font-medium uppercase tracking-wider">Subtitles</span>
            {availableSubtitles.length > 0 ? (
              <SubtitlePicker subtitles={availableSubtitles} selected={selectedSubtitle} onSelect={setSelectedSubtitle} disabled={isPlaying} />
            ) : (
              <span className="text-[10px] text-[#555]">Belum ada subtitle</span>
            )}
            {selectedSubtitle && <span className="text-[10px] text-green-400/70 bg-green-400/5 px-1.5 py-0.5 rounded">Auto-loaded</span>}
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
        item={movie ? { id: movie.id, title: movie.title, type: 'movie', imdb_id: movie.imdb_id } : null}
        onDownloaded={(sub) => {
          // Refresh subtitle list
          if (movie) {
            const currentLang = getCurrentLanguage();
            api.getSubtitles({ type: 'movie', tmdbId: movie.id, lang: currentLang, imdbId: movie.imdb_id }).then((data) => {
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
        <div className="mt-8"><DetailHero item={movie} type="movie" /></div>
        {recommendedItems.length > 0 && (
          <div className="mt-10">
            <ContentRail title={t('common.moreLikeThis')} items={recommendedItems} type="movie" />
          </div>
        )}
      </div>
    </div>
  );
}
