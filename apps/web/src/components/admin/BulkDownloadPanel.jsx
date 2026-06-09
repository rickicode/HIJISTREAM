import { useState, useCallback } from 'react';
import { Search, Download, Loader, CheckCircle, XCircle, Film, Tv, Globe, Zap, Package, Trash2 } from 'lucide-react';
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

  // ── Selected items ──
  const [selectedItems, setSelectedItems] = useState([]); // array of items

  // ── Config ──
  const [langs, setLangs] = useState(['id', 'en']);

  // ── Progress ──
  const [downloading, setDownloading] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [currentProgress, setCurrentProgress] = useState(null);
  const [results_log, setResultsLog] = useState([]); // array of { item, result }

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setResults([]);
    try {
      const data = await api.search(query.trim());
      setResults(data.items || []);
    } catch (err) { console.error(err); }
    finally { setSearching(false); }
  };

  const toggleSelect = (item) => {
    setSelectedItems(prev => {
      const exists = prev.find(i => i.id === item.id && i.type === item.type);
      if (exists) return prev.filter(i => !(i.id === item.id && i.type === item.type));
      return [...prev, item];
    });
  };

  const selectAll = () => {
    setSelectedItems(prev => {
      const existing = new Set(prev.map(i => `${i.type}-${i.id}`));
      const newItems = results.filter(r => !existing.has(`${r.type}-${r.id}`));
      return [...prev, ...newItems];
    });
  };

  const clearSelection = () => setSelectedItems([]);

  const removeSelected = (item) => {
    setSelectedItems(prev => prev.filter(i => !(i.id === item.id && i.type === item.type)));
  };

  const handleBulkDownload = useCallback(async () => {
    if (selectedItems.length === 0) return;
    setDownloading(true);
    setResultsLog([]);
    setCurrentProgress(null);

    for (let i = 0; i < selectedItems.length; i++) {
      const item = selectedItems[i];
      setCurrentItem(item);
      setCurrentProgress({ phase: 'starting', current: 0, total: 0, message: `${item.title}...` });

      try {
        const data = await api.bulkDownloadSubtitles({
          type: item.type,
          tmdbId: item.id,
          languages: langs,
          imdbId: item.imdb_id || undefined,
          title: item.title,
        });
        setResultsLog(prev => [...prev, { item, result: data }]);
      } catch (err) {
        setResultsLog(prev => [...prev, { item, result: { error: err.message, success: 0, fail: 0, results: [] } }]);
      }
    }

    setCurrentItem(null);
    setCurrentProgress(null);
    setDownloading(false);
  }, [selectedItems, langs]);

  const toggleLang = (code) => setLangs(prev => prev.includes(code) ? prev.filter(x => x !== code) : [...prev, code]);

  const totalSuccess = results_log.reduce((sum, r) => sum + (r.result?.success || 0), 0);
  const totalFail = results_log.reduce((sum, r) => sum + (r.result?.fail || 0), 0);

  const inputClass = 'px-3 py-2 bg-[#141414] border border-[#333] rounded text-white text-sm placeholder-[#555] focus:outline-none focus:border-[#E50914] transition-colors';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-base font-semibold text-white mb-0.5 flex items-center gap-2">
          <Zap size={16} className="text-[#E50914]" /> Bulk Download
        </h2>
        <p className="text-xs text-[#666]">
          Cari dan pilih beberapa judul, lalu download semua subtitle sekaligus. TV series otomatis extract ZIP package.
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

      {/* Search results — multi-select */}
      {results.length > 0 && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-[#2a2a2a] bg-[#141414]">
            <span className="text-xs text-[#808080]">{results.length} hasil · {selectedItems.length} dipilih</span>
            <div className="flex items-center gap-2">
              <button onClick={selectAll} className="text-[10px] text-[#808080] hover:text-white transition-colors">Pilih semua</button>
              {selectedItems.length > 0 && (
                <button onClick={clearSelection} className="text-[10px] text-red-400 hover:text-red-300 transition-colors">Clear</button>
              )}
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {results.map(item => {
              const isSelected = selectedItems.some(i => i.id === item.id && i.type === item.type);
              return (
                <button key={`${item.type}-${item.id}`} onClick={() => toggleSelect(item)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#252525] transition-colors border-b border-[#2a2a2a] last:border-0 ${
                    isSelected ? 'bg-[#E50914]/5 border-l-2 border-l-[#E50914]' : ''
                  }`}>
                  {/* Checkbox */}
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                    isSelected ? 'border-[#E50914] bg-[#E50914]' : 'border-[#444]'
                  }`}>
                    {isSelected && <CheckCircle size={12} className="text-white" />}
                  </div>
                  {/* Poster */}
                  {item.poster_url
                    ? <img src={item.poster_url} alt="" className="w-8 h-12 object-cover rounded shrink-0" />
                    : <div className="w-8 h-12 bg-[#2a2a2a] rounded shrink-0 flex items-center justify-center">{item.type === 'movie' ? <Film size={12} className="text-[#555]" /> : <Tv size={12} className="text-[#555]" />}</div>
                  }
                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-sm font-medium truncate">{item.title}</p>
                    <p className="text-[#808080] text-xs">
                      {item.type === 'movie' ? 'Movie' : 'TV'} {item.year && `· ${item.year}`}
                    </p>
                  </div>
                  {/* Type icon */}
                  <span className="shrink-0">
                    {item.type === 'movie'
                      ? <Film size={14} className="text-blue-400" />
                      : <Tv size={14} className="text-purple-400" />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected items summary + download button */}
      {selectedItems.length > 0 && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white">{selectedItems.length} judul dipilih</span>
              <span className="text-[10px] text-[#666]">
                · {selectedItems.filter(i => i.type === 'movie').length} movie · {selectedItems.filter(i => i.type === 'tv').length} TV
              </span>
            </div>
            <button onClick={clearSelection} className="text-xs text-[#808080] hover:text-red-400 transition-colors flex items-center gap-1">
              <Trash2 size={11} /> Clear
            </button>
          </div>

          {/* Selected items list */}
          <div className="flex flex-wrap gap-1.5">
            {selectedItems.map(item => (
              <div key={`${item.type}-${item.id}`} className="flex items-center gap-1.5 bg-[#222] border border-[#333] rounded-full px-2.5 py-1 text-xs">
                <span className="text-[#808080]">{item.type === 'movie' ? '🎬' : '📺'}</span>
                <span className="text-white font-medium truncate max-w-[180px]">{item.title}</span>
                <button onClick={() => removeSelected(item)} className="text-[#666] hover:text-red-400 ml-0.5">
                  <XCircle size={12} />
                </button>
              </div>
            ))}
          </div>

          {/* Download button */}
          <button onClick={handleBulkDownload} disabled={downloading || langs.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#E50914] text-white text-sm font-semibold rounded-lg hover:bg-[#f6121d] disabled:opacity-40 transition-colors w-full justify-center">
            {downloading ? <Loader size={14} className="animate-spin" /> : <Download size={14} />}
            {downloading
              ? `Mengunduh... ${currentItem ? `(${selectedItems.indexOf(currentItem) + 1}/${selectedItems.length})` : ''}`
              : `Download ${selectedItems.length} judul — ${langs.length} bahasa`}
          </button>

          {/* Current progress */}
          {currentProgress && currentItem && (
            <div className="bg-[#141414] border border-[#2a2a2a] rounded-lg p-3 flex items-center gap-2">
              <Loader size={13} className="animate-spin text-[#E50914]" />
              <span className="text-xs text-[#b3b3b3]">
                <span className="text-white font-medium">{currentItem.title}</span>
                {' '}— {currentProgress.message}
              </span>
            </div>
          )}

          {/* Results log */}
          {results_log.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-green-400 font-medium flex items-center gap-1">
                  <CheckCircle size={14} /> {totalSuccess} berhasil
                </span>
                {totalFail > 0 && (
                  <span className="text-red-400 font-medium flex items-center gap-1">
                    <XCircle size={14} /> {totalFail} gagal
                  </span>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto space-y-1.5">
                {results_log.map((log, i) => (
                  <div key={i} className="rounded-lg border border-[#2a2a2a] overflow-hidden">
                    {/* Item header */}
                    <div className={`flex items-center gap-2 px-3 py-2 text-xs ${
                      log.result?.error
                        ? 'bg-red-400/5 text-red-400'
                        : log.result?.fail > 0
                          ? 'bg-amber-400/5 text-amber-400'
                          : 'bg-green-400/5 text-green-400'
                    }`}>
                      {log.result?.error ? <XCircle size={11} className="shrink-0" /> :
                       log.result?.fail > 0 ? <XCircle size={11} className="shrink-0" /> :
                       <CheckCircle size={11} className="shrink-0" />}
                      <span className="font-medium truncate">{log.item.title}</span>
                      <span className="text-[#666] ml-auto shrink-0">
                        {log.result?.error || `${log.result?.success || 0} ok, ${log.result?.fail || 0} fail`}
                      </span>
                    </div>
                    {/* Failed episodes details */}
                    {log.result?.results && log.result.results.filter(r => !r.success).length > 0 && (
                      <div className="px-3 py-1.5 bg-[#141414] text-[10px] text-red-400/70 space-y-0.5">
                        {log.result.results.filter(r => !r.success).slice(0, 10).map((r, j) => (
                          <div key={j} className="flex items-center gap-2">
                            <span className="text-[#666] w-16 shrink-0">S{String(r.season).padStart(2,'0')}:E{String(r.episode).padStart(2,'0')}</span>
                            <span>{r.message || 'Tidak ditemukan'}</span>
                          </div>
                        ))}
                        {log.result.results.filter(r => !r.success).length > 10 && (
                          <div className="text-[#555]">+{log.result.results.filter(r => !r.success).length - 10} lagi...</div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
