import { useMemo } from 'react';
import { FileText, Film, Tv, Globe } from 'lucide-react';

const LANG_LABELS = {
  id: 'Bahasa Indonesia', en: 'English', es: 'Español', pt: 'Português',
  hi: 'हिन्दी', ja: '日本語', ko: '한국어',
};

export default function StatsCards({ subtitles }) {
  const stats = useMemo(() => {
    const total = subtitles.length;
    const movies = subtitles.filter((s) => s.type === 'movie').length;
    const tv = subtitles.filter((s) => s.type === 'tv').length;
    const langs = {};
    subtitles.forEach((s) => { langs[s.lang] = (langs[s.lang] || 0) + 1; });
    return { total, movies, tv, langs };
  }, [subtitles]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
        <div className="flex items-center gap-2 text-[#E50914] mb-1">
          <FileText size={16} />
          <span className="text-xs font-medium uppercase tracking-wider">Total</span>
        </div>
        <div className="text-2xl font-bold text-white">{stats.total}</div>
      </div>
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
        <div className="flex items-center gap-2 text-blue-400 mb-1">
          <Film size={16} />
          <span className="text-xs font-medium uppercase tracking-wider">Movies</span>
        </div>
        <div className="text-2xl font-bold text-white">{stats.movies}</div>
      </div>
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
        <div className="flex items-center gap-2 text-purple-400 mb-1">
          <Tv size={16} />
          <span className="text-xs font-medium uppercase tracking-wider">TV Shows</span>
        </div>
        <div className="text-2xl font-bold text-white">{stats.tv}</div>
      </div>
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
        <div className="flex items-center gap-2 text-green-400 mb-1">
          <Globe size={16} />
          <span className="text-xs font-medium uppercase tracking-wider">Languages</span>
        </div>
        <div className="text-2xl font-bold text-white">{Object.keys(stats.langs).length}</div>
        <div className="text-[#808080] text-xs mt-0.5">
          {Object.entries(stats.langs)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([lang, count]) => `${(LANG_LABELS[lang] || lang).toUpperCase()} (${count})`)
            .join(', ')}
        </div>
      </div>
    </div>
  );
}
