/**
 * Admin — Dashboard for managing subtitles.
 *
 * All child components are extracted to apps/web/src/components/admin/.
 * This file only contains the AdminDashboard (state, data loading, layout)
 * and the Admin wrapper (auth gate).
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../utils/api';
import {
  Search, RefreshCw, LogOut, AlertTriangle, HardDrive,
  Filter, ChevronDown, FileText, Plus, BarChart3, Settings, Download,
  ChevronLeft, ChevronRight, Wand2,
} from 'lucide-react';

// Extracted components
import LoginScreen from '../components/admin/LoginScreen';
import ConfirmDialog from '../components/admin/ConfirmDialog';
import SubtitleRow from '../components/admin/SubtitleRow';
import UploadModal from '../components/admin/UploadModal';
import StatsCards from '../components/admin/StatsCards';
import ChartsSection from '../components/admin/ChartsSection';
import BulkRefreshModal from '../components/admin/BulkRefreshModal';
import EditMetadataModal from '../components/admin/EditMetadataModal';
import MonitoringSection from '../components/admin/MonitoringSection';
import SettingsTab from '../components/admin/SettingsTab';
import DownloadTab from '../components/admin/DownloadTab';
import BulkDownloadPanel from '../components/admin/BulkDownloadPanel';
import { LANG_LABELS } from '../components/admin/shared';

// ============================================================
// Admin Dashboard
// ============================================================

function AdminDashboard({ onLogout }) {
  const [subtitles, setSubtitles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterLang, setFilterLang] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showBulkRefresh, setShowBulkRefresh] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [view, setView] = useState('subtitles'); // 'subtitles' | 'monitoring' | 'settings' | 'download' | 'bulk'
  const [monitoringData, setMonitoringData] = useState(null);
  const [monitoringLoading, setMonitoringLoading] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState(null);
  const [page, setPage] = useState(1);
  const perPage = 25;

  // Confirm dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({
    title: '',
    message: '',
    onConfirm: null,
  });

  const loadMonitoring = useCallback(async () => {
    setMonitoringLoading(true);
    try {
      const data = await api.getAdminMonitoring();
      setMonitoringData(data);
    } catch (err) {
      console.error('Failed to load monitoring data:', err);
    } finally {
      setMonitoringLoading(false);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getAdminSubtitles();
      setSubtitles(data.subtitles || []);
      setPage(1);
    } catch (err) {
      if (err.message === 'Unauthorized') {
        api.clearAdminAuth();
        onLogout();
        return;
      }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [onLogout]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDelete = useCallback((id) => {
    setSubtitles((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const osCount = useMemo(
    () => subtitles.filter((s) => s.source === 'opensubtitles' || !s.source).length,
    [subtitles],
  );

  const availableLangs = useMemo(() => {
    const set = new Set(subtitles.map((s) => s.lang).filter(Boolean));
    return [...set];
  }, [subtitles]);

  const filtered = useMemo(() => {
    let items = [...subtitles];

    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (s) =>
          (s.title && s.title.toLowerCase().includes(q)) ||
          String(s.tmdbId).includes(q) ||
          (s.imdbId && s.imdbId.toLowerCase().includes(q)),
      );
    }

    if (filterType !== 'all') items = items.filter((s) => s.type === filterType);
    if (filterLang !== 'all') items = items.filter((s) => s.lang === filterLang);

    items.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.downloadedAt || 0).getTime() - new Date(a.downloadedAt || 0).getTime();
        case 'oldest':
          return new Date(a.downloadedAt || 0).getTime() - new Date(b.downloadedAt || 0).getTime();
        case 'title':
          return (a.title || '').localeCompare(b.title || '');
        case 'type':
          return (a.type || '').localeCompare(b.type || '');
        default:
          return 0;
      }
    });

    return items;
  }, [subtitles, search, filterType, filterLang, sortBy]);

  // Confirm delete handler — called by SubtitleRow
  const handleBackfill = useCallback(async () => {
    setBackfilling(true);
    setBackfillResult(null);
    try {
      const result = await api.backfillTitles();
      setBackfillResult(result);
      if (result.updated > 0) loadData();
    } catch (err) {
      setBackfillResult({ error: err.message });
    } finally {
      setBackfilling(false);
    }
  }, [loadData]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = useMemo(() => {
    const start = (page - 1) * perPage;
    return filtered.slice(start, start + perPage);
  }, [filtered, page, perPage]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [search, filterType, filterLang, sortBy]);

  const handleConfirmDelete = useCallback((entry, callback) => {
    setConfirmConfig({
      title: 'Hapus Subtitle',
      message: `Hapus subtitle ${entry.title || `TMDB #${entry.tmdbId}`} (${LANG_LABELS[entry.lang] || entry.lang})?`,
      onConfirm: () => {
        setConfirmOpen(false);
        callback();
      },
    });
    setConfirmOpen(true);
  }, []);

  return (
    <div className="min-h-screen bg-[#141414] text-white">
      {/* Header */}
      <header className="border-b border-[#2a2a2a] bg-[#141414]/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-black tracking-tight">
                <span className="text-[#E50914]">HIJI</span>
                <span className="text-white">STREAM</span>
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[#E50914]/10 text-[#E50914] text-xs font-semibold rounded-full border border-[#E50914]/20">
                Admin
              </span>
            </div>
            <div className="flex items-center gap-2">
              {view === 'subtitles' && (
                <button
                  onClick={handleBackfill}
                  disabled={backfilling}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-cyan-400 border border-cyan-400/30 font-semibold rounded hover:bg-cyan-400/10 transition-colors disabled:opacity-50"
                  title="Fetch judul dari TMDB untuk entry yang kosong"
                >
                  <Wand2 size={14} className={backfilling ? 'animate-spin' : ''} />
                  <span className="hidden sm:inline">{backfilling ? 'Backfilling...' : 'Backfill Titles'}</span>
                </button>
              )}
              {view === 'subtitles' && osCount > 0 && (
                <button
                  onClick={() => setShowBulkRefresh(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-amber-400 border border-amber-400/30 font-semibold rounded hover:bg-amber-400/10 transition-colors"
                  title={`Refresh semua ${osCount} subtitle dari OpenSubtitles`}
                >
                  <RefreshCw size={14} />
                  <span className="hidden sm:inline">Refresh All ({osCount})</span>
                </button>
              )}
              {view === 'subtitles' && (
                <button
                  onClick={() => setShowUpload(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-[#E50914] text-white font-semibold rounded hover:bg-[#f6121d] transition-colors"
                >
                  <Plus size={15} />
                  <span className="hidden sm:inline">Upload</span>
                </button>
              )}
              {view === 'subtitles' && (
                <button
                  onClick={loadData}
                  disabled={loading}
                  className="p-2 text-[#808080] hover:text-white hover:bg-[#2a2a2a] rounded-lg transition-colors disabled:opacity-50"
                  title="Refresh"
                >
                  <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                </button>
              )}
              <button
                onClick={onLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#808080] hover:text-white hover:bg-[#2a2a2a] rounded-lg transition-colors"
              >
                <LogOut size={15} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* View tabs */}
        <div className="flex items-center gap-1 mb-6 border-b border-[#2a2a2a]">
          <button
            onClick={() => setView('subtitles')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              view === 'subtitles'
                ? 'border-[#E50914] text-white'
                : 'border-transparent text-[#808080] hover:text-white hover:border-[#555]'
            }`}
          >
            <FileText size={14} /> Subtitles
          </button>
          <button
            onClick={() => { setView('monitoring'); loadMonitoring(); }}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              view === 'monitoring'
                ? 'border-[#E50914] text-white'
                : 'border-transparent text-[#808080] hover:text-white hover:border-[#555]'
            }`}
          >
            <BarChart3 size={14} /> Monitoring
          </button>
          <button
            onClick={() => setView('settings')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              view === 'settings'
                ? 'border-[#E50914] text-white'
                : 'border-transparent text-[#808080] hover:text-white hover:border-[#555]'
            }`}
          >
            <Settings size={14} /> Settings
          </button>
          <button
            onClick={() => setView('download')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              view === 'download'
                ? 'border-[#E50914] text-white'
                : 'border-transparent text-[#808080] hover:text-white hover:border-[#555]'
            }`}
          >
            <Download size={14} /> Search
          </button>
          <button
            onClick={() => setView('bulk')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              view === 'bulk'
                ? 'border-[#E50914] text-white'
                : 'border-transparent text-[#808080] hover:text-white hover:border-[#555]'
            }`}
          >
            <Download size={14} /> Bulk
          </button>
        </div>

        {view === 'bulk' ? (
          <BulkDownloadPanel />
        ) : view === 'download' ? (
          <DownloadTab />
        ) : view === 'settings' ? (
          <SettingsTab />
        ) : view === 'monitoring' ? (
          /* ── Monitoring View ── */
          monitoringLoading && !monitoringData ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw size={24} className="animate-spin text-[#E50914]" />
            </div>
          ) : monitoringData ? (
            <MonitoringSection data={monitoringData} onRefresh={loadMonitoring} />
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-[#808080]">
              <BarChart3 size={48} className="mb-4 opacity-30" />
              <p className="text-lg font-medium text-white mb-1">Monitoring</p>
              <p className="text-sm">Gagal memuat data monitoring.</p>
            </div>
          )
        ) : (
          /* ── Subtitles View ── */
          <>
            <StatsCards subtitles={subtitles} />
            <ChartsSection subtitles={subtitles} />

            {error && (
              <div className="mb-4 flex items-center gap-2 text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
                <AlertTriangle size={16} />
                <span>{error}</span>
                <button onClick={loadData} className="ml-auto underline hover:no-underline">Retry</button>
              </div>
            )}

            {backfillResult && !backfilling && (
              <div className={`mb-4 flex items-center gap-2 text-sm rounded-lg px-4 py-3 ${
                backfillResult.error
                  ? 'text-red-400 bg-red-400/10 border border-red-400/20'
                  : 'text-green-400 bg-green-400/10 border border-green-400/20'
              }`}>
                {backfillResult.error ? <AlertTriangle size={16} /> : <Wand2 size={16} />}
                <span>
                  {backfillResult.error
                    ? backfillResult.error
                    : `Backfill selesai: ${backfillResult.updated} title diupdate, ${backfillResult.skipped} sudah ada, ${backfillResult.errors} error`}
                </span>
                <button onClick={() => setBackfillResult(null)} className="ml-auto text-[#808080] hover:text-white">✕</button>
              </div>
            )}

            {/* Search & Filters */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg mb-4">
              <div className="flex items-center gap-3 p-3">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#808080]" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari subtitle (judul, TMDB ID, IMDB ID)..."
                    className="w-full pl-9 pr-4 py-2 bg-[#141414] border border-[#333] rounded text-white text-sm placeholder-[#666] focus:outline-none focus:border-[#E50914] transition-colors"
                  />
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded border transition-colors ${
                    showFilters ? 'border-[#E50914] text-[#E50914] bg-[#E50914]/10' : 'border-[#333] text-[#808080] hover:text-white hover:border-[#555]'
                  }`}
                >
                  <Filter size={15} />
                  <span className="hidden sm:inline">Filters</span>
                  <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {showFilters && (
                <div className="flex flex-wrap items-center gap-3 px-3 pb-3 border-t border-[#2a2a2a] pt-3">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-[#808080] font-medium">Type:</label>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="px-2.5 py-1.5 bg-[#141414] border border-[#333] rounded text-white text-sm focus:outline-none focus:border-[#E50914]"
                    >
                      <option value="all">All</option>
                      <option value="movie">Movies</option>
                      <option value="tv">TV Shows</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-[#808080] font-medium">Language:</label>
                    <select
                      value={filterLang}
                      onChange={(e) => setFilterLang(e.target.value)}
                      className="px-2.5 py-1.5 bg-[#141414] border border-[#333] rounded text-white text-sm focus:outline-none focus:border-[#E50914]"
                    >
                      <option value="all">All</option>
                      {availableLangs.map((l) => (
                        <option key={l} value={l}>{LANG_LABELS[l] || l}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-[#808080] font-medium">Sort:</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="px-2.5 py-1.5 bg-[#141414] border border-[#333] rounded text-white text-sm focus:outline-none focus:border-[#E50914]"
                    >
                      <option value="newest">Newest</option>
                      <option value="oldest">Oldest</option>
                      <option value="title">Title</option>
                      <option value="type">Type</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Loading */}
            {loading && subtitles.length === 0 && (
              <div className="flex items-center justify-center py-20">
                <RefreshCw size={24} className="animate-spin text-[#E50914]" />
              </div>
            )}

            {/* Empty state */}
            {!loading && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-[#808080]">
                <HardDrive size={48} className="mb-4 opacity-30" />
                <p className="text-lg font-medium text-white mb-1">
                  {subtitles.length === 0 ? 'Belum ada subtitle' : 'Tidak ada hasil'}
                </p>
                <p className="text-sm">
                  {subtitles.length === 0
                    ? 'Subtitle akan otomatis terunduh saat pengguna memutar film atau acara TV.'
                    : 'Coba ubah kata kunci atau filter pencarian.'}
                </p>
              </div>
            )}

            {/* Table */}
            {filtered.length > 0 && (
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#2a2a2a] text-xs font-medium text-[#808080] uppercase tracking-wider">
                        <th className="text-left py-3 px-4">Content</th>
                        <th className="text-left py-3 px-4">Language</th>
                        <th className="text-left py-3 px-4">Downloaded</th>
                        <th className="text-left py-3 px-4">Refreshed</th>
                        <th className="text-left py-3 px-4">Size</th>
                        <th className="text-right py-3 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map((entry) => (
                        <SubtitleRow
                          key={entry.id}
                          entry={entry}
                          onDelete={handleDelete}
                          onRefresh={loadData}
                          onEdit={setEditTarget}
                          onConfirmDelete={handleConfirmDelete}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-[#2a2a2a] text-sm text-[#808080]">
                  <span>Menampilkan {((page - 1) * perPage) + 1}–{Math.min(page * perPage, filtered.length)} dari {filtered.length} subtitle</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="p-1.5 rounded hover:bg-[#333] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 7) {
                        pageNum = i + 1;
                      } else if (page <= 4) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - 3) {
                        pageNum = totalPages - 6 + i;
                      } else {
                        pageNum = page - 3 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`w-8 h-8 rounded text-xs font-medium transition-colors ${
                            page === pageNum
                              ? 'bg-[#E50914] text-white'
                              : 'text-[#808080] hover:bg-[#333] hover:text-white'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      className="p-1.5 rounded hover:bg-[#333] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Modals */}
      <UploadModal
        open={showUpload}
        onClose={() => setShowUpload(false)}
        onUploaded={() => { loadData(); setShowUpload(false); }}
      />
      <BulkRefreshModal
        open={showBulkRefresh}
        onClose={() => setShowBulkRefresh(false)}
        onDone={loadData}
      />
      <EditMetadataModal
        entry={editTarget}
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={loadData}
      />
      <ConfirmDialog
        open={confirmOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmLabel="Hapus"
        danger
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

// ============================================================
// Admin App (auth gate)
// ============================================================

export default function Admin() {
  const [authenticated, setAuthenticated] = useState(api.isAdminAuthenticated());

  const handleLogin = useCallback(() => setAuthenticated(true), []);
  const handleLogout = useCallback(() => {
    api.clearAdminAuth();
    setAuthenticated(false);
  }, []);

  if (!authenticated) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return <AdminDashboard onLogout={handleLogout} />;
}
