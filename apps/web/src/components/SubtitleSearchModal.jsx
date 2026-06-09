import { useState, useEffect, useCallback } from 'react';
import { X, Search, Download, Globe, Loader, CheckCircle, XCircle, Film, Tv } from 'lucide-react';
import api from '../utils/api';
import { getCurrentLanguage } from '../utils/language';

const LANG_FLAGS = { id: '🇮🇩', en: '🇺🇸', es: '🇪🇸', pt: '🇧🇷', hi: '🇮🇳', ja: '🇯🇵', ko: '🇰🇷' };
const LANG_LABELS = { id: 'Indonesian', en: 'English', es: 'Spanish', pt: 'Portuguese', hi: 'Hindi', ja: 'Japanese', ko: 'Korean' };
const PROVIDER_LABELS = { opensubtitles_com: 'OS.com', opensubtitles_org: 'OS.org', subdl: 'Subdl' };
const PROVIDER_COLORS = { opensubtitles_com: 'text-yellow-400 bg-yellow-400/10', opensubtitles_org: 'text-blue-400 bg-blue-400/10', subdl: 'text-purple-400 bg-purple-400/10' };

/**
 * SubtitleSearchModal — Search & download subtitles from all providers.
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
  const [selectedLang, setSelectedLang] = useState('');
  const [providers, setProviders] = useState([]); // which providers found results

  const handleSearch = useCallback(async (langFilter) => {
    if (!item) return;
    setSearching(true);
    setError('');
    setResults([]);
    try {
      const params = {
        type: item.type,
        tmdbId: item.id,
        lang: langFilter || '',
        imdbId: item.imdb_id || undefined,
      };
      if (item.type === 'tv') {
        if (season) params.season = season;
        if (episode) params.episode = episode;
      }
      const data = await api.searchSubtitles(params);
      const list = data.results || [];
      setResults(list);
      // Extract unique providers
      const provs = [...new Set(list.map(r => r.provider))];
      setProviders(provs);
      if (list.length === 0) setError('Tidak ditemukan subtitle dari semua provider.');
    } catch (err) {
      setError(err.message || 'Gagal mencari subtitle');
    } finally {
      setSearching(false);
    }
  }, [item, season, episode]);

  useEffect(() => {
    if (!open || !item) return;
    setResults([]);
    setError('');
    setDownloadStatus({});
    setSelectedLang('');
    setProviders([]);
    handleSearch();
  }, [open, item?.id, season, episode, handleSearch]);

  const handleDownload = async (sub) => {
    const key = `${sub.provider}_${sub.fileId}_${sub.lang}`;
    setDownloadingId(key);
    try {
      const result = await api.downloadSubtitle({
        provider: sub.provider,
        fileId: sub.fileId,
        type: item.type,
        tmdbId: item.id,
        lang: sub.lang,
        imdbId: item.imdb_id || undefined,
        title: item.title || undefined,
        season: item.type === 'tv' ? season : undefined,
        episode: item.type === 'tv' ? episode : undefined,
      });
      if (result?.success) {
        setDownloadStatus(prev => ({ ...prev, [key]: 'ok' }));
        if (onDownloaded) onDownloaded(result.subtitle);
      } else {
        setDownloadStatus(prev => ({ ...prev, [key]: 'fail' }));
      }
    } catch (err) {
      setDownloadStatus(prev => ({ ...prev, [key]: 'fail' }));
    } finally {
      setDownloadingId(null);
    }
  };

  if (!open) return null;

  const filtered = selectedLang ? results.filter(r => r.lang === selectedLang) : results;
  const uniqueLangs = [...new Set(results.map(r => r.lang))].sort();
  const isTV = item?.type === 'tv';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col mx-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2a2a]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-[#E50914]/10 flex items-center justify-center shrink-0">
              {isTV ? <Tv size={18} className="text-[#E50914]" /> : <Film size={18} className="text-[#E50914]" />}
            </div>
            <div className="min-w-0">
              <h3 className="text-white font-semibold text-sm truncate">{item?.title || 'Search Subtitles'}</h3>
              <p className="text-[#808080] text-xs">
                TMDB #{item?.id}
                {item?.imdb_id && ` • ${item.imdb_id}`}
                {isTV && season && ` • S${season}${episode ? `:E${episode}` : ''}`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-[#808080] hover:text-white hover:bg-[#333] rounded-lg transition-colors shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* Language filter tabs */}
        {results.length > 0 && (
          <div className="flex items-center gap-1.5 px-5 py-3 border-b border-[#2a2a2a] overflow-x-auto">
            <button
              onClick={() => { setSelectedLang(''); }}
              className={`shrink-0 px-3 py-1 text-xs rounded-full border transition-colors ${
                !selectedLang ? 'border-[#E50914] text-[#E50914] bg-[#E50914]/10' : 'border-[#333] text-[#808080] hover:border-[#555] hover:text-white'
              }`}
            >
              Semua ({results.length})
            </button>
            {uniqueLangs.map(lang => (
              <button
                key={lang}
                onClick={() => setSelectedLang(lang)}
                className={`shrink-0 px-3 py-1 text-xs rounded-full border transition-colors ${
                  selectedLang === lang ? 'border-[#E50914] text-[#E50914] bg-[#E50914]/10' : 'border-[#333] text-[#808080] hover:border-[#555] hover:text-white'
                }`}
              >
                {LANG_FLAGS[lang] || '🌐'} {LANG_LABELS[lang] || lang.toUpperCase()} ({results.filter(r => r.lang === lang).length})
              </button>
            ))}
          </div>
        )}

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {searching && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader size={28} className="animate-spin text-[#E50914] mb-3" />
              <p className="text-[#808080] text-sm">Mencari dari {providers.length || '3'} provider...</p>
              <p className="text-[#555] text-xs mt-1">OpenSubtitles.com • OpenSubtitles.org • Subdl</p>
            </div>
          )}

          {!searching && error && (
            <div className="flex flex-col items-center justify-center py-12">
              <Search size={36} className="text-[#333] mb-3" />
              <p className="text-[#808080] text-sm">{error}</p>
              <button onClick={() => handleSearch(selectedLang)} className="mt-3 text-xs text-[#E50914] hover:underline">
                Coba lagi
              </button>
            </div>
          )}

          {!searching && !error && filtered.length === 0 && results.length > 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <Globe size={36} className="text-[#333] mb-3" />
              <p className="text-[#808080] text-sm">Tidak ada subtitle untuk bahasa ini</p>
            </div>
          )}

          {!searching && filtered.length > 0 && (
            <div className="space-y-1.5">
              {filtered.map((sub, i) => {
                const key = `${sub.provider}_${sub.fileId}_${sub.lang}`;
                const isDownloading = downloadingId === key;
                const status = downloadStatus[key];
                const flag = LANG_FLAGS[sub.lang] || '🌐';
                const langName = LANG_LABELS[sub.lang] || sub.lang.toUpperCase();
                const provColor = PROVIDER_COLORS[sub.provider] || 'text-gray-400 bg-gray-400/10';

                return (
                  <div
                    key={key}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors ${
                      status === 'ok'
                        ? 'border-green-500/30 bg-green-500/5'
                        : status === 'fail'
                        ? 'border-red-500/30 bg-red-500/5'
                        : 'border-[#2a2a2a] hover:border-[#444] hover:bg-[#222]'
                    }`}
                  >
                    {/* Language */}
                    <span className="text-lg w-6 text-center shrink-0">{flag}</span>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-medium truncate">
                          {sub.title || `${langName} subtitle`}
                        </span>
                        {sub.hearingImpaired && (
                          <span className="text-[10px] text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded font-medium shrink-0">
                            HI
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${provColor}`}>
                          {PROVIDER_LABELS[sub.provider] || sub.provider}
                        </span>
                        <span className="text-[#666] text-[10px]">{langName}</span>
                        {sub.downloadCount > 0 && (
                          <span className="text-[#666] text-[10px]">↓ {sub.downloadCount.toLocaleString()}</span>
                        )}
                        {sub.rating > 0 && (
                          <span className="text-[#666] text-[10px]">★ {sub.rating}</span>
                        )}
                        {sub.format && (
                          <span className="text-[#555] text-[10px] uppercase">{sub.format}</span>
                        )}
                      </div>
                    </div>

                    {/* Download button */}
                    <div className="shrink-0">
                      {status === 'ok' ? (
                        <div className="flex items-center gap-1 text-green-400 text-xs font-medium">
                          <CheckCircle size={14} />
                          <span className="hidden sm:inline">Tersimpan</span>
                        </div>
                      ) : status === 'fail' ? (
                        <div className="flex items-center gap-1 text-red-400 text-xs font-medium">
                          <XCircle size={14} />
                          <span className="hidden sm:inline">Gagal</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleDownload(sub)}
                          disabled={isDownloading}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#E50914] rounded-md hover:bg-[#f6121d] disabled:opacity-50 transition-colors"
                        >
                          {isDownloading ? (
                            <Loader size={12} className="animate-spin" />
                          ) : (
                            <Download size={12} />
                          )}
                          <span className="hidden sm:inline">{isDownloading ? '...' : 'Download'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#2a2a2a] flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] text-[#555]">
            {providers.map(p => (
              <span key={p} className={`px-1.5 py-0.5 rounded ${PROVIDER_COLORS[p] || 'text-gray-400 bg-gray-400/10'}`}>
                {PROVIDER_LABELS[p] || p}
              </span>
            ))}
          </div>
          <button
            onClick={() => handleSearch(selectedLang)}
            disabled={searching}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#808080] hover:text-white hover:bg-[#333] rounded-lg transition-colors"
          >
            <Search size={12} />
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
