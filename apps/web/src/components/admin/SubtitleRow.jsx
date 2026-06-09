import { useState, useEffect, useRef } from 'react';
import { Film, Tv, Globe, Download, FileText, RefreshCw, Trash2, Check, AlertTriangle } from 'lucide-react';
import api from '../../utils/api';
import { LANG_LABELS, formatDate, formatBytes } from './shared';

const TYPE_LABELS = { movie: 'Movie', tv: 'TV Show' };

export default function SubtitleRow({ entry, onDelete, onRefresh, onEdit, onConfirmDelete }) {
  const [deleting, setDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshStatus, setRefreshStatus] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const refreshTimerRef = useRef(null);
  const deleteTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    };
  }, []);

  const handleDelete = () => {
    onConfirmDelete(entry, async () => {
      setDeleting(true);
      setDeleteError(null);
      try {
        await api.deleteAdminSubtitle(entry.id);
        onDelete(entry.id);
      } catch (err) {
        setDeleteError(err.message);
        if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
        deleteTimerRef.current = setTimeout(() => setDeleteError(null), 5000);
      } finally {
        setDeleting(false);
      }
    });
  };

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    setRefreshStatus(null);
    try {
      await api.refreshAdminSubtitle(entry.id);
      setRefreshStatus('ok');
      if (onRefresh) onRefresh(entry.id);
    } catch { setRefreshStatus('fail'); }
    finally {
      setRefreshing(false);
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = setTimeout(() => setRefreshStatus(null), 3000);
    }
  };

  return (
    <tr className="border-b border-[#2a2a2a] hover:bg-[#1f1f1f] transition-colors group">
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold ${entry.type === 'movie' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
            {entry.type === 'movie' ? <Film size={14} /> : <Tv size={14} />}
          </div>
          <div className="min-w-0">
            <div className="text-white text-sm font-medium truncate max-w-[250px]">{entry.title || `TMDB #${entry.tmdbId}`}</div>
            <div className="text-[#808080] text-xs">
              {TYPE_LABELS[entry.type] || entry.type}
              {entry.season && ` • S${entry.season}`}{entry.episode && `:E${entry.episode}`}{entry.imdbId && ` • ${entry.imdbId}`}
            </div>
            {deleteError && <div className="text-red-400 text-[10px] mt-0.5">{deleteError}</div>}
          </div>
        </div>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${entry.lang === 'id' ? 'bg-green-500/20 text-green-400' : entry.lang === 'en' ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'}`}>
            <Globe size={10} /> {(LANG_LABELS[entry.lang] || entry.lang || '').toUpperCase()}
          </span>
          <span className={`text-[10px] px-1 py-0.5 rounded font-medium ${
            entry.source === 'manual' ? 'text-cyan-400 bg-cyan-400/10'
            : entry.source === 'subdl' ? 'text-purple-400 bg-purple-400/10'
            : entry.source === 'opensubtitles_com' ? 'text-yellow-400 bg-yellow-400/10'
            : entry.source === 'opensubtitles_org' ? 'text-blue-400 bg-blue-400/10'
            : 'text-orange-400 bg-orange-400/10'
          }`}>
            {entry.source === 'manual' ? 'MANUAL'
            : entry.source === 'subdl' ? 'SubDL'
            : entry.source === 'opensubtitles_com' ? 'OS.com'
            : entry.source === 'opensubtitles_org' ? 'OS.org'
            : entry.source?.replace('opensubtitles_', 'OS.').toUpperCase() || 'Unknown'}
          </span>
        </div>
      </td>
      <td className="py-3 px-4 text-[#b3b3b3] text-sm">{formatDate(entry.downloadedAt)}</td>
      <td className="py-3 px-4 text-[#b3b3b3] text-sm">{formatDate(entry.refreshedAt)}</td>
      <td className="py-3 px-4 text-[#808080] text-sm">{formatBytes(entry.fileSize)}</td>
      <td className="py-3 px-4 text-right">
        <div className="flex items-center justify-end gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <a href={entry.url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-[#808080] hover:text-white hover:bg-[#333] rounded transition-colors" title="Download file"><Download size={15} /></a>
          <button onClick={() => onEdit(entry)} className="p-1.5 text-[#808080] hover:text-blue-400 hover:bg-blue-400/10 rounded transition-colors" title="Edit metadata"><FileText size={15} /></button>
          <button onClick={handleRefresh} disabled={refreshing} className={`p-1.5 rounded transition-colors disabled:opacity-50 ${refreshStatus === 'ok' ? 'text-green-400 bg-green-400/10' : refreshStatus === 'fail' ? 'text-red-400 bg-red-400/10' : 'text-[#808080] hover:text-amber-400 hover:bg-amber-400/10'}`} title="Download ulang dari OpenSubtitles">
            {refreshing ? <RefreshCw size={15} className="animate-spin text-amber-400" /> : refreshStatus === 'ok' ? <Check size={15} /> : refreshStatus === 'fail' ? <AlertTriangle size={15} /> : <RefreshCw size={15} />}
          </button>
          <button onClick={handleDelete} disabled={deleting} className="p-1.5 text-[#808080] hover:text-red-400 hover:bg-red-400/10 rounded transition-colors disabled:opacity-50" title="Hapus subtitle">
            {deleting ? <RefreshCw size={15} className="animate-spin" /> : <Trash2 size={15} />}
          </button>
        </div>
      </td>
    </tr>
  );
}
