import { useState, useMemo } from 'react';
import { Search, Download, CheckCircle, XCircle, Loader, Film, Tv, Globe, Eye, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import api from '../../utils/api';

const LANGS = ['id', 'en', 'ja', 'ko', 'es', 'pt', 'hi'];
const LANG_LABELS = { id: 'ID', en: 'EN', ja: 'JA', ko: 'KO', es: 'ES', pt: 'PT', hi: 'HI' };
const LANG_FULL = { id: 'Indonesian', en: 'English', ja: 'Japanese', ko: 'Korean', es: 'Spanish', pt: 'Portuguese', hi: 'Hindi' };
const PROVIDER_LABELS = { opensubtitles_com: 'OS.com', opensubtitles_org: 'OS.org', subdl: 'Subdl' };
const PROVIDER_COLORS = { opensubtitles_com: 'text-yellow-400 bg-yellow-400/10', opensubtitles_org: 'text-blue-400 bg-blue-400/10', subdl: 'text-purple-400 bg-purple-400/10' };

export default function DownloadTab() {
  // ── TMDB Search ──
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null);

  // ── Provider Search ──
  const [providerResults, setProviderResults] = useState([]);
  const [searchingProviders, setSearchingProviders] = useState(false);
  const [providerFilter, setProviderFilter] = useState('all');
  const [langFilter, setLangFilter] = useState('all');

  // ── Download Config ──
  const [langs, setLangs] = useState(['id', 'en']);
  const [season, setSeason] = useState('');
  const [episode, setEpisode] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [dlResults, setDlResults] = useState(null);

  // ── Preview ──
  const [previewSub, setPreviewSub] = useState(null);

  // ── Multi Season/Episode ──
  const [bulkSeasons, setBulkSeasons] = useState(false);
  const [seasonRange, setSeasonRange] = useState({ from: '', to: '' });
  const [episodeRange, setEpisodeRange] = useState({ from: '', to: '' });

  // TMDB search
  const handleTmdbSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setResults([]);
    setSelected(null);
    setProviderResults([]);
    setDlResults(null);
    try {
      const data = await api.search(query.trim());
      setResults(data.items || []);
    } catch (err) { console.error(err); }
    finally { setSearching(false); }
  };

  // Provider search — search all 3 providers for available subtitles
  const handleProviderSearch = async () => {
    if (!selected) return;
    setSearchingProviders(true);
    setProviderResults([]);
    setDlResults(null);
    try {
      const params = {
        type: selected.type,
        tmdbId: selected.id,
        imdbId: selected.imdb_id || undefined,
      };
      if (selected.type === 'tv' && season) {
        params.season = Number(season);
        if (episode) params.episode = Number(episode);
      }
      const data = await api.searchSubtitles(params);
      setProviderResults(data.results || []);
    } catch (err) {
      console.error(err);
    } finally {
      setSearchingProviders(false);
    }
  };

  // Download from cascade (auto)
  const handleAutoDownload = async () => {
    if (!selected) return;
    setDownloading(true);
    setDlResults(null);
    try {
      const params = {
        type: selected.type,
        tmdbId: selected.id,
        lang: langs.join(','),
        imdbId: selected.imdb_id || undefined,
        title: selected.title,
      };
      if (selected.type === 'tv') {
        if (season) params.season = Number(season);
        if (episode) params.episode = Number(episode);
      }
      const data = await api.downloadAdminSubtitle(params);
      setDlResults(data.results || []);
    } catch (err) {
      setDlResults([{ lang: 'error', success: false, url: null, message: err.message }]);
    } finally {
      setDownloading(false);
    }
  };

  // Download specific subtitle from provider
  const handleProviderDownload = async (sub) => {
    const key = `${sub.provider}_${sub.fileId}_${sub.lang}`;
    setDownloading(true);
    try {
      const result = await api.downloadSubtitle({
        provider: sub.provider,
        fileId: sub.fileId,
        type: selected.type,
        tmdbId: selected.id,
        lang: sub.lang,
        imdbId: selected.imdb_id || undefined,
        title: selected.title || undefined,
        season: selected.type === 'tv' && season ? Number(season) : undefined,
        episode: selected.type === 'tv' && episode ? Number(episode) : undefined,
      });
      setDlResults(prev => [...(prev || []), {
        lang: sub.lang, success: result?.success, url: result?.subtitle?.url,
        message: result?.success ? `Downloaded from ${PROVIDER_LABELS[sub.provider]}` : 'Failed',
      }]);
    } catch (err) {
      setDlResults(prev => [...(prev || []), { lang: sub.lang, success: false, url: null, message: err.message }]);
    } finally {
      setDownloading(false);
    }
  };

  // Bulk download all episodes in range
  const handleBulkDownload = async () => {
    if (!selected || selected.type !== 'tv') return;
    const fromS = Number(seasonRange.from || season || 1);
    const toS = Number(seasonRange.to || season || fromS);
    const fromE = Number(episodeRange.from || 1);
    const toE = Number(episodeRange.to || episode || fromE);
    setDownloading(true);
    setDlResults(null);
    const allResults = [];
    for (let s = fromS; s <= toS; s++) {
      for (let e = fromE; e <= toE; e++) {
        try {
          const params = {
            type: 'tv',
            tmdbId: selected.id,
            lang: langs.join(','),
            imdbId: selected.imdb_id || undefined,
            title: selected.title,
            season: s,
            episode: e,
          };
          const data = await api.downloadAdminSubtitle(params);
          const eps = data.results || [];
          for (const r of eps) {
            allResults.push({ ...r, season: s, episode: e });
          }
        } catch (err) {
          allResults.push({ lang: 'error', success: false, season: s, episode: e, message: err.message });
        }
      }
    }
    setDlResults(allResults);
    setDownloading(false);
  };

  const toggleLang = (l) => setLangs(prev => prev.includes(l) ? prev.filter(x => x !== l) : [...prev, l]);

  // Filtered provider results
  const filteredProviderResults = useMemo(() => {
    let items = providerResults;
    if (providerFilter !== 'all') items = items.filter(r => r.provider === providerFilter);
    if (langFilter !== 'all') items = items.filter(r => r.lang === langFilter);
    return items;
  }, [providerResults, providerFilter, langFilter]);

  // Unique languages in provider results
  const providerLangs = useMemo(() => [...new Set(providerResults.map(r => r.lang))].sort(), [providerResults]);
  const providerNames = useMemo(() => [...new Set(providerResults.map(r => r.provider))], [providerResults]);

  const inputClass = 'px-3 py-2 bg-[#141414] border border-[#333] rounded text-white text-sm placeholder-[#555] focus:outline-none focus:border-[#E50914] transition-colors';

  return (
    <div className="space-y-5">
      {/* ── Section 1: TMDB Search ── */}
      <div>
        <h2 className="text-base font-semibold text-white mb-0.5">Search & Download Subtitle</h2>
        <p className="text-xs text-[#666]">Cari konten via TMDB, lalu browse subtitle dari semua provider atau download otomatis.</p>
      </div>

      <form onSubmit={handleTmdbSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari judul film / serial / TMDB ID / IMDB ID..." className={`${inputClass} w-full pl-9`} />
        </div>
        <button type="submit" disabled={searching || !query.trim()} className="flex items-center gap-1.5 px-4 py-2 bg-[#E50914] text-white text-sm font-semibold rounded hover:bg-[#f6121d] disabled:opacity-40 transition-colors">
          {searching ? <Loader size={14} className="animate-spin" /> : <Search size={14} />} Cari
        </button>
      </form>

      {/* Search results */}
      {results.length > 0 && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg overflow-hidden max-h-64 overflow-y-auto">
          {results.map(item => (
            <button key={`${item.type}-${item.id}`} onClick={() => { setSelected(item); setDlResults(null); setProviderResults([]); setSeason(''); setEpisode(''); }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#252525] transition-colors border-b border-[#2a2a2a] last:border-0 ${selected?.id === item.id ? 'bg-[#252525] border-l-2 border-l-[#E50914]' : ''}`}>
              {item.poster_url
                ? <img src={item.poster_url} alt="" className="w-8 h-12 object-cover rounded shrink-0" />
                : <div className="w-8 h-12 bg-[#2a2a2a] rounded shrink-0 flex items-center justify-center">{item.type === 'movie' ? <Film size={12} className="text-[#555]" /> : <Tv size={12} className="text-[#555]" />}</div>
              }
              <div className="min-w-0">
                <p className="text-white text-sm font-medium truncate">{item.title}</p>
                <p className="text-[#808080] text-xs">{item.type === 'movie' ? 'Movie' : 'TV'} {item.year && `· ${item.year}`} · TMDB #{item.id}{item.imdb_id && ` · ${item.imdb_id}`}</p>
              </div>
              {selected?.id === item.id && <CheckCircle size={14} className="text-[#E50914] ml-auto shrink-0" />}
            </button>
          ))}
        </div>
      )}

      {/* ── Section 2: Selected Content + Download Config ── */}
      {selected && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {selected.type === 'movie' ? <Film size={14} className="text-[#E50914]" /> : <Tv size={14} className="text-[#E50914]" />}
              <span className="text-white text-sm font-medium">{selected.title}</span>
              <span className="text-[#555] text-xs">TMDB #{selected.id}</span>
              {selected.imdb_id && <span className="text-[#555] text-xs">{selected.imdb_id}</span>}
            </div>
          </div>

          {/* TV: Season/Episode config */}
          {selected.type === 'tv' && (
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-[#808080] mb-1">Season</label>
                  <input type="number" min="1" value={season} onChange={e => setSeason(e.target.value)} placeholder="1" className={`${inputClass} w-full`} />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-[#808080] mb-1">Episode (kosong = semua)</label>
                  <input type="number" min="1" value={episode} onChange={e => setEpisode(e.target.value)} placeholder="opsional" className={`${inputClass} w-full`} />
                </div>
              </div>

              {/* Bulk download toggle */}
              <div className="flex items-center gap-2">
                <button onClick={() => setBulkSeasons(!bulkSeasons)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border transition-colors ${bulkSeasons ? 'border-[#E50914] text-[#E50914] bg-[#E50914]/10' : 'border-[#333] text-[#808080] hover:border-[#555]'}`}>
                  {bulkSeasons ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  Bulk Episode Range
                </button>
              </div>

              {bulkSeasons && (
                <div className="flex gap-3 p-3 bg-[#141414] rounded border border-[#2a2a2a]">
                  <div className="flex-1">
                    <label className="block text-[10px] text-[#666] mb-1">Season Range</label>
                    <div className="flex gap-2 items-center">
                      <input type="number" min="1" value={seasonRange.from} onChange={e => setSeasonRange(p => ({ ...p, from: e.target.value }))} placeholder="From" className={`${inputClass} w-full text-xs`} />
                      <span className="text-[#555]">→</span>
                      <input type="number" min="1" value={seasonRange.to} onChange={e => setSeasonRange(p => ({ ...p, to: e.target.value }))} placeholder="To" className={`${inputClass} w-full text-xs`} />
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] text-[#666] mb-1">Episode Range</label>
                    <div className="flex gap-2 items-center">
                      <input type="number" min="1" value={episodeRange.from} onChange={e => setEpisodeRange(p => ({ ...p, from: e.target.value }))} placeholder="From" className={`${inputClass} w-full text-xs`} />
                      <span className="text-[#555]">→</span>
                      <input type="number" min="1" value={episodeRange.to} onChange={e => setEpisodeRange(p => ({ ...p, to: e.target.value }))} placeholder="To" className={`${inputClass} w-full text-xs`} />
                    </div>
                  </div>
                  <div className="flex items-end">
                    <button onClick={handleBulkDownload} disabled={downloading || !seasonRange.from || !episodeRange.from}
                      className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 text-white text-xs font-semibold rounded hover:bg-amber-600 disabled:opacity-40 transition-colors whitespace-nowrap">
                      {downloading ? <Loader size={12} className="animate-spin" /> : <Download size={12} />}
                      Bulk Download
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Language selection */}
          <div>
            <label className="block text-xs text-[#808080] mb-2">Bahasa</label>
            <div className="flex flex-wrap gap-2">
              {LANGS.map(l => (
                <button key={l} onClick={() => toggleLang(l)}
                  className={`px-2.5 py-1 text-xs rounded border transition-colors ${langs.includes(l) ? 'border-[#E50914] text-[#E50914] bg-[#E50914]/10' : 'border-[#333] text-[#808080] hover:border-[#555]'}`}>
                  {LANG_LABELS[l]}
                </button>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button onClick={handleAutoDownload} disabled={downloading || langs.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-[#E50914] text-white text-sm font-semibold rounded hover:bg-[#f6121d] disabled:opacity-40 transition-colors">
              {downloading ? <Loader size={14} className="animate-spin" /> : <Download size={14} />}
              Auto Download ({langs.length} lang)
            </button>
            <button onClick={handleProviderSearch} disabled={searchingProviders}
              className="flex items-center gap-2 px-4 py-2 border border-[#444] text-[#ccc] text-sm font-medium rounded hover:border-[#666] hover:text-white disabled:opacity-40 transition-colors">
              {searchingProviders ? <Loader size={14} className="animate-spin" /> : <Globe size={14} />}
              Browse Providers
            </button>
          </div>

          {/* Download results */}
          {dlResults && dlResults.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-[#808080] px-3 py-1.5">
                <Film size={12} className="text-[#E50914]" />
                <span className="font-medium text-white">{selected.title}</span>
                <span>• TMDB #{selected.id}</span>
              </div>
              {dlResults.map((r, i) => (
                <div key={i} className={`flex items-center gap-2 text-xs px-3 py-2 rounded border ${r.success ? 'text-green-400 bg-green-400/10 border-green-400/20' : 'text-red-400 bg-red-400/10 border-red-400/20'}`}>
                  {r.success ? <CheckCircle size={12} className="shrink-0" /> : <XCircle size={12} className="shrink-0" />}
                  <span className="font-medium">{(LANG_FULL[r.lang] || r.lang || '').toUpperCase()}</span>
                  {r.season && <span className="text-[#666]">S{r.season}:E{r.episode}</span>}
                  <span className="flex-1">{r.success ? `✓ Tersimpan` : (r.message || 'Tidak ditemukan')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Section 3: Provider Browse Results ── */}
      {providerResults.length > 0 && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[#2a2a2a] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe size={14} className="text-[#E50914]" />
              <span className="text-sm font-medium text-white">Provider Results</span>
              <span className="text-xs text-[#808080]">({providerResults.length} subtitle ditemukan)</span>
            </div>
            <button onClick={() => setProviderResults([])} className="text-xs text-[#666] hover:text-white">Tutup</button>
          </div>

          {/* Provider & Language filters */}
          <div className="flex items-center gap-3 px-4 py-2 border-b border-[#2a2a2a] bg-[#141414]">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-[#666] uppercase">Provider:</span>
              <button onClick={() => setProviderFilter('all')}
                className={`px-2 py-0.5 text-[10px] rounded transition-colors ${providerFilter === 'all' ? 'bg-[#E50914] text-white' : 'text-[#808080] hover:text-white'}`}>
                All
              </button>
              {providerNames.map(p => (
                <button key={p} onClick={() => setProviderFilter(p)}
                  className={`px-2 py-0.5 text-[10px] rounded transition-colors ${providerFilter === p ? 'bg-[#E50914] text-white' : 'text-[#808080] hover:text-white'}`}>
                  {PROVIDER_LABELS[p] || p}
                </button>
              ))}
            </div>
            <div className="w-px h-4 bg-[#333]" />
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-[#666] uppercase">Lang:</span>
              <button onClick={() => setLangFilter('all')}
                className={`px-2 py-0.5 text-[10px] rounded transition-colors ${langFilter === 'all' ? 'bg-[#E50914] text-white' : 'text-[#808080] hover:text-white'}`}>
                All
              </button>
              {providerLangs.map(l => (
                <button key={l} onClick={() => setLangFilter(l)}
                  className={`px-2 py-0.5 text-[10px] rounded transition-colors ${langFilter === l ? 'bg-[#E50914] text-white' : 'text-[#808080] hover:text-white'}`}>
                  {LANG_LABELS[l] || l}
                </button>
              ))}
            </div>
          </div>

          {/* Results list */}
          <div className="max-h-96 overflow-y-auto">
            {filteredProviderResults.map((sub, i) => {
              const key = `${sub.provider}_${sub.fileId}_${sub.lang}`;
              const provColor = PROVIDER_COLORS[sub.provider] || 'text-gray-400 bg-gray-400/10';
              const flag = { id: '🇮🇩', en: '🇺🇸', es: '🇪🇸', pt: '🇧🇷', hi: '🇮🇳', ja: '🇯🇵', ko: '🇰🇷' }[sub.lang] || '🌐';

              return (
                <div key={key} className="flex items-center gap-3 px-4 py-3 border-b border-[#2a2a2a] last:border-0 hover:bg-[#222] transition-colors">
                  <span className="text-base w-6 text-center shrink-0">{flag}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm font-medium truncate">{sub.title || `${LANG_FULL[sub.lang] || sub.lang} subtitle`}</span>
                      {sub.hearingImpaired && <span className="text-[9px] text-yellow-400 bg-yellow-400/10 px-1 rounded">HI</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${provColor}`}>{PROVIDER_LABELS[sub.provider]}</span>
                      <span className="text-[#666] text-[10px]">{sub.format?.toUpperCase()}</span>
                      {sub.downloadCount > 0 && <span className="text-[#666] text-[10px]">↓ {sub.downloadCount.toLocaleString()}</span>}
                      {sub.rating > 0 && <span className="text-[#666] text-[10px]">★ {sub.rating}</span>}
                      {sub.size > 0 && <span className="text-[#666] text-[10px]">{(sub.size / 1024).toFixed(1)}KB</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => handleProviderDownload(sub)} disabled={downloading}
                      className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium text-white bg-[#E50914] rounded hover:bg-[#f6121d] disabled:opacity-40 transition-colors">
                      <Download size={10} /> Download
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
