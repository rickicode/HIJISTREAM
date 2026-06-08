import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart as RePie, Pie, Cell, CartesianGrid,
} from 'recharts';
import { BarChart3, TrendingUp, Layers, Globe, Download } from 'lucide-react';
import { LANG_LABELS, CustomTooltip } from './shared';

const CHART_COLORS = {
  primary: '#E50914', blue: '#3b82f6', purple: '#a855f7', green: '#22c55e',
  orange: '#f97316', cyan: '#06b6d4', pink: '#ec4899', yellow: '#eab308', gray: '#6b7280',
};

const LANG_COLORS = {
  id: '#22c55e', en: '#3b82f6', es: '#f97316', pt: '#06b6d4',
  hi: '#f97316', ja: '#ec4899', ko: '#a855f7',
};

export default function ChartsSection({ subtitles }) {
  const dailyData = useMemo(() => {
    const today = new Date();
    const map = new Map();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      map.set(d.toISOString().slice(0, 10), { date: d.toISOString().slice(0, 10), count: 0 });
    }
    subtitles.forEach((s) => {
      if (!s.downloadedAt) return;
      const key = s.downloadedAt.slice(0, 10);
      if (map.has(key)) map.get(key).count++;
    });
    return Array.from(map.values());
  }, [subtitles]);

  const langData = useMemo(() => {
    const map = new Map();
    subtitles.forEach((s) => {
      const label = LANG_LABELS[s.lang] || s.lang || 'unknown';
      map.set(label, (map.get(label) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [subtitles]);

  const typeData = useMemo(() => {
    const movies = subtitles.filter((s) => s.type === 'movie').length;
    const tv = subtitles.filter((s) => s.type === 'tv').length;
    return [{ name: 'Movies', value: movies, color: CHART_COLORS.blue }, { name: 'TV Shows', value: tv, color: CHART_COLORS.purple }].filter((d) => d.value > 0);
  }, [subtitles]);

  const sourceData = useMemo(() => {
    const manual = subtitles.filter((s) => s.source === 'manual').length;
    const opensubtitles = subtitles.filter((s) => !s.source || s.source === 'opensubtitles').length;
    return [{ name: 'OpenSubtitles', value: opensubtitles, color: CHART_COLORS.orange }, { name: 'Manual Upload', value: manual, color: CHART_COLORS.cyan }].filter((d) => d.value > 0);
  }, [subtitles]);

  const peakDay = useMemo(() => { let max = { count: 0, date: '' }; dailyData.forEach((d) => { if (d.count > max.count) max = d; }); return max; }, [dailyData]);
  const weeklyAvg = useMemo(() => { const total = dailyData.reduce((s, d) => s + d.count, 0); return (total / dailyData.length).toFixed(1); }, [dailyData]);

  if (subtitles.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 size={16} className="text-[#E50914]" />
        <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Statistics & Analytics</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Daily Downloads */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={14} className="text-[#E50914]" />
              <span className="text-sm font-medium text-white">Daily Downloads</span>
            </div>
            <span className="text-xs text-[#808080]">Avg <span className="text-white font-medium">{weeklyAvg}</span>/day</span>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData} barCategoryGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis dataKey="date" tick={{ fill: '#808080', fontSize: 10 }} tickFormatter={(v) => v.slice(5)} axisLine={{ stroke: '#2a2a2a' }} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: '#808080', fontSize: 10 }} axisLine={false} tickLine={false} width={24} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Downloads" radius={[3, 3, 0, 0]}>
                  {dailyData.map((entry, i) => (<Cell key={i} fill={entry.count > 0 ? CHART_COLORS.primary : '#2a2a2a'} fillOpacity={entry.count > 0 ? 0.85 : 0.4} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {peakDay.count > 0 && (
            <div className="mt-2 text-[#666] text-xs">Peak: <span className="text-white">{peakDay.count}</span> on {new Date(peakDay.date + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })}</div>
          )}
        </div>

        {/* Top Languages */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Globe size={14} className="text-green-400" />
            <span className="text-sm font-medium text-white">Top Languages</span>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={langData} layout="vertical" barCategoryGap={6}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#808080', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#b3b3b3', fontSize: 11 }} axisLine={false} tickLine={false} width={100} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Subtitles" radius={[0, 3, 3, 0]}>
                  {langData.map((entry, i) => { const code = Object.entries(LANG_LABELS).find(([, v]) => v === entry.name)?.[0]; return (<Cell key={i} fill={LANG_COLORS[code] || CHART_COLORS.gray} fillOpacity={0.8} />); })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Type Distribution */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Layers size={14} className="text-blue-400" />
            <span className="text-sm font-medium text-white">Content Type</span>
          </div>
          <div className="flex items-center gap-6 h-40">
            <div className="w-32 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <RePie><Pie data={typeData} cx="50%" cy="50%" innerRadius={30} outerRadius={56} paddingAngle={4} dataKey="value">
                  {typeData.map((entry, i) => (<Cell key={i} fill={entry.color} stroke="transparent" />))}
                </Pie><Tooltip content={<CustomTooltip />} /></RePie>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-2.5">
              {typeData.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-[#b3b3b3]">{item.name}</span>
                  <span className="text-sm text-white font-medium ml-auto">{item.value} ({((item.value / subtitles.length) * 100).toFixed(0)}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Source Distribution */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Download size={14} className="text-cyan-400" />
            <span className="text-sm font-medium text-white">Download Source</span>
          </div>
          <div className="flex items-center gap-6 h-40">
            <div className="w-32 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <RePie><Pie data={sourceData} cx="50%" cy="50%" innerRadius={30} outerRadius={56} paddingAngle={4} dataKey="value">
                  {sourceData.map((entry, i) => (<Cell key={i} fill={entry.color} stroke="transparent" />))}
                </Pie><Tooltip content={<CustomTooltip />} /></RePie>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-2.5">
              {sourceData.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-[#b3b3b3]">{item.name}</span>
                  <span className="text-sm text-white font-medium ml-auto">{item.value} ({((item.value / subtitles.length) * 100).toFixed(0)}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
