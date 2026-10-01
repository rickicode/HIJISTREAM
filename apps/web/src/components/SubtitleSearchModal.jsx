import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { X, Search, Globe, Film, RefreshCw, Tv, XCircle } from 'lucide-react';
import api from '../utils/api';
import { LANG_LABELS, PROVIDER_LABELS, PROVIDER_COLORS } from '../utils/subtitle-constants';
import SubtitleResultRow from './SubtitleResultRow';

// Loader copy is derived from the shared registry so the provider count and
// names can never drift from subtitle-constants.js.
const PROVIDER_NAMES = Object.values(PROVIDER_LABELS);

const SKELETON_ROWS = 5;

/**
 * SubtitleSearchModal — search and download subtitles from every provider.
 *
 * Layout note: the language filter is a native select, not a row of pills. With
 * one result per language the pill row measured 1988px inside a 670px panel and
 * forced a horizontal scrollbar; a select cannot overflow at any width and
 * hands the choice to the platform picker on touch devices.
 *
 * @param {boolean} open
 * @param {() => void} onClose
 * @param {{ id: number, title: string, type: 'movie'|'tv', imdb_id?: string, number_of_seasons?: number }} item
 * @param {(sub) => void} onDownloaded - callback when a subtitle is downloaded
 * @param {number} [season]
 * @param {number} [episode]
 */
export default function SubtitleSearchModal({ open, onClose, item, onDownloaded, season, episode }) {
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadStatus, setDownloadStatus] = useState({}); // { [key]: 'ok' | 'fail' }
  const [downloadError, setDownloadError] = useState('');
  const [selectedLang, setSelectedLang] = useState('');
  const [providers, setProviders] = useState([]); // which providers found results
  // One row per provider per search: which ones actually ran, and what they said
  // when they returned nothing. Without this a silent provider failure is
  // indistinguishable from "this title genuinely has no subtitles".
  const [diagnostics, setDiagnostics] = useState([]);
  const panelRef = useRef(null);
  const closeRef = useRef(null);

  // Search parameters are read from primitives, not from the `item` object:
  // callers build that object inline, so a parent re-render produces a new
  // identity and an object dependency would silently re-run the search and wipe
  // the per-row download state.
  const itemId = item?.id ?? null;
  const isTV = item?.type === 'tv';
  const title = item?.title ?? '';
  const imdbId = item?.imdb_id ?? '';
  const year = item?.year ?? '';

  const handleSearch = useCallback(async (langFilter) => {
    if (!itemId) return;
    setSearching(true);
    setError('');
    setDownloadError('');
    setResults([]);
    try {
      const params = {
        type: isTV ? 'tv' : 'movie',
        tmdbId: itemId,
        lang: langFilter || '',
        imdbId: imdbId || undefined,
        title: title || undefined,
        year: year || undefined,
      };
      if (isTV) {
        if (season) params.season = season;
        if (episode) params.episode = episode;
      }
      const data = await api.searchSubtitles(params);
      const list = data.results || [];
      setResults(list);
      setDiagnostics(data.diagnostics || []);
      // Extract unique providers
      const provs = [...new Set(list.map(r => r.provider))];
      setProviders(provs);
    } catch (err) {
      setError(err.message || 'Gagal mencari subtitle');
    } finally {
      setSearching(false);
    }
  }, [itemId, title, isTV, imdbId, year, season, episode]);

  useEffect(() => {
    if (!open || !itemId) return;
    setError('');
    setDownloadError('');
    setDownloadStatus({});
    setSelectedLang('');
    setProviders([]);
    setDiagnostics([]);
    handleSearch();
  }, [open, itemId, season, episode, handleSearch]);

  // Escape closes, Tab stays inside, and focus returns to whatever opened the
  // dialog once it is gone. Keyed on `open` alone: callers pass an inline
  // onClose, so including it would re-run this on every parent render, refocus
  // the dialog, and lose the element that opened it.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement;
    closeRef.current?.focus();
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const focusables = panelRef.current?.querySelectorAll(
        'button:not([disabled]), select, [href], input, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables?.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, [open]);

  const handleDownload = async (sub) => {
    const key = `${sub.provider}_${sub.fileId}_${sub.lang}`;
    setDownloadingId(key);
    try {
      const result = await api.downloadSubtitle({
        provider: sub.provider,
        fileId: sub.fileId,
        type: isTV ? 'tv' : 'movie',
        tmdbId: itemId,
        lang: sub.lang,
        imdbId: imdbId || undefined,
        title: title || undefined,
        season: isTV ? season : undefined,
        episode: isTV ? episode : undefined,
      });
      if (result?.success) {
        setDownloadError('');
        setDownloadStatus(prev => ({ ...prev, [key]: 'ok' }));
        if (onDownloaded) onDownloaded(result.subtitle);
      } else {
        setDownloadError(`Gagal mengunduh dari ${PROVIDER_LABELS[sub.provider] || sub.provider}.`);
        setDownloadStatus(prev => ({ ...prev, [key]: 'fail' }));
      }
    } catch (err) {
      // api.downloadSubtitle rethrows the server's {error} — e.g. the
      // OpenSubtitles.com free-tier quota notice. Show it, don't swallow it.
      setDownloadError(err.message || 'Gagal mengunduh subtitle');
      setDownloadStatus(prev => ({ ...prev, [key]: 'fail' }));
    } finally {
      setDownloadingId(null);
    }
  };

  // Languages ordered by how much they offer, so the common choice sits first
  // in the picker instead of wherever the provider happened to sort it.
  const languages = useMemo(() => {
    const counts = new Map();
    for (const r of results) counts.set(r.lang, (counts.get(r.lang) || 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [results]);

  if (!open) return null;

  const filtered = selectedLang ? results.filter(r => r.lang === selectedLang) : results;
  // Providers that refused the request or never ran. `skipped` is only worth
  // showing when it is not the boring "not configured" case.
  const failed = diagnostics.filter(d => d.status === 'error' || (d.status === 'skipped' && d.message !== 'belum dikonfigurasi'));
  const showEmpty = !searching && !error && results.length === 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm sm:p-4"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="subtitle-modal-title"
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-[#2a2a2a] px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#E50914]/10">
              {isTV
                ? <Tv size={18} className="text-[#E50914]" aria-hidden="true" />
                : <Film size={18} className="text-[#E50914]" aria-hidden="true" />}
            </div>
            <div className="min-w-0">
              <h2 id="subtitle-modal-title" className="truncate text-sm font-semibold text-white">
                {item?.title || 'Cari Subtitle'}
              </h2>
              <p className="truncate text-xs text-[#a3a3a3]">
                TMDB #{item?.id}
                {item?.imdb_id && ` • ${item.imdb_id}`}
                {isTV && season && ` • S${season}${episode ? `:E${episode}` : ''}`}
              </p>
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[#a3a3a3] transition-colors hover:bg-[#333] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:h-9 sm:w-9"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Language filter: one native control instead of a pill row that
            overflowed the panel and forced a horizontal scrollbar. */}
        {(searching || results.length > 0) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-[#2a2a2a] px-4 py-3 sm:px-5">
            <label htmlFor="subtitle-lang" className="text-xs font-medium text-[#a3a3a3]">Bahasa</label>
            <select
              id="subtitle-lang"
              value={selectedLang}
              onChange={e => setSelectedLang(e.target.value)}
              disabled={searching || results.length === 0}
              className="h-11 w-full rounded-lg border border-[#333] bg-[#212121] px-3 text-sm text-white transition-colors hover:border-[#444] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-50 sm:h-9 sm:w-auto sm:min-w-56"
            >
              <option value="">Semua bahasa ({results.length})</option>
              {languages.map(([lang, count]) => (
                <option key={lang} value={lang}>
                  {LANG_LABELS[lang] || lang.toUpperCase()} ({count})
                </option>
              ))}
            </select>
            {!searching && results.length > 0 && (
              <span className="text-xs text-[#a3a3a3]">
                {filtered.length} dari {results.length} subtitle
              </span>
            )}
          </div>
        )}

        {/* Results */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 sm:px-5">
          {searching && (
            <div aria-busy="true" aria-label="Mencari subtitle">
              <p className="mb-2 text-xs text-[#a3a3a3]">
                Mencari di {PROVIDER_NAMES.length} provider: {PROVIDER_NAMES.join(', ')}
              </p>
              <ul className="space-y-1.5">
                {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                  <li key={i} className="flex items-center gap-3 rounded-lg border border-[#2a2a2a] px-3 py-2.5">
                    <div className="h-6 w-6 shrink-0 animate-pulse rounded bg-[#2a2a2a]" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="h-3.5 w-2/3 animate-pulse rounded bg-[#2a2a2a]" />
                      <div className="h-3 w-1/3 animate-pulse rounded bg-[#2a2a2a]" />
                    </div>
                    <div className="h-9 w-11 shrink-0 animate-pulse rounded-md bg-[#2a2a2a] sm:w-20" />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!searching && error && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <XCircle size={32} className="mb-3 text-[#4d4d4d]" aria-hidden="true" />
              <p className="text-sm text-[#a3a3a3]">{error}</p>
              <button
                type="button"
                onClick={() => handleSearch(selectedLang)}
                className="mt-4 inline-flex h-11 items-center gap-2 rounded-lg border border-[#333] px-4 text-xs font-medium text-white transition-colors hover:border-[#555] hover:bg-[#212121] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <RefreshCw size={14} aria-hidden="true" />
                Coba lagi
              </button>
            </div>
          )}

          {showEmpty && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Globe size={32} className="mb-3 text-[#4d4d4d]" aria-hidden="true" />
              <p className="text-sm text-[#a3a3a3]">Tidak ada subtitle dari provider yang aktif.</p>
              <button
                type="button"
                onClick={() => handleSearch(selectedLang)}
                className="mt-4 inline-flex h-11 items-center gap-2 rounded-lg border border-[#333] px-4 text-xs font-medium text-white transition-colors hover:border-[#555] hover:bg-[#212121] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <RefreshCw size={14} aria-hidden="true" />
                Cari ulang
              </button>
            </div>
          )}

          {!searching && !error && results.length > 0 && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Globe size={32} className="mb-3 text-[#4d4d4d]" aria-hidden="true" />
              <p className="text-sm text-[#a3a3a3]">Tidak ada subtitle untuk bahasa ini.</p>
              <button
                type="button"
                onClick={() => setSelectedLang('')}
                className="mt-4 inline-flex h-11 items-center rounded-lg border border-[#333] px-4 text-xs font-medium text-white transition-colors hover:border-[#555] hover:bg-[#212121] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Tampilkan semua bahasa
              </button>
            </div>
          )}

          {!searching && failed.length > 0 && (
            <div className="mb-3 space-y-1 rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-3 py-2">
              <p className="text-[10px] font-medium uppercase tracking-wide text-yellow-500/80">Provider bermasalah</p>
              {failed.map(d => (
                <p key={d.provider} className="text-[11px] text-yellow-500/90">
                  <span className="font-medium">{PROVIDER_LABELS[d.provider] || d.provider}</span>
                  {': '}{d.message || (d.status === 'skipped' ? 'dilewati' : 'gagal')}
                </p>
              ))}
            </div>
          )}

          {downloadError && (
            <div className="mb-2 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
              <XCircle size={14} className="mt-0.5 shrink-0 text-red-400" aria-hidden="true" />
              <span className="flex-1 text-xs text-red-300">{downloadError}</span>
            </div>
          )}

          {!searching && filtered.length > 0 && (
            <ul className="space-y-1.5">
              {filtered.map((sub) => {
                const key = `${sub.provider}_${sub.fileId}_${sub.lang}`;
                const state = downloadingId === key ? 'downloading' : (downloadStatus[key] || 'idle');
                return <SubtitleResultRow key={key} sub={sub} state={state} onDownload={handleDownload} />;
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-[#2a2a2a] px-4 py-3 sm:px-5">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-[10px] text-[#a3a3a3]">
            <span className="shrink-0">Hasil dari</span>
            {providers.length === 0
              ? <span className="shrink-0">belum ada</span>
              : providers.map(p => (
                <span key={p} className={`rounded px-1.5 py-0.5 ${PROVIDER_COLORS[p] || 'text-gray-400 bg-gray-400/10'}`}>
                  {PROVIDER_LABELS[p] || p}
                </span>
              ))}
          </div>
          <button
            type="button"
            onClick={() => handleSearch(selectedLang)}
            disabled={searching}
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-xs text-[#a3a3a3] transition-colors hover:bg-[#333] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-50 sm:h-9"
          >
            <Search size={14} aria-hidden="true" />
            Cari ulang
          </button>
        </div>
      </div>
    </div>
  );
}