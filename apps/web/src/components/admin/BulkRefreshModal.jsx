import { useState, useMemo } from 'react';
import { RefreshCw, XCircle, AlertTriangle, Check } from 'lucide-react';
import api from '../../utils/api';

export default function BulkRefreshModal({ open, onClose, onDone }) {
  const [results, setResults] = useState([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');

  const handleStart = async () => {
    setRunning(true); setError('');
    try { const data = await api.refreshAllAdminSubtitles(); setResults(data.results || []); if (data.ok > 0 && onDone) onDone(); }
    catch (err) { setError(err.message); }
    finally { setRunning(false); }
  };

  const stats = useMemo(() => ({ total: results.length, ok: results.filter((r) => r.status === 'ok').length, fail: results.filter((r) => r.status === 'fail').length }), [results]);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a]">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2"><RefreshCw size={18} className="text-[#E50914]" /> Refresh All Subtitles</h2>
          <button onClick={onClose} className="text-[#808080] hover:text-white transition-colors p-1"><XCircle size={20} /></button>
        </div>
        <div className="overflow-y-auto p-6 flex-1">
          {results.length === 0 && !running && (
            <div className="text-center py-8">
              <RefreshCw size={32} className="mx-auto mb-3 text-[#808080]" />
              <p className="text-[#b3b3b3] text-sm">Semua subtitle dari OpenSubtitles akan di-download ulang.</p>
              <button onClick={handleStart} className="mt-4 px-5 py-2 bg-[#E50914] text-white text-sm font-semibold rounded hover:bg-[#f6121d] transition-colors">Mulai Refresh Semua</button>
            </div>
          )}
          {running && <div className="flex flex-col items-center py-8"><RefreshCw size={32} className="animate-spin text-[#E50914] mb-3" /><p className="text-[#b3b3b3] text-sm">Sedang me-refresh subtitle...</p></div>}
          {results.length > 0 && (<>
            <div className="flex items-center gap-3 mb-3 text-sm">
              <span className="text-green-400 font-medium">✓ {stats.ok}</span>
              <span className={`${stats.fail > 0 ? 'text-red-400 font-medium' : 'text-[#808080]'}`}>✗ {stats.fail}</span>
              <span className="text-[#808080]">dari {stats.total}</span>
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {results.map((r) => (<div key={r.id} className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm ${r.status === 'ok' ? 'text-green-400 bg-green-400/5' : 'text-red-400 bg-red-400/5'}`}>{r.status === 'ok' ? <Check size={13} /> : <AlertTriangle size={13} />}<span className="flex-1 truncate">{r.title}</span><span className="text-[10px] opacity-60">{r.lang?.toUpperCase()}</span></div>))}
            </div>
          </>)}
          {error && <div className="mt-3 flex items-center gap-2 text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded px-3 py-2"><AlertTriangle size={14} /><span>{error}</span></div>}
        </div>
        <div className="px-6 py-4 border-t border-[#2a2a2a] flex justify-end"><button onClick={onClose} className="px-4 py-2 text-sm text-[#808080] hover:text-white border border-[#333] rounded transition-colors">Tutup</button></div>
      </div>
    </div>
  );
}
