const STORAGE_KEY = 'hijistream_lang';
const SUPPORTED_LANGS = ['en', 'id'];

export function getCurrentLanguage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return SUPPORTED_LANGS.includes(stored) ? stored : 'en';
  } catch {
    return 'en';
  }
}

export function setLanguage(lang) {
  if (SUPPORTED_LANGS.includes(lang)) {
    localStorage.setItem(STORAGE_KEY, lang);
    window.dispatchEvent(new Event('language-change'));
  }
}

export function getDsLang() {
  const lang = getCurrentLanguage();
  return lang === 'en' ? null : lang;
}
