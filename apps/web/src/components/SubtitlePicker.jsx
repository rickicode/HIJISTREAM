import { useState, useRef, useEffect } from 'react';
import { Globe, Check, ChevronDown, Download } from 'lucide-react';

const LANG_FLAGS = {
  id: '🇮🇩',
  en: '🇺🇸',
  es: '🇪🇸',
  pt: '🇧🇷',
  hi: '🇮🇳',
  ja: '🇯🇵',
  ko: '🇰🇷',
};

const LANG_LABELS = {
  id: 'Bahasa Indonesia',
  en: 'English',
  es: 'Español',
  pt: 'Português',
  hi: 'हिन्दी',
  ja: '日本語',
  ko: '한국어',
};

/**
 * SubtitlePicker — dropdown untuk memilih subtitle dari daftar bahasa yang tersedia.
 *
 * @param {object} props
 * @param {Array<{url:string, lang:string, format:string, cached:boolean}>} props.subtitles - Daftar subtitle yang tersedia
 * @param {{url:string, lang:string}|null} props.selected - Subtitle yang sedang dipilih
 * @param {(sub: {url:string, lang:string}|null) => void} props.onSelect - Callback saat subtitle dipilih
 * @param {boolean} [props.disabled] - Disable picker saat player aktif
 */
export default function SubtitlePicker({ subtitles, selected, onSelect, disabled }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  if (!subtitles || subtitles.length === 0) return null;

  const selectedLang = selected?.lang;
  const selectedLabel = LANG_LABELS[selectedLang] || selectedLang?.toUpperCase() || '—';
  const selectedFlag = LANG_FLAGS[selectedLang] || '🌐';
  const hasSubtitles = subtitles.length > 0;

  return (
    <div className="relative inline-flex" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-all duration-150 ${
          disabled
            ? 'border-[#333] text-[#666] cursor-not-allowed'
            : open
              ? 'border-[#E50914] bg-[#E50914]/10 text-white'
              : 'border-[#2a2a2a] bg-[#1a1a1a] text-[#b3b3b3] hover:border-[#555] hover:text-white'
        }`}
        aria-label="Pilih subtitle"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Globe size={13} className={open ? 'text-[#E50914]' : 'text-[#808080]'} />
        <span>{selectedFlag}</span>
        <span className="font-medium">{selectedLabel}</span>
        {hasSubtitles && (
          <span className="text-[#666] text-[10px] ml-0.5">({subtitles.length})</span>
        )}
        <ChevronDown
          size={12}
          className={`transition-transform duration-200 ${open ? 'rotate-180' : ''} ${
            selectedLang ? 'text-[#808080]' : 'text-[#E50914]'
          }`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-56 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg shadow-2xl overflow-hidden z-50">
          {/* Header */}
          <div className="px-3 py-2 border-b border-[#2a2a2a]">
            <p className="text-xs font-medium text-[#808080] uppercase tracking-wider">Available Subtitles</p>
          </div>

          {/* List */}
          <div className="py-1 max-h-56 overflow-y-auto">
            {/* "No subtitle" option */}
            <button
              type="button"
              onClick={() => { onSelect(null); setOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-[#2a2a2a] ${
                !selectedLang ? 'text-white bg-[#E50914]/10' : 'text-[#808080]'
              }`}
            >
              <div className={`w-5 h-5 rounded flex items-center justify-center text-xs ${
                !selectedLang ? 'bg-[#E50914] text-white' : 'bg-[#2a2a2a] text-[#666]'
              }`}>
                <span>✕</span>
              </div>
              <span className="flex-1 text-left">No Subtitles</span>
              {!selectedLang && <Check size={14} className="text-[#E50914]" />}
            </button>

            {/* Divider */}
            <div className="mx-3 my-1 border-t border-[#2a2a2a]" />

            {/* Subtitle options */}
            {subtitles.map((sub) => {
              const isSelected = sub.lang === selectedLang;
              const flag = LANG_FLAGS[sub.lang] || '🌐';
              const label = LANG_LABELS[sub.lang] || sub.lang.toUpperCase();

              return (
                <button
                  key={sub.lang}
                  type="button"
                  onClick={() => { onSelect(sub); setOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-[#2a2a2a] ${
                    isSelected ? 'text-white bg-[#E50914]/10' : 'text-[#b3b3b3]'
                  }`}
                >
                  {/* Flag + name */}
                  <span className="text-base w-5 text-center flex-shrink-0">{flag}</span>
                  <span className="flex-1 text-left">{label}</span>

                  {/* Status badge */}
                  {sub.cached && (
                    <span className="text-[10px] text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded font-medium">
                      Cached
                    </span>
                  )}

                  {/* Selected check */}
                  {isSelected && (
                    <Check size={14} className="text-[#E50914] flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
