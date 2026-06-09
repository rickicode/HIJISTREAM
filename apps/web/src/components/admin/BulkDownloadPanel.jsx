import { useState, useCallback } from 'react';
import { Search, Download, Loader, CheckCircle, XCircle, Film, Tv, Globe, Zap, Package } from 'lucide-react';
import api from '../../utils/api';

const LANGS = [
  { code: 'id', label: 'ID', full: 'Indonesian', flag: '🇮🇩' },
  { code: 'en', label: 'EN', full: 'English', flag: '🇺🇸' },
  { code: 'ja', label: 'JA', full: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', label: 'KO', full: 'Korean', flag: '🇰🇷' },
  { code: 'es', label: 'ES', full: 'Spanish', flag: '🇪🇸' },
  { code: 'pt', label: 'PT', full: 'Portuguese', flag: '🇧🇷' },
  { code: 'hi', label: 'HI', full: 'Hindi', flag: '🇮🇳' },
];

export default function BulkDownloadPanel() {
  // ── Search ──
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null);

  // ── Config ──
  const [langs, setLangs] = useState(['id', 'en']);
  const [seasonFilter, setSeasonFilter] = useState(''); // comma-separated season numbers
  const [useBulk, setUseBulk] = useState(true); // try ZIP packages

  // ── Progress ──
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [result, setResult] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setResults([]);
    setSelected(null);
    setResult(null);
    try {
      const data = await api.search(query.trim());
      setResults(data.items || []);
    } catch (err) { console.error(err); }
    finally { setSearching(false); }
  };

  const handleBulkDownload = useCallback(async () => {
    if (!selected) return;
    setDownloading(true);
    setResult(null);
    setProgress({ phase: 'starting', current: 0, total: 0, message: 'Memulai...' });

    try {
      // Polling progress via a simple interval (backend processes synchronously)
      const progressPromise = new Promise((resolve) => {
        let ticks = 0;
        const interval = setInterval(() => {
          ticks++;
          setProgress(prev => ({
            ...prev,
            message: prev?.phase === 'starting' ? 'Menghubungi provider...' : prev?.message,
          }));
          if (ticks > 300) { clearInterval(interval); resolve(); } // 5 min timeout
        }, 1000);
        // Resolve when download completes
        setTimeout(() => clearInterval(interval), 600000);
      });

      const seasonFilterArr = seasonFilter
        ? seasonFilter.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n))
        : null;

      const data = await api.bulkDownloadSubtitles({
        type: selected.type,
        tmdbId: selected.id,
        languages: langs,
        seasonFilter: seasonFilterArr,
        imdbId: selected.imdb_id || undefined,
        title: selected.title,
      });

      setResult(data);
      setProgress(null);
    } catch (err) {
      setResult({ error: err.message });
      setProgress(null);
    } finally {
      setDownloading(false);
    }
  }, [selected, langs, seasonFilter]);

  const toggleLang = (code) => setLangs(prev => prev.includes(code) ? prev.filter(x => x !== code) : [...prev, code]);

  const inputClass = 'px-3 py-2 bg-[#141414] border border-[#333] rounded text-white text-sm placeholder-[#555] focus:outline-none focus:border-[#E50914] transition-colors';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-base font-semibold text-white mb-0.5 flex items-center gap-2">
          <Zap size={16} className="text-[#E50914]" /> Bulk Download
        </h2>
        <p className="text-xs text-[#666]">
          Download semua subtitle sekaligus. Untuk TV series, otomatis extract ZIP package jika tersedia.
        </p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari judul film / serial..." className={`${inputClass} w-full pl-9`} />
        </div>
        <button type="submit" disabled={searching || !query.trim()} className="flex items-center gap-1.5 px-4 py-2 bg-[#E50914] text-white text-sm font-semibold rounded hover:bg-[#f6121d] disabled:opacity-40 transition-colors">
          {searching ? <Loader size={14} className="animate-spin" /> : <Search size={14} />} Cari
        </button>
      </form>

      {/* Search results */}
      {results.length > 0 && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg overflow-hidden max-h-64 overflow-y-auto">
          {results.map(item => (
            <button key={`${item.type}-${item.id}`} onClick={() => { setSelected(item); setResult(null); setSeasonFilter(''); }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#252525] transition-colors border-b border-[#2a2a2a] last:border-0 ${selected?.id === item.id ? 'bg-[#252525] border-l-2 border-l-[#E50914]' : ''}`}>
              {item.poster_url
                ? <img src={item.poster_url} alt="" className="w-8 h-12 object-cover rounded shrink-0" />
                : <div className="w-8 h-12 bg-[#2a2a2a] rounded shrink-0 flex items-center justify-center">{item.type === 'movie' ? <Film size={12} className="text-[#555]" /> : <Tv size={12} className="text-[#555]" />}</div>
              }
              <div className="min-w-0">
                <p className="text-white text-sm font-medium truncate">{item.title}</p>
                <p className="text-[#808080] text-xs">{item.type === 'movie' ? 'Movie' : 'TV'} {item.year && `· ${item.year}`}</p>
              </div>
              {selected?.id === item.id && <CheckCircle size={14} className="text-[#E50914] ml-auto shrink-0" />}
            </button>
          ))}
        </div>
      )}

      {/* Config */}
      {selected && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 space-y-4">
          {/* Selected info */}
          <div className="flex items-center gap-2">
            {selected.type === 'movie' ? <Film size={14} className="text-[#E50914]" /> : <Tv size={14} className="text-[#E50914]" />}
            <span className="text-white text-sm font-medium">{selected.title}</span>
            <span className="text-[#555] text-xs">TMDB #{selected.id}</span>
          </div>

          {/* Language selection */}
          <div>
            <label className="block text-xs text-[#808080] mb-2 font-medium">Bahasa yang akan diunduh</label>
            <div className="flex flex-wrap gap-2">
              {LANGS.map(l => (
                <button key={l.code} onClick={() => toggleLang(l.code)}
                  className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded-full border transition-all duration-150 ${
                    langs.includes(l.code)
                      ? 'border-[#E50914] text-white bg-[#E50914]/15 shadow-[0_0_6px_rgba(229,9,20,0.1)]'
                      : 'border-[#333] text-[#808080] hover:border-[#555] hover:text-white'
                  }`}>
                  <span>{l.flag}</span>
                  <span className="font-medium">{l.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* TV: Season filter + bulk option */}
          {selected.type === 'tv' && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-[#808080] mb-1">Filter Season (opsional)</label>
                  <input value={seasonFilter} onChange={e => setSeasonFilter(e.target.value)}
                    placeholder="Contoh: 1,2,3 atau kosong = semua"
                    className={`${inputClass} w-full`} />
                </div>
              </div>

              {/* Bulk ZIP option */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={useBulk} onChange={e => setUseBulk(e.target.checked)}
                  className="w-4 h-4 rounded border-[#333] bg-[#141414] text-[#E50914] focus:ring-[#E50914]" />
                <div className="flex items-center gap-1.5">
                  <Package size={13} className="text-[#808080]" />
                  <span className="text-xs text-[#b3b3b3]">Coba ambil ZIP package (lebih cepat)</span>
                </div>
              </label>
            </div>
          )}

          {/* Download button */}
          <button onClick={handleBulkDownload} disabled={downloading || langs.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#E50914] text-white text-sm font-semibold rounded-lg hover:bg-[#f6121d] disabled:opacity-40 transition-colors">
            {downloading ? <Loader size={14} className="animate-spin" /> : <Download size={14} />}
            {downloading ? 'Mengunduh...' : `Bulk Download ${selected.type === 'tv' ? '(TV Series)' : '(Movie)'} — ${langs.length} bahasa`}
          </button>

          {/* Progress */}
          {progress && (
            <div className="bg-[#141414] border border-[#2a2a2a] rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Loader size={14} className="animate-spin text-[#E50914]" />
                <span className="text-xs text-[#b3b3b3]">{progress.message}</span>
              </div>
            </div>
          )}

          {/* Results */}
          {result && !result.error && (
            <div className="space-y-2">
              {/* Summary */}
              <div className="flex items-center gap-4 text-sm">
                <span className="text-green-400 font-medium flex items-center gap-1">
                  <CheckCircle size={14} /> {result.success} berhasil
                </span>
                {result.fail > 0 && (
                  <span className="text-red-400 font-medium flex items-center gap-1">
                    <XCircle size={14} /> {result.fail} gagal
                  </span>
                )}
                {result.skipped > 0 && (
                  <span className="text-[#808080]">{result.skipped} skipped</span>
                )}
              </div>

              {/* Detailed results */}
              <div className="max-h-64 overflow-y-auto bg-[#141414] border border-[#2a2a2a] rounded-lg divide-y divide-[#2a2a2a]">
                {result.results.map((r, i) => (
                  <div key={i} className={`flex items-center gap-2 px-3 py-2 text-xs ${
                    r.success ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {r.success ? <CheckCircle size={11} className="shrink-0" /> : <XCircle size={11} className="shrink-0" />}
                    <span className="font-medium">
                      {r.season !== undefined ? `S${String(r.season).padStart(2, '0')}:E${String(r.episode).padStart(2, '0')}` : (LANGS.find(l => l.code === r.lang)?.full || r.lang)}
                    </span>
                    {r.bulk && <Package size={10} className="text-purple-400 shrink-0" title="From ZIP package" />}
                    {!r.success && <span className="text-[#666] ml-1">{r.message}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {result?.error && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
              <XCircle size={16} />
              <span>{result.error}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
