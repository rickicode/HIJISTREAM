import { useState, useCallback, useMemo } from 'react';
import { Film, Tv, Upload, RefreshCw, XCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import api from '../../utils/api';

const LANG_LABELS = {
  id: 'Bahasa Indonesia', en: 'English', es: 'Español', pt: 'Português',
  hi: 'हिन्दी', ja: '日本語', ko: '한국어',
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export default function UploadModal({ open, onClose, onUploaded }) {
  const [type, setType] = useState('movie');
  const [tmdbId, setTmdbId] = useState('');
  const [lang, setLang] = useState('id');
  const [season, setSeason] = useState('');
  const [episode, setEpisode] = useState('');
  const [imdbId, setImdbId] = useState('');
  const [title, setTitle] = useState('');
  const [fileQueue, setFileQueue] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const resetForm = () => { setType('movie'); setTmdbId(''); setLang('id'); setSeason(''); setEpisode(''); setImdbId(''); setTitle(''); setFileQueue([]); setError(''); setDragOver(false); };
  const handleClose = () => { if (uploading) return; resetForm(); onClose(); };

  const addFiles = useCallback((files) => {
    const newItems = []; const errors = [];
    for (const f of files) {
      const ext = f.name.split('.').pop()?.toLowerCase();
      if (ext !== 'srt' && ext !== 'vtt') { errors.push(`"${f.name}": hanya file .srt atau .vtt`); continue; }
      if (f.size > MAX_FILE_SIZE) { errors.push(`"${f.name}": terlalu besar (max 5MB)`); continue; }
      const isDuplicate = fileQueue.some((item) => item.file.name === f.name && item.file.size === f.size);
      if (!isDuplicate) newItems.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, file: f, status: 'pending', error: null, result: null });
    }
    if (newItems.length > 0 || errors.length > 0) setFileQueue((prev) => [...prev, ...newItems]);
    if (errors.length > 0) setError(errors.join('; '));
  }, [fileQueue]);

  const handleFileSelect = (e) => { if (e.target.files?.length > 0) addFiles(Array.from(e.target.files)); e.target.value = ''; };
  const removeFromQueue = (id) => setFileQueue((prev) => prev.filter((item) => item.id !== id));
  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true); };
  const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setDragOver(false); };
  const handleDrop = (e) => { e.preventDefault(); e.stopPropagation(); setDragOver(false); if (e.dataTransfer?.files?.length > 0) addFiles(Array.from(e.dataTransfer.files)); };

  const uploadStats = useMemo(() => {
    const total = fileQueue.length; const done = fileQueue.filter((f) => f.status === 'done').length;
    const failed = fileQueue.filter((f) => f.status === 'error').length; const inProgress = fileQueue.filter((f) => f.status === 'uploading').length;
    return { total, done, failed, inProgress };
  }, [fileQueue]);

  const handleSubmit = async (e) => {
    e.preventDefault(); if (uploading) return; setError('');
    if (!tmdbId.trim()) { setError('TMDB ID wajib diisi'); return; }
    if (fileQueue.length === 0) { setError('Tambahkan minimal 1 file subtitle'); return; }
    setUploading(true); let uploadedCount = 0;
    for (const item of fileQueue) {
      if (item.status === 'done') continue;
      setFileQueue((prev) => prev.map((f) => (f.id === item.id ? { ...f, status: 'uploading', error: null } : f)));
      try {
        const content = await item.file.text();
        const result = await api.uploadAdminSubtitle({ type, tmdbId: tmdbId.trim(), lang, content, imdbId: imdbId.trim() || undefined, title: title.trim() || undefined, season: type === 'tv' && season ? Number(season) : undefined, episode: type === 'tv' && episode ? Number(episode) : undefined });
        setFileQueue((prev) => prev.map((f) => (f.id === item.id ? { ...f, status: 'done', result } : f))); uploadedCount++;
      } catch (err) { setFileQueue((prev) => prev.map((f) => (f.id === item.id ? { ...f, status: 'error', error: err.message } : f))); }
    }
    setUploading(false);
    if (uploadedCount > 0 && onUploaded) onUploaded();
    if (uploadedCount === fileQueue.length) setTimeout(() => handleClose(), 1200);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={handleClose}>
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a]">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2"><Upload size={18} className="text-[#E50914]" /> Upload Subtitles</h2>
          <button onClick={handleClose} disabled={uploading} className="text-[#808080] hover:text-white transition-colors p-1 disabled:opacity-30"><XCircle size={20} /></button>
        </div>
        <div className="overflow-y-auto p-6 space-y-4 flex-1">
          <form id="upload-form" onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-[#b3b3b3] mb-1.5">Tipe</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setType('movie')} className={`flex-1 py-2 rounded text-sm font-medium border transition-colors ${type === 'movie' ? 'bg-[#E50914] border-[#E50914] text-white' : 'bg-[#141414] border-[#333] text-[#808080] hover:text-white'}`}><Film size={14} className="inline mr-1" /> Movie</button>
                <button type="button" onClick={() => setType('tv')} className={`flex-1 py-2 rounded text-sm font-medium border transition-colors ${type === 'tv' ? 'bg-[#E50914] border-[#E50914] text-white' : 'bg-[#141414] border-[#333] text-[#808080] hover:text-white'}`}><Tv size={14} className="inline mr-1" /> TV Show</button>
              </div>
            </div>
            <div className="mb-4"><label className="block text-sm font-medium text-[#b3b3b3] mb-1.5">TMDB ID *</label><input type="text" value={tmdbId} onChange={(e) => setTmdbId(e.target.value)} className="w-full px-3 py-2 bg-[#141414] border border-[#333] rounded text-white text-sm placeholder-[#666] focus:outline-none focus:border-[#E50914]" placeholder="contoh: 550" /></div>
            <div className="mb-4"><label className="block text-sm font-medium text-[#b3b3b3] mb-1.5">Bahasa</label><select value={lang} onChange={(e) => setLang(e.target.value)} className="w-full px-3 py-2 bg-[#141414] border border-[#333] rounded text-white text-sm focus:outline-none focus:border-[#E50914]">{Object.entries(LANG_LABELS).map(([code, name]) => (<option key={code} value={code}>{name}</option>))}</select></div>
            {type === 'tv' && <div className="grid grid-cols-2 gap-3 mb-4"><div><label className="block text-sm font-medium text-[#b3b3b3] mb-1.5">Season</label><input type="number" value={season} onChange={(e) => setSeason(e.target.value)} min="1" className="w-full px-3 py-2 bg-[#141414] border border-[#333] rounded text-white text-sm placeholder-[#666] focus:outline-none focus:border-[#E50914]" placeholder="1" /></div><div><label className="block text-sm font-medium text-[#b3b3b3] mb-1.5">Episode</label><input type="number" value={episode} onChange={(e) => setEpisode(e.target.value)} min="1" className="w-full px-3 py-2 bg-[#141414] border border-[#333] rounded text-white text-sm placeholder-[#666] focus:outline-none focus:border-[#E50914]" placeholder="1" /></div></div>}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div><label className="block text-sm font-medium text-[#b3b3b3] mb-1.5">Judul (opsional)</label><input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 bg-[#141414] border border-[#333] rounded text-white text-sm placeholder-[#666] focus:outline-none focus:border-[#E50914]" placeholder="Movie Title" /></div>
              <div><label className="block text-sm font-medium text-[#b3b3b3] mb-1.5">IMDB ID (opsional)</label><input type="text" value={imdbId} onChange={(e) => setImdbId(e.target.value)} className="w-full px-3 py-2 bg-[#141414] border border-[#333] rounded text-white text-sm placeholder-[#666] focus:outline-none focus:border-[#E50914]" placeholder="tt0123456" /></div>
            </div>
          </form>
          <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onClick={() => document.getElementById('multi-file-input')?.click()} className={`relative flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200 ${dragOver ? 'border-[#E50914] bg-[#E50914]/10 scale-[1.02]' : 'border-[#333] bg-[#141414] hover:border-[#555]'}`}>
            <input id="multi-file-input" type="file" accept=".srt,.vtt" multiple onChange={handleFileSelect} className="hidden" />
            <Upload size={28} className={`mb-2 transition-colors ${dragOver ? 'text-[#E50914]' : 'text-[#808080]'}`} />
            <p className={`text-sm font-medium transition-colors ${dragOver ? 'text-white' : 'text-[#b3b3b3]'}`}>{dragOver ? 'Lepaskan file di sini' : 'Drag & drop file .srt / .vtt'}</p>
            <p className="text-xs text-[#666] mt-1">atau klik untuk pilih file (multiple)</p>
          </div>
          {fileQueue.length > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-[#b3b3b3]">File ({fileQueue.length}){uploadStats.done > 0 && ` — ${uploadStats.done} selesai`}{uploadStats.failed > 0 && `, ${uploadStats.failed} gagal`}</span>
                {!uploading && <button type="button" onClick={() => setFileQueue([])} className="text-xs text-[#808080] hover:text-red-400 transition-colors">Hapus semua</button>}
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {fileQueue.map((item) => { const ext = item.file.name.split('.').pop()?.toLowerCase(); const isSrt = ext === 'srt'; return (
                  <div key={item.id} className={`flex items-center gap-3 px-3 py-2 rounded border transition-colors ${item.status === 'error' ? 'border-red-400/30 bg-red-400/5' : item.status === 'done' ? 'border-green-400/30 bg-green-400/5' : item.status === 'uploading' ? 'border-[#E50914]/30 bg-[#E50914]/5' : 'border-[#2a2a2a] bg-[#141414]'}`}>
                    <div className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold ${isSrt ? 'bg-orange-500/20 text-orange-400' : 'bg-cyan-500/20 text-cyan-400'}`}>{isSrt ? 'SRT' : 'VTT'}</div>
                    <div className="flex-1 min-w-0"><div className="text-sm text-white truncate">{item.file.name}</div><div className="text-xs text-[#808080]">{(item.file.size / 1024).toFixed(1)} KB{item.status === 'error' && item.error && <span className="text-red-400 ml-2">— {item.error}</span>}{item.status === 'done' && <span className="text-green-400 ml-2">✓ Tersimpan</span>}</div></div>
                    <div className="flex items-center gap-1.5">
                      {item.status === 'uploading' && <RefreshCw size={14} className="text-[#E50914] animate-spin" />}
                      {item.status === 'done' && <CheckCircle size={14} className="text-green-400" />}
                      {item.status === 'error' && <AlertTriangle size={14} className="text-red-400" />}
                      {!uploading && item.status !== 'uploading' && <button type="button" onClick={() => removeFromQueue(item.id)} className="p-1 text-[#808080] hover:text-red-400 transition-colors" title="Hapus dari antrian"><XCircle size={14} /></button>}
                    </div>
                  </div>
                ); })}
              </div>
            </div>
          )}
          {error && <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded px-3 py-2"><AlertTriangle size={14} /><span>{error}</span></div>}
        </div>
        <div className="px-6 py-4 border-t border-[#2a2a2a] flex items-center justify-between">
          <span className="text-xs text-[#666]">{fileQueue.length === 0 ? 'Tambahkan file untuk mulai upload' : `${uploadStats.done}/${uploadStats.total} selesai`}</span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={handleClose} disabled={uploading} className="px-4 py-2 text-sm text-[#808080] hover:text-white border border-[#333] rounded transition-colors disabled:opacity-30">Batal</button>
            <button type="submit" form="upload-form" disabled={uploading || fileQueue.length === 0} className="px-5 py-2 bg-[#E50914] text-white text-sm font-semibold rounded hover:bg-[#f6121d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
              {uploading ? <><RefreshCw size={14} className="animate-spin" /> Upload {uploadStats.inProgress > 0 ? `(${uploadStats.done + uploadStats.inProgress}/${uploadStats.total})` : '...'}</> : <><Upload size={14} /> Upload {fileQueue.length > 0 ? `(${fileQueue.length})` : ''}</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
