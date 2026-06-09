import { useState, useRef, useEffect } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';

const LANG_FLAGS = {
  id: '🇮🇩', en: '🇺🇸', es: '🇪🇸', pt: '🇧🇷', hi: '🇮🇳', ja: '🇯🇵', ko: '🇰🇷',
};

const LANG_SHORT = {
  id: 'ID', en: 'EN', es: 'ES', pt: 'PT', hi: 'HI', ja: 'JA', ko: 'KO',
};

const LANG_FULL = {
  id: 'Indonesian', en: 'English', es: 'Español', pt: 'Português', hi: 'हिन्दी', ja: '日本語', ko: '한국어',
};

/**
 * SubtitlePicker — horizontal chip selector for subtitle languages.
 * Shows available languages as tappable pills with flag + short label.
 */
export default function SubtitlePicker({ subtitles, selected, onSelect, disabled }) {
  const [expanded, setExpanded] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!expanded) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setExpanded(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [expanded]);

  if (!subtitles || subtitles.length === 0) return null;

  const selectedLang = selected?.lang;
  const visibleCount = expanded ? subtitles.length : Math.min(subtitles.length, 5);
  const hiddenCount = subtitles.length - visibleCount;

  return (
    <div className="inline-flex items-center gap-1.5 flex-wrap" ref={ref}>
      {/* None option */}
      <button
        onClick={() => { if (!disabled) { onSelect(null); setExpanded(false); } }}
        disabled={disabled}
        className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-full border transition-all duration-150 shrink-0 ${
          disabled
            ? 'border-[#333] text-[#555] cursor-not-allowed'
            : !selectedLang
              ? 'border-[#E50914] bg-[#E50914]/15 text-[#E50914] shadow-[0_0_8px_rgba(229,9,20,0.15)]'
              : 'border-[#2a2a2a] text-[#808080] hover:border-[#555] hover:text-white'
        }`}
      >
        <span className="text-[10px]">✕</span>
        <span>Off</span>
      </button>

      {/* Language chips */}
      {subtitles.slice(0, visibleCount).map((sub) => {
        const isSelected = sub.lang === selectedLang;
        const flag = LANG_FLAGS[sub.lang] || '🌐';
        const short = LANG_SHORT[sub.lang] || sub.lang.toUpperCase();

        return (
          <button
            key={sub.lang}
            onClick={() => { if (!disabled) { onSelect(sub); setExpanded(false); } }}
            disabled={disabled}
            className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-full border transition-all duration-150 shrink-0 ${
              disabled
                ? 'border-[#333] text-[#555] cursor-not-allowed'
                : isSelected
                  ? 'border-[#E50914] bg-[#E50914]/15 text-white shadow-[0_0_8px_rgba(229,9,20,0.15)]'
                  : 'border-[#2a2a2a] text-[#b3b3b3] hover:border-[#555] hover:text-white'
            }`}
            title={LANG_FULL[sub.lang] || sub.lang}
          >
            <span className="text-xs">{flag}</span>
            <span>{short}</span>
            {isSelected && <Check size={10} className="text-[#E50914]" />}
            {sub.cached && <span className="w-1 h-1 rounded-full bg-green-400 ml-0.5" title="Cached" />}
          </button>
        );
      })}

      {/* Show more button */}
      {!expanded && hiddenCount > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="inline-flex items-center gap-0.5 px-2 py-1 text-[10px] text-[#666] hover:text-white rounded-full border border-[#2a2a2a] hover:border-[#555] transition-colors shrink-0"
        >
          +{hiddenCount}
          <ChevronDown size={10} />
        </button>
      )}
    </div>
  );
}
