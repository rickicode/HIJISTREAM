import { useState } from 'react';
import { Clock, AlertTriangle, Globe, RefreshCw, CheckCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { formatDate, LANG_LABELS, CustomTooltip } from './shared';

const MONITORING_TABS = [
  { id: 'history', label: 'Refresh History', icon: Clock },
  { id: 'errors', label: 'Error Log', icon: AlertTriangle },
  { id: 'langs', label: 'Language Stats', icon: Globe },
];

export default function MonitoringSection({ data, onRefresh }) {
  const [activeTab, setActiveTab] = useState('history');
  const { summary, langStats, refreshActivity, recentErrors } = data;
  if (!data) return null;

  const summaryCards = [
    { label: 'Total Subtitles', value: summary.totalSubtitles, color: 'text-white' },
    { label: 'OpenSubtitles', value: summary.totalOS, color: 'text-orange-400' },
    { label: 'Manual Upload', value: summary.totalManual, color: 'text-cyan-400' },
    { label: 'Refreshed', value: summary.totalRefreshed, color: 'text-green-400' },
    { label: 'Errors', value: summary.totalErrors, color: 'text-red-400' },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        {summaryCards.map((card) => (<div key={card.label} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4"><div className="text-xs font-medium text-[#808080] uppercase tracking-wider mb-1">{card.label}</div><div className={`text-2xl font-bold ${card.color}`}>{card.value}</div></div>))}
      </div>
      <div className="flex items-center gap-1 mb-4 border-b border-[#2a2a2a]">
        {MONITORING_TABS.map((tab) => { const Icon = tab.icon; return (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-[#E50914] text-white' : 'border-transparent text-[#808080] hover:text-white hover:border-[#555]'}`}><Icon size={14} /> {tab.label}</button>
        ); })}
        <button onClick={onRefresh} className="ml-auto p-1.5 text-[#808080] hover:text-white hover:bg-[#2a2a2a] rounded transition-colors" title="Refresh monitoring data"><RefreshCw size={15} /></button>
      </div>

      {activeTab === 'history' && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
          <div className="flex items-center justify-between mb-3"><h4 className="text-sm font-semibold text-white">Activity — Last 14 Days</h4><span className="text-xs text-[#808080]">Total: <span className="text-white font-medium">{refreshActivity.reduce((s, d) => s + d.count, 0)}</span> actions</span></div>
          <div className="h-48"><ResponsiveContainer width="100%" height="100%"><BarChart data={refreshActivity} barCategoryGap={4}><CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" /><XAxis dataKey="date" tick={{ fill: '#808080', fontSize: 10 }} tickFormatter={(v) => { const d = new Date(v + 'T00:00:00'); return d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' }); }} axisLine={{ stroke: '#2a2a2a' }} tickLine={false} /><YAxis allowDecimals={false} tick={{ fill: '#808080', fontSize: 10 }} axisLine={false} tickLine={false} width={24} /><Tooltip content={<CustomTooltip />} /><Bar dataKey="count" name="Activity" radius={[3, 3, 0, 0]}>{refreshActivity.map((entry, i) => (<Cell key={i} fill={entry.count > 0 ? '#E50914' : '#2a2a2a'} fillOpacity={entry.count > 0 ? 0.85 : 0.4} />))}</Bar></BarChart></ResponsiveContainer></div>
        </div>
      )}

      {activeTab === 'errors' && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg overflow-hidden">
          {recentErrors.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-[#808080]"><CheckCircle size={48} className="mb-4 text-green-400 opacity-30" /><p className="text-white font-medium mb-1">No Errors</p><p className="text-sm">Semua subtitle berjalan lancar.</p></div>
          ) : (<>
            <div className="overflow-x-auto max-h-96 overflow-y-auto"><table className="w-full"><thead><tr className="border-b border-[#2a2a2a] text-xs font-medium text-[#808080] uppercase tracking-wider"><th className="text-left py-3 px-4">Time</th><th className="text-left py-3 px-4">Type</th><th className="text-left py-3 px-4">Language</th><th className="text-left py-3 px-4">Message</th></tr></thead>
            <tbody>{recentErrors.map((err, i) => (<tr key={err.id || i} className="border-b border-[#2a2a2a] hover:bg-[#1f1f1f] transition-colors"><td className="py-2.5 px-4 text-[#b3b3b3] text-xs whitespace-nowrap">{formatDate(err.timestamp)}</td><td className="py-2.5 px-4"><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${err.type === 'login_failed' ? 'bg-red-500/20 text-red-400' : err.type === 'download_failed' ? 'bg-orange-500/20 text-orange-400' : err.type === 'not_found' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-500/20 text-gray-400'}`}>{err.type === 'login_failed' ? 'Login' : err.type === 'download_failed' ? 'Download' : err.type === 'not_found' ? 'Not Found' : err.type || 'Unknown'}</span></td><td className="py-2.5 px-4">{err.lang ? <span className="text-sm text-[#b3b3b3]">{LANG_LABELS[err.lang] || err.lang?.toUpperCase()}</span> : <span className="text-sm text-[#666]">—</span>}</td><td className="py-2.5 px-4 text-sm text-[#b3b3b3] max-w-xs truncate">{err.message || err.error || '-'}</td></tr>))}</tbody></table></div>
            <div className="px-4 py-2.5 border-t border-[#2a2a2a] text-xs text-[#808080]">Menampilkan {recentErrors.length} error terbaru</div>
          </>)}
        </div>
      )}

      {activeTab === 'langs' && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg overflow-hidden">
          {langStats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-[#808080]"><Globe size={48} className="mb-4 opacity-30" /><p className="text-white font-medium mb-1">No Language Data</p><p className="text-sm">Belum ada subtitle.</p></div>
          ) : (<>
            <div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-[#2a2a2a] text-xs font-medium text-[#808080] uppercase tracking-wider"><th className="text-left py-3 px-4">Language</th><th className="text-center py-3 px-4">Total</th><th className="text-center py-3 px-4">OpenSubtitles</th><th className="text-center py-3 px-4">Manual</th><th className="text-center py-3 px-4">Refreshed</th><th className="text-center py-3 px-4">Errors</th></tr></thead>
            <tbody>{langStats.map((stat) => { const maxVal = Math.max(stat.total, 1); return (
              <tr key={stat.lang} className="border-b border-[#2a2a2a] hover:bg-[#1f1f1f] transition-colors">
                <td className="py-3 px-4"><span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium ${stat.lang === 'id' ? 'bg-green-500/20 text-green-400' : stat.lang === 'en' ? 'bg-blue-500/20 text-blue-400' : stat.lang === 'ja' ? 'bg-pink-500/20 text-pink-400' : stat.lang === 'ko' ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-500/20 text-gray-400'}`}>{LANG_LABELS[stat.lang] || stat.lang?.toUpperCase()}</span></td>
                <td className="py-3 px-4 text-center text-white font-semibold text-sm">{stat.total}</td>
                <td className="py-3 px-4 text-center"><div className="flex items-center justify-center gap-2"><div className="w-20 h-2 bg-[#2a2a2a] rounded-full overflow-hidden"><div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${(stat.opensubtitles / maxVal) * 100}%` }} /></div><span className="text-xs text-[#808080] w-5 text-right">{stat.opensubtitles}</span></div></td>
                <td className="py-3 px-4 text-center"><div className="flex items-center justify-center gap-2"><div className="w-20 h-2 bg-[#2a2a2a] rounded-full overflow-hidden"><div className="h-full bg-cyan-500 rounded-full transition-all" style={{ width: `${(stat.manual / maxVal) * 100}%` }} /></div><span className="text-xs text-[#808080] w-5 text-right">{stat.manual}</span></div></td>
                <td className="py-3 px-4 text-center"><div className="flex items-center justify-center gap-2"><div className="w-20 h-2 bg-[#2a2a2a] rounded-full overflow-hidden"><div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${(stat.refreshed / maxVal) * 100}%` }} /></div><span className="text-xs text-[#808080] w-5 text-right">{stat.refreshed}</span></div></td>
                <td className="py-3 px-4 text-center"><span className={`text-sm font-medium ${stat.errors > 0 ? 'text-red-400' : 'text-[#666]'}`}>{stat.errors || '0'}</span></td>
              </tr>
            ); })}</tbody></table></div>
            <div className="px-4 py-2.5 border-t border-[#2a2a2a] text-xs text-[#808080]">{summary.totalLanguages} languages · {summary.totalSubtitles} total subtitles</div>
          </>)}
        </div>
      )}
    </div>
  );
}
