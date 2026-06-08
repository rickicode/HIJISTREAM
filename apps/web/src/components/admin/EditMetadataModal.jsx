import { useState, useEffect } from 'react';
import { Film, Tv, FileText, XCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import api from '../../utils/api';

const LANG_LABELS = { id: 'Bahasa Indonesia', en: 'English', es: 'Español', pt: 'Português', hi: 'हिन्दी', ja: '日本語', ko: '한국어' };

export default function EditMetadataModal({ entry, open, onClose, onSaved }) {
  const [title, setTitle] = useState('');
  const [imdbId, setImdbId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { if (entry) { setTitle(entry.title || ''); setImdbId(entry.imdbId || ''); setError(''); } }, [entry]);

  const handleSave = async () => {
    if (!entry) return; setSaving(true); setError('');
    try { const updates = {}; if (title !== (entry.title || '')) updates.title = title; if (imdbId !== (entry.imdbId || '')) updates.imdbId = imdbId; if (Object.keys(updates).length === 0) { onClose(); return; } await api.editAdminSubtitle(entry.id, updates); if (onSaved) onSaved(); onClose(); }
    catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  if (!open || !entry) return null;
  const langLabel = LANG_LABELS[entry.lang] || entry.lang?.toUpperCase() || '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a]">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2"><FileText size={18} className="text-[#E50914]" /> Edit Metadata</h2>
          <button onClick={onClose} className="text-[#808080] hover:text-white transition-colors p-1"><XCircle size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="text-xs text-[#808080] bg-[#141414] rounded px-3 py-2">
            {entry.type === 'movie' ? <Film size={12} className="inline mr-1" /> : <Tv size={12} className="inline mr-1" />}
            TMDB #{entry.tmdbId}{entry.season ? ` • S${entry.season}` : ''}{entry.episode ? `:E${entry.episode}` : ''}{langLabel && ` • ${langLabel}`}
          </div>
          <div><label className="block text-sm font-medium text-[#b3b3b3] mb-1.5">Judul</label><input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 bg-[#141414] border border-[#333] rounded text-white text-sm placeholder-[#666] focus:outline-none focus:border-[#E50914]" placeholder="Enter title" /></div>
          <div><label className="block text-sm font-medium text-[#b3b3b3] mb-1.5">IMDB ID</label><input type="text" value={imdbId} onChange={(e) => setImdbId(e.target.value)} className="w-full px-3 py-2 bg-[#141414] border border-[#333] rounded text-white text-sm placeholder-[#666] focus:outline-none focus:border-[#E50914]" placeholder="tt0123456" /></div>
          {error && <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded px-3 py-2"><AlertTriangle size={14} /><span>{error}</span></div>}
        </div>
        <div className="px-6 py-4 border-t border-[#2a2a2a] flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-[#808080] hover:text-white border border-[#333] rounded transition-colors">Batal</button>
          <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-[#E50914] text-white text-sm font-semibold rounded hover:bg-[#f6121d] transition-colors disabled:opacity-50 flex items-center gap-2">{saving ? <><RefreshCw size={14} className="animate-spin" /> Menyimpan...</> : 'Simpan'}</button>
        </div>
      </div>
    </div>
  );
}
