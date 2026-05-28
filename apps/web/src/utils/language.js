const STORAGE_KEY = 'hijistream_locale';
const SUPPORTED_LANGS = ['id', 'en', 'es', 'pt', 'hi', 'ja', 'ko'];

export function getCurrentLanguage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return SUPPORTED_LANGS.includes(stored) ? stored : 'id';
  } catch {
    return 'id';
  }
}

export function setLanguage(lang) {
  if (SUPPORTED_LANGS.includes(lang)) {
    localStorage.setItem(STORAGE_KEY, lang);
    window.dispatchEvent(new Event('language-change'));
  }
}

export function getApiLanguageParam(langCode) {
  const localeMap = { id: 'id-ID', en: 'en-US', es: 'es-ES', pt: 'pt-BR', hi: 'hi-IN', ja: 'ja-JP', ko: 'ko-KR' };
  return localeMap[langCode || getCurrentLanguage()] || 'id-ID';
}

export function getDsLang() {
  const lang = getCurrentLanguage();
  return lang === 'en' ? null : lang;
}
