/**
 * Shared constants for subtitle system — single source of truth.
 * Import from here in all components to stay consistent.
 */

// ─── Language Maps ────────────────────────────────────────────────────────────

export const LANG_FLAGS = {
  id: '🇮🇩', en: '🇺🇸', es: '🇪🇸', pt: '🇧🇷', hi: '🇮🇳',
  ja: '🇯🇵', ko: '🇰🇷', th: '🇹🇭', vi: '🇻🇳', tl: '🇵🇭',
  fr: '🇫🇷', de: '🇩🇪', it: '🇮🇹', ru: '🇷🇺', ar: '🇸🇦',
  tr: '🇹🇷', pl: '🇵🇱', nl: '🇳🇱', sv: '🇸🇪', da: '🇩🇰',
  fi: '🇫🇮', no: '🇳🇴', cs: '🇨🇿', sk: '🇸🇰', hu: '🇭🇺',
  ro: '🇷🇴', bg: '🇧🇬', hr: '🇭🇷', sr: '🇷🇸', sl: '🇸🇮',
  uk: '🇺🇦', el: '🇬🇷', he: '🇮🇱', ms: '🇲🇾', bn: '🇧🇩',
  ta: '🇮🇳', te: '🇮🇳', mr: '🇮🇳', gu: '🇮🇳', kn: '🇮🇳',
  ml: '🇮🇳', pa: '🇮🇳', ur: '🇵🇰', fa: '🇮🇷', sw: '🇰🇪',
  'zh-CN': '🇨🇳', 'zh-TW': '🇹🇼', 'pt-BR': '🇧🇷', 'es-MX': '🇲🇽',
};

export const LANG_LABELS = {
  id: 'Indonesian', en: 'English', es: 'Spanish', pt: 'Portuguese',
  hi: 'Hindi', ja: 'Japanese', ko: 'Korean', th: 'Thai', vi: 'Vietnamese',
  tl: 'Filipino', fr: 'French', de: 'German', it: 'Italian', ru: 'Russian',
  ar: 'Arabic', tr: 'Turkish', pl: 'Polish', nl: 'Dutch', sv: 'Swedish',
  da: 'Danish', fi: 'Finnish', no: 'Norwegian', cs: 'Czech', sk: 'Slovak',
  hu: 'Hungarian', ro: 'Romanian', bg: 'Bulgarian', hr: 'Croatian',
  sr: 'Serbian', sl: 'Slovenian', uk: 'Ukrainian', el: 'Greek', he: 'Hebrew',
  ms: 'Malay', bn: 'Bengali', ta: 'Tamil', te: 'Telugu', mr: 'Marathi',
  gu: 'Gujarati', kn: 'Kannada', ml: 'Malayalam', pa: 'Punjabi', ur: 'Urdu',
  fa: 'Persian', sw: 'Swahili', 'zh-CN': 'Chinese (Simplified)', 'zh-TW': 'Chinese (Traditional)',
  'pt-BR': 'Brazilian Portuguese', 'es-MX': 'Mexican Spanish',
};

export const LANG_SHORT = {
  id: 'ID', en: 'EN', es: 'ES', pt: 'PT', hi: 'HI', ja: 'JA', ko: 'KO',
  th: 'TH', vi: 'VI', fr: 'FR', de: 'DE', it: 'IT', ru: 'RU',
};

// ─── Provider Info ────────────────────────────────────────────────────────────

export const PROVIDER_INFO = {
  opensubtitles_com: {
    name: 'OpenSubtitles.com',
    shortName: 'OS.com',
    description: 'REST API v1 — API Key + Username + Password',
    icon: '🎬',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/10',
    borderColor: 'border-yellow-400/20',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'Dari opensubtitles.com/consumers' },
      { key: 'username', label: 'Username', type: 'text', placeholder: 'Username' },
      { key: 'password', label: 'Password', type: 'password', placeholder: 'Password' },
    ],
  },
  opensubtitles_org: {
    name: 'OpenSubtitles.org',
    shortName: 'OS.org',
    description: 'XML-RPC Legacy — Username + Password',
    icon: '📺',
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10',
    borderColor: 'border-blue-400/20',
    fields: [
      { key: 'username', label: 'Username', type: 'text', placeholder: 'Username opensubtitles.org' },
      { key: 'password', label: 'Password', type: 'password', placeholder: 'Password' },
    ],
  },
  subdl: {
    name: 'Subdl',
    shortName: 'Subdl',
    description: 'REST API — API Key only',
    icon: '📦',
    color: 'text-purple-400',
    bgColor: 'bg-purple-400/10',
    borderColor: 'border-purple-400/20',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'Dari subdl.com/api' },
    ],
  },
  podnapisi: {
    name: 'Podnapisi',
    shortName: 'Podnapisi',
    description: 'Free — No authentication required',
    icon: '🆓',
    color: 'text-green-400',
    bgColor: 'bg-green-400/10',
    borderColor: 'border-green-400/20',
    fields: [],
  },
};

export const PROVIDER_LABELS = {
  opensubtitles_com: 'OS.com',
  opensubtitles_org: 'OS.org',
  subdl: 'Subdl',
  podnapisi: 'Podnapisi',
};

export const PROVIDER_COLORS = {
  opensubtitles_com: 'text-yellow-400 bg-yellow-400/10',
  opensubtitles_org: 'text-blue-400 bg-blue-400/10',
  subdl: 'text-purple-400 bg-purple-400/10',
  podnapisi: 'text-green-400 bg-green-400/10',
};

// ─── Helper Functions ─────────────────────────────────────────────────────────

export function getLangFlag(lang) {
  return LANG_FLAGS[lang] || '🌐';
}

export function getLangLabel(lang) {
  return LANG_LABELS[lang] || lang?.toUpperCase() || '—';
}

export function getLangShort(lang) {
  return LANG_SHORT[lang] || lang?.toUpperCase()?.slice(0, 2) || '—';
}

export function getProviderLabel(provider) {
  return PROVIDER_LABELS[provider] || provider || 'Unknown';
}

export function getProviderColor(provider) {
  return PROVIDER_COLORS[provider] || 'text-gray-400 bg-gray-400/10';
}
